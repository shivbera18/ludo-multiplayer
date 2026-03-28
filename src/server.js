import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { RoomStore } from './rooms/roomStore.js';
import { EventLogStore } from './events/eventLogStore.js';
import { TurnTimerManager, TurnTimerConstants } from './realtime/turnTimerManager.js';
import { createMessagingBus } from './realtime/messagingBus.js';

export function createApp({ roomStore = new RoomStore(), eventLogStore = new EventLogStore() } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/replay/:roomId', (req, res) => {
    const roomId = req.params.roomId;
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
  const turnDurationMs = options.turnDurationMs ?? TurnTimerConstants.DEFAULT_TURN_MS;
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const messagingBus = createMessagingBus({
    onBroadcast: ({ roomId, eventName, payload }) => {
      io.to(roomId).emit(eventName, payload);
    }
  });
  const turnTimerManager = new TurnTimerManager({ roomStore, eventLogStore, io, turnDurationMs });
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

  function appendEvent(roomId, eventPayload, eventType = eventPayload.type) {
    const event = eventLogStore.append(roomId, eventPayload);
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

  function emitTurnChanged(roomId, reason, actorPlayerId) {
    const room = roomStore.getRoom(roomId);
    if (!room?.engine) return;
    const state = room.engine.getState();
    const currentPlayerId = state.playerOrder[state.currentTurn];

    const event = appendEvent(
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

  function emitWinnerAndFinish(roomId, winnerPlayerId) {
    const room = roomStore.finishGame(roomId);
    turnTimerManager.clearTimer(roomId);
    const event = appendEvent(
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
    socket.on('disconnect', () => {
      clearSession(socket.id);
    });

    socket.on('room:create', ({ playerId, name }, ack = () => {}) => {
      try {
        if (!playerId) throw new Error('playerId required');
        const room = roomStore.createRoom({ playerId, name: name ?? playerId });
        registerSession(socket, room.roomId, playerId);

        const event = appendEvent(
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

    socket.on('room:join', ({ roomId, playerId, name }, ack = () => {}) => {
      try {
        if (!playerId || !roomId) throw new Error('roomId and playerId required');
        const room = roomStore.joinRoom(roomId, { playerId, name: name ?? playerId });
        registerSession(socket, roomId, playerId);
        const event = appendEvent(
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

    socket.on('game:start', ({ roomId, playerId }, ack = () => {}) => {
      try {
        const room = roomStore.startGame(roomId, playerId);
        const event = appendEvent(
          roomId,
          {
          type: 'gameStarted',
          playerId
          },
          'game.started'
        );
        emitRoomEvent(roomId, 'game:state', roomStore.serialize(room));
        emitTurnChanged(roomId, 'gameStart', playerId);
        turnTimerManager.scheduleForRoom(roomId, { reason: 'gameStart', actorPlayerId: playerId });
        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:roll', ({ roomId, playerId, actionId }, ack = () => {}) => {
      try {
        const room = roomStore.getRoom(roomId);
        if (!room?.engine) {
          throw new Error('Game not active');
        }

        if (roomStore.checkAndRecordAction(roomId, actionId)) {
          return ack({ ok: true, duplicate: true });
        }

        const beforeTurn = room.engine.getState().currentTurn;
        const rollResult = room.engine.rollDice(playerId);
        const event = appendEvent(
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
          emitTurnChanged(roomId, 'rollAutoSkip', playerId);
        }
        turnTimerManager.scheduleForRoom(roomId, { reason: 'rollProcessed', actorPlayerId: playerId });
        emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine.getState() });
        return ack({ ok: true, event, gameState: room.engine.getState() });
      } catch (error) {
        return ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:move', ({ roomId, playerId, tokenIndex, actionId }, ack = () => {}) => {
      try {
        const room = roomStore.getRoom(roomId);
        if (!room?.engine) {
          throw new Error('Game not active');
        }

        if (roomStore.checkAndRecordAction(roomId, actionId)) {
          return ack({ ok: true, duplicate: true });
        }

        const beforeTurn = room.engine.getState().currentTurn;
        const moveResult = room.engine.moveToken(playerId, tokenIndex);
        const event = appendEvent(
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
          emitWinnerAndFinish(roomId, state.winner);
        } else {
          const turnChanged = beforeTurn !== state.currentTurn;
          if (turnChanged) {
            emitTurnChanged(roomId, 'moveCompleted', playerId);
          }
          turnTimerManager.scheduleForRoom(roomId, { reason: 'moveCompleted', actorPlayerId: playerId });
        }

        emitRoomEvent(roomId, 'game:event', { event, gameState: room.engine.getState() });
        return ack({ ok: true, event, gameState: room.engine.getState() });
      } catch (error) {
        return ack({ ok: false, error: error.message });
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
