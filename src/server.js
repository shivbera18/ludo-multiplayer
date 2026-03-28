import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { RoomStore } from './rooms/roomStore.js';
import { EventLogStore } from './events/eventLogStore.js';
import { TurnTimerManager, TurnTimerConstants } from './realtime/turnTimerManager.js';
import { createMessagingBus } from './realtime/messagingBus.js';
import { extractBearerToken, signAuthToken, verifyAuthToken } from './auth/authTokens.js';

function normalizeCredentials({ username, displayName, password }) {
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const normalizedDisplayName = typeof displayName === 'string' ? displayName.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!normalizedUsername || normalizedUsername.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  if (!normalizedDisplayName || normalizedDisplayName.length < 2) {
    throw new Error('Display name must be at least 2 characters');
  }
  if (!normalizedPassword || normalizedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  return {
    username: normalizedUsername,
    displayName: normalizedDisplayName,
    password: normalizedPassword
  };
}

function tryDecodeSocketToken(socket) {
  const token = socket.handshake.auth?.token;
  if (!token || typeof token !== 'string') return null;

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

function resolveActor(socket, payload = {}) {
  const authUser = socket.data?.authUser;
  if (authUser?.username) {
    return {
      playerId: authUser.username,
      name: authUser.displayName ?? authUser.username
    };
  }

  const playerId = payload.playerId;
  if (!playerId) {
    throw new Error('Authentication required or playerId must be provided');
  }

  return {
    playerId,
    name: payload.name ?? playerId
  };
}

export function createApp({ roomStore = new RoomStore(), eventLogStore = new EventLogStore(), dbStore = null } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/register', async (req, res) => {
    if (!dbStore) {
      return res.status(503).json({ error: 'Database is not configured' });
    }

    try {
      const credentials = normalizeCredentials(req.body ?? {});
      const user = await dbStore.registerUser(credentials);
      const token = signAuthToken(user);
      return res.status(201).json({ token, user });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already exists' });
      }
      return res.status(400).json({ error: error.message ?? 'Unable to register account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    if (!dbStore) {
      return res.status(503).json({ error: 'Database is not configured' });
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    try {
      const user = await dbStore.verifyUser({ username, password });
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      const token = signAuthToken(user);
      return res.json({ token, user });
    } catch (error) {
      return res.status(500).json({ error: error.message ?? 'Unable to login' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!dbStore) {
      return res.status(503).json({ error: 'Database is not configured' });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    try {
      const payload = verifyAuthToken(token);
      const user = await dbStore.getUserById(payload.id);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token user' });
      }
      return res.json({ user });
    } catch (error) {
      return res.status(401).json({ error: error.message ?? 'Invalid token' });
    }
  });

  app.get('/api/replay/:roomId', async (req, res) => {
    const roomId = req.params.roomId;

    if (dbStore) {
      try {
        const events = await dbStore.getReplayEvents(roomId);
        if (events.length > 0) {
          return res.json({ roomId, status: 'finished', events });
        }
      } catch (error) {
        return res.status(500).json({ error: error.message ?? 'Failed to load replay' });
      }
    }

    const room = roomStore.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json({
      roomId,
      status: room.status,
      events: eventLogStore.getByRoom(roomId)
    });
  });

  return { app, roomStore, eventLogStore };
}

export function createRealtimeServer(options = {}) {
  const { app, roomStore, eventLogStore } = createApp(options);
  const dbStore = options.dbStore ?? null;
  const turnDurationMs = options.turnDurationMs ?? TurnTimerConstants.DEFAULT_TURN_MS;
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const realtimeEmitter = {
    to(roomId) {
      return {
        emit(eventName, payload) {
          emitRoomEvent(roomId, eventName, payload);
        }
      };
    }
  };
  const messagingBus = createMessagingBus({
    onBroadcast: ({ roomId, eventName, payload }) => {
      io.to(roomId).emit(eventName, payload);
    }
  });
  const turnTimerManager = new TurnTimerManager({ roomStore, eventLogStore, io: realtimeEmitter, turnDurationMs });
  const sessionBySocketId = new Map();
  const socketIdByRoomPlayer = new Map();

  function makeSessionKey(roomId, playerId) {
    return `${roomId}::${playerId}`;
  }

  function registerSession(socket, roomId, playerId) {
    const key = makeSessionKey(roomId, playerId);
    const previousSocketId = socketIdByRoomPlayer.get(key);

    socket.join(roomId);
    sessionBySocketId.set(socket.id, { roomId, playerId });
    socketIdByRoomPlayer.set(key, socket.id);

    if (previousSocketId && previousSocketId !== socket.id) {
      const previousSocket = io.sockets.sockets.get(previousSocketId);
      if (previousSocket) {
        previousSocket.leave(roomId);
      }
      sessionBySocketId.delete(previousSocketId);
    }
  }

  function clearSession(socketId) {
    const session = sessionBySocketId.get(socketId);
    if (!session) return;
    const key = makeSessionKey(session.roomId, session.playerId);
    if (socketIdByRoomPlayer.get(key) === socketId) {
      socketIdByRoomPlayer.delete(key);
    }
    sessionBySocketId.delete(socketId);
  }

  async function appendEvent(roomId, eventPayload, eventType = eventPayload.type) {
    const event = eventLogStore.append(roomId, eventPayload);
    if (dbStore) {
      await dbStore.appendRoomEvent(roomId, event);
    }
    messagingBus.publishDomainEvent(eventType, {
      roomId,
      event
    });
    return event;
  }

  function emitRoomEvent(roomId, eventName, payload) {
    io.to(roomId).emit(eventName, payload);
    messagingBus.publishBroadcast(roomId, eventName, payload);
  }

  async function emitTurnChanged(roomId, reason, actorPlayerId) {
    const room = roomStore.getRoom(roomId);
    if (!room?.engine) return;
    const state = room.engine.getState();
    const currentPlayerId = state.playerOrder[state.currentTurn];

    const event = await appendEvent(
      roomId,
      {
      type: 'turnChanged',
      payload: {
        currentPlayerId,
        reason,
        actorPlayerId
      }
      },
      'game.turnChanged'
    );

    emitRoomEvent(roomId, 'game:turnChanged', {
      roomId,
      currentPlayerId,
      reason,
      actorPlayerId
    });

    emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine.getState() });
  }

  async function emitWinnerAndFinish(roomId, winnerPlayerId) {
    const room = roomStore.finishGame(roomId);
    turnTimerManager.clearTimer(roomId);
    const event = await appendEvent(
      roomId,
      {
      type: 'gameFinished',
      playerId: winnerPlayerId,
      payload: {
        winnerPlayerId
      }
      },
      'game.finished'
    );

    emitRoomEvent(roomId, 'game:winner', {
      roomId,
      winnerPlayerId,
      gameState: room.engine?.getState() ?? null
    });
    emitRoomEvent(roomId, 'game:finished', {
      roomId,
      winnerPlayerId,
      room: roomStore.serialize(room)
    });
    emitRoomEvent(roomId, 'room:update', roomStore.serialize(room));
    emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine?.getState() ?? null });
  }

  io.on('connection', (socket) => {
    socket.data.authUser = tryDecodeSocketToken(socket);

    socket.on('disconnect', () => {
      clearSession(socket.id);
    });

    socket.on('room:create', async (payload = {}, ack = () => {}) => {
      try {
        const actor = resolveActor(socket, payload);
        const room = roomStore.createRoom({ playerId: actor.playerId, name: actor.name });
        const playerId = actor.playerId;
        registerSession(socket, room.roomId, playerId);

        const event = await appendEvent(
          room.roomId,
          {
          type: 'roomCreated',
          playerId
          },
          'room.created'
        );

        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('room:join', async (payload = {}, ack = () => {}) => {
      try {
        const roomId = payload.roomId;
        const actor = resolveActor(socket, payload);
        const playerId = actor.playerId;
        if (!playerId || !roomId) throw new Error('roomId and playerId required');
        const room = roomStore.joinRoom(roomId, { playerId, name: actor.name });
        registerSession(socket, roomId, playerId);
        const event = await appendEvent(
          roomId,
          {
          type: 'roomJoined',
          playerId
          },
          'room.joined'
        );
        const remainingTurnMs = turnTimerManager.getRemainingMs(roomId);
        const currentState = room.engine?.getState() ?? null;
        emitRoomEvent(roomId, 'room:update', roomStore.serialize(room));
        if (currentState) {
          socket.emit('game:state', roomStore.serialize(room));
          socket.emit('game:timerUpdate', {
            roomId,
            currentPlayerId: currentState.playerOrder[currentState.currentTurn],
            turnDurationMs,
            turnEndsAt: remainingTurnMs !== null ? Date.now() + remainingTurnMs : null,
            remainingMs: remainingTurnMs
          });
        }
        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:start', async (payload = {}, ack = () => {}) => {
      try {
        const roomId = payload.roomId;
        const playerId = resolveActor(socket, payload).playerId;
        const room = roomStore.startGame(roomId, playerId);
        const event = await appendEvent(
          roomId,
          {
          type: 'gameStarted',
          playerId
          },
          'game.started'
        );
        emitRoomEvent(roomId, 'game:state', roomStore.serialize(room));
        await emitTurnChanged(roomId, 'gameStart', playerId);
        turnTimerManager.scheduleForRoom(roomId, { reason: 'gameStart', actorPlayerId: playerId });
        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:roll', async (payload = {}, ack = () => {}) => {
      try {
        const roomId = payload.roomId;
        const actionId = payload.actionId;
        const playerId = resolveActor(socket, payload).playerId;
        const room = roomStore.getRoom(roomId);
        if (!room?.engine) {
          throw new Error('Game not active');
        }

        if (roomStore.checkAndRecordAction(roomId, actionId)) {
          return ack({ ok: true, duplicate: true });
        }

        const beforeTurn = room.engine.getState().currentTurn;
        const rollResult = room.engine.rollDice(playerId);
        const event = await appendEvent(
          roomId,
          {
          type: 'diceRolled',
          playerId,
          actionId,
          payload: rollResult
          },
          'game.diceRolled'
        );

        const afterState = room.engine.getState();
        const afterTurn = afterState.currentTurn;
        const turnChanged = beforeTurn !== afterTurn;
        if (turnChanged) {
          await emitTurnChanged(roomId, 'rollAutoSkip', playerId);
        }
        turnTimerManager.scheduleForRoom(roomId, { reason: 'rollProcessed', actorPlayerId: playerId });
        emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine.getState() });
        return ack({ ok: true, event, gameState: room.engine.getState() });
      } catch (error) {
        return ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:move', async (payload = {}, ack = () => {}) => {
      try {
        const roomId = payload.roomId;
        const tokenIndex = payload.tokenIndex;
        const actionId = payload.actionId;
        const playerId = resolveActor(socket, payload).playerId;
        const room = roomStore.getRoom(roomId);
        if (!room?.engine) {
          throw new Error('Game not active');
        }

        if (roomStore.checkAndRecordAction(roomId, actionId)) {
          return ack({ ok: true, duplicate: true });
        }

        const beforeTurn = room.engine.getState().currentTurn;
        const moveResult = room.engine.moveToken(playerId, tokenIndex);
        const event = await appendEvent(
          roomId,
          {
          type: 'tokenMoved',
          playerId,
          actionId,
          payload: moveResult
          },
          'game.tokenMoved'
        );

        const state = room.engine.getState();
        if (state.status === 'finished' && state.winner) {
          await emitWinnerAndFinish(roomId, state.winner);
        } else {
          const turnChanged = beforeTurn !== state.currentTurn;
          if (turnChanged) {
            await emitTurnChanged(roomId, 'moveCompleted', playerId);
          }
          turnTimerManager.scheduleForRoom(roomId, { reason: 'moveCompleted', actorPlayerId: playerId });
        }

        emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine.getState() });
        return ack({ ok: true, event, gameState: room.engine.getState() });
      } catch (error) {
        return ack({ ok: false, error: error.message });
      }
    });

    socket.on('chat:send', async (payload = {}, ack = () => {}) => {
      try {
        const roomId = payload.roomId;
        const actor = resolveActor(socket, payload);
        const message = typeof payload.message === 'string' ? payload.message.trim() : '';

        if (!roomId) {
          throw new Error('roomId required');
        }
        if (!message) {
          throw new Error('message required');
        }
        if (message.length > 320) {
          throw new Error('message too long');
        }

        const room = roomStore.getRoom(roomId);
        if (!room) {
          throw new Error('Room not found');
        }

        const event = await appendEvent(
          roomId,
          {
            type: 'chatMessage',
            playerId: actor.playerId,
            payload: {
              roomId,
              message,
              playerName: actor.name
            }
          },
          'chat.message'
        );

        emitRoomEvent(roomId, 'chat:message', {
          roomId,
          playerId: actor.playerId,
          playerName: actor.name,
          message,
          timestamp: event.timestamp,
          sequence: event.sequence
        });

        ack({ ok: true, event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });
  });

  server.on('close', () => {
    void messagingBus.close();
  });

  return {
    app,
    server,
    io,
    roomStore,
    eventLogStore,
    turnTimerManager,
    messagingBus
  };
}
