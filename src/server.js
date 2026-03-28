import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { RoomStore } from './rooms/roomStore.js';
import { EventLogStore } from './events/eventLogStore.js';

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
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    socket.on('room:create', ({ playerId, name }, ack = () => {}) => {
      try {
        if (!playerId) throw new Error('playerId required');
        const room = roomStore.createRoom({ playerId, name: name ?? playerId });
        socket.join(room.roomId);

        const event = eventLogStore.append(room.roomId, {
          type: 'roomCreated',
          playerId
        });

        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('room:join', ({ roomId, playerId, name }, ack = () => {}) => {
      try {
        if (!playerId || !roomId) throw new Error('roomId and playerId required');
        const room = roomStore.joinRoom(roomId, { playerId, name: name ?? playerId });
        socket.join(roomId);
        const event = eventLogStore.append(roomId, {
          type: 'roomJoined',
          playerId
        });
        io.to(roomId).emit('room:update', roomStore.serialize(room));
        ack({ ok: true, room: roomStore.serialize(room), event });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('game:start', ({ roomId, playerId }, ack = () => {}) => {
      try {
        const room = roomStore.startGame(roomId, playerId);
        const event = eventLogStore.append(roomId, {
          type: 'gameStarted',
          playerId
        });
        io.to(roomId).emit('game:state', roomStore.serialize(room));
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

        const rollResult = room.engine.rollDice(playerId);
        const event = eventLogStore.append(roomId, {
          type: 'diceRolled',
          playerId,
          actionId,
          payload: rollResult
        });

        io.to(roomId).emit('game:event', { event, gameState: room.engine.getState() });
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

        const moveResult = room.engine.moveToken(playerId, tokenIndex);
        const event = eventLogStore.append(roomId, {
          type: 'tokenMoved',
          playerId,
          actionId,
          payload: moveResult
        });

        io.to(roomId).emit('game:event', { event, gameState: room.engine.getState() });
        return ack({ ok: true, event, gameState: room.engine.getState() });
      } catch (error) {
        return ack({ ok: false, error: error.message });
      }
    });
  });

  return {
    app,
    server,
    io,
    roomStore,
    eventLogStore
  };
}
