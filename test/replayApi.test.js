import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server.js';

describe('Replay API', () => {
  it('returns ordered replay events for room', async () => {
    const { app, roomStore, eventLogStore } = createApp();

    const room = roomStore.createRoom({ playerId: 'host', name: 'Host' });
    eventLogStore.append(room.roomId, { type: 'roomCreated', playerId: 'host' });
    eventLogStore.append(room.roomId, { type: 'roomJoined', playerId: 'guest' });

    const response = await request(app).get(`/api/replay/${room.roomId}`).expect(200);

    expect(response.body.roomId).toBe(room.roomId);
    expect(response.body.events).toHaveLength(2);
    expect(response.body.events[0].sequence).toBe(1);
    expect(response.body.events[1].sequence).toBe(2);
  });
});
