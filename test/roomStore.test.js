import { describe, expect, it } from 'vitest';
import { RoomStore } from '../src/rooms/roomStore.js';

describe('RoomStore room lifecycle behavior', () => {
  it('allows existing player to rejoin after game starts', () => {
    const roomStore = new RoomStore();
    const room = roomStore.createRoom({ playerId: 'host', name: 'Host' });
    roomStore.joinRoom(room.roomId, { playerId: 'guest', name: 'Guest' });
    roomStore.startGame(room.roomId, 'host', { rng: () => 6 });

    const rejoinedRoom = roomStore.joinRoom(room.roomId, { playerId: 'guest', name: 'Guest' });

    expect(rejoinedRoom.roomId).toBe(room.roomId);
    expect(rejoinedRoom.players).toHaveLength(2);
  });

  it('marks room as finished', () => {
    const roomStore = new RoomStore();
    const room = roomStore.createRoom({ playerId: 'host', name: 'Host' });

    roomStore.finishGame(room.roomId);

    expect(roomStore.getRoom(room.roomId)?.status).toBe('finished');
  });
});
