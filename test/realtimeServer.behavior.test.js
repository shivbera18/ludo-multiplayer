import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { createRealtimeServer } from '../src/server.js';

function onceConnected(client) {
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      client.off('connect', onConnect);
      client.off('connect_error', onError);
    };
    client.on('connect', onConnect);
    client.on('connect_error', onError);
  });
}

function emitAck(client, eventName, payload) {
  return new Promise((resolve) => {
    client.emit(eventName, payload, (ack) => resolve(ack));
  });
}

describe('Realtime server richer runtime behavior', () => {
  let realtime;
  let port;
  let host;
  let guest;

  beforeEach(async () => {
    realtime = createRealtimeServer({ turnDurationMs: 1_000 });
    await new Promise((resolve) => realtime.server.listen(0, resolve));
    port = realtime.server.address().port;
    host = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    guest = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    await Promise.all([onceConnected(host), onceConnected(guest)]);
  });

  afterEach(async () => {
    if (host?.connected) host.disconnect();
    if (guest?.connected) guest.disconnect();
    await new Promise((resolve, reject) => {
      realtime.server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('emits turn/timer events and marks room finished on winner', async () => {
    const created = await emitAck(host, 'room:create', { playerId: 'p1', name: 'P1' });
    expect(created.ok).toBe(true);
    const roomId = created.room.roomId;

    const joined = await emitAck(guest, 'room:join', { roomId, playerId: 'p2', name: 'P2' });
    expect(joined.ok).toBe(true);

    const turnChangedPromise = new Promise((resolve) => {
      guest.once('game:turnChanged', (payload) => resolve(payload));
    });
    const timerUpdatePromise = new Promise((resolve) => {
      guest.once('game:timerUpdate', (payload) => resolve(payload));
    });
    await emitAck(host, 'game:start', { roomId, playerId: 'p1' });

    const turnChanged = await turnChangedPromise;
    const timerUpdate = await timerUpdatePromise;
    expect(turnChanged.currentPlayerId).toBe('p1');
    expect(timerUpdate.turnDurationMs).toBe(1_000);

    const room = realtime.roomStore.getRoom(roomId);
    room.engine.state.players.p1.tokens = [56, 57, 57, 57];
    room.engine.rng = () => 1;

    const rollAck = await emitAck(host, 'game:roll', { roomId, playerId: 'p1', actionId: 'roll-win' });
    expect(rollAck.ok).toBe(true);
    const finishedPromise = new Promise((resolve) => {
      guest.once('game:finished', (payload) => resolve(payload));
    });
    const moveAck = await emitAck(host, 'game:move', { roomId, playerId: 'p1', tokenIndex: 0, actionId: 'move-win' });
    expect(moveAck.ok).toBe(true);

    const finished = await finishedPromise;
    expect(finished.winnerPlayerId).toBe('p1');
    expect(realtime.roomStore.getRoom(roomId).status).toBe('finished');
  });

  it('supports reconnect by same player and sends latest state', async () => {
    const created = await emitAck(host, 'room:create', { playerId: 'p1', name: 'P1' });
    const roomId = created.room.roomId;
    await emitAck(guest, 'room:join', { roomId, playerId: 'p2', name: 'P2' });
    await emitAck(host, 'game:start', { roomId, playerId: 'p1' });

    const reconnecting = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    await onceConnected(reconnecting);

    const statePromise = new Promise((resolve) => {
      reconnecting.once('game:state', (payload) => resolve(payload));
    });
    const timerPromise = new Promise((resolve) => {
      reconnecting.once('game:timerUpdate', (payload) => resolve(payload));
    });

    const joinAck = await emitAck(reconnecting, 'room:join', {
      roomId,
      playerId: 'p2',
      name: 'P2'
    });
    expect(joinAck.ok).toBe(true);

    const state = await statePromise;
    const timer = await timerPromise;
    expect(state.roomId).toBe(roomId);
    expect(state.gameState).toBeTruthy();
    expect(timer.currentPlayerId).toBe(state.gameState.playerOrder[state.gameState.currentTurn]);

    reconnecting.disconnect();
  });
});
