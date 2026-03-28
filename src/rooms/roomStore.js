import { randomUUID } from 'node:crypto';
import { LudoEngine } from '../engine/ludoEngine.js';

export class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(host) {
    const roomId = randomUUID();
    const room = {
      roomId,
      status: 'waiting',
      players: [host],
      engine: null,
      processedActionIds: new Set()
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) ?? null;
  }

  joinRoom(roomId, player) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.status !== 'waiting') {
      throw new Error('Room already started');
    }
    if (room.players.find((p) => p.playerId === player.playerId)) {
      return room;
    }
    if (room.players.length >= 4) {
      throw new Error('Room is full');
    }
    room.players.push(player);
    return room;
  }

  startGame(roomId, starterPlayerId, options = {}) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.players[0]?.playerId !== starterPlayerId) {
      throw new Error('Only host can start');
    }
    if (room.players.length < 2) {
      throw new Error('Need at least 2 players');
    }
    if (room.status === 'active') {
      throw new Error('Game already active');
    }

    room.status = 'active';
    room.engine = new LudoEngine(
      room.players.map((p) => p.playerId),
      options
    );

    return room;
  }

  checkAndRecordAction(roomId, actionId) {
    if (actionId === null || actionId === undefined) return false;
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.processedActionIds.has(actionId)) {
      return true;
    }
    room.processedActionIds.add(actionId);
    return false;
  }

  serialize(room) {
    return {
      roomId: room.roomId,
      status: room.status,
      players: room.players,
      gameState: room.engine?.getState() ?? null
    };
  }
}
