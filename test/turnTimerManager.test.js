import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomStore } from '../src/rooms/roomStore.js';
import { EventLogStore } from '../src/events/eventLogStore.js';
import { TurnTimerManager } from '../src/realtime/turnTimerManager.js';

function createIoMock() {
  const emissions = [];
  return {
    emissions,
    to(roomId) {
      return {
        emit(eventName, payload) {
          emissions.push({ roomId, eventName, payload });
        }
      };
    }
  };
}

describe('TurnTimerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules timer updates for active room turns', () => {
    const roomStore = new RoomStore();
    const eventLogStore = new EventLogStore();
    const io = createIoMock();

    const room = roomStore.createRoom({ playerId: 'p1', name: 'P1' });
    roomStore.joinRoom(room.roomId, { playerId: 'p2', name: 'P2' });
    roomStore.startGame(room.roomId, 'p1', { rng: () => 6 });

    const manager = new TurnTimerManager({
      roomStore,
      eventLogStore,
      io,
      turnDurationMs: 2_000,
      now: () => Date.now()
    });

    manager.scheduleForRoom(room.roomId, { reason: 'gameStart', actorPlayerId: 'p1' });

    const timerEmit = io.emissions.find((emission) => emission.eventName === 'game:timerUpdate');
    expect(timerEmit).toBeTruthy();
    expect(timerEmit.payload.currentPlayerId).toBe('p1');
    expect(manager.getRemainingMs(room.roomId)).toBe(2_000);
  });

  it('auto-skips turn on timeout and emits turn change', () => {
    const roomStore = new RoomStore();
    const eventLogStore = new EventLogStore();
    const io = createIoMock();

    const room = roomStore.createRoom({ playerId: 'p1', name: 'P1' });
    roomStore.joinRoom(room.roomId, { playerId: 'p2', name: 'P2' });
    roomStore.startGame(room.roomId, 'p1', { rng: () => 6 });

    const manager = new TurnTimerManager({
      roomStore,
      eventLogStore,
      io,
      turnDurationMs: 100
    });

    manager.scheduleForRoom(room.roomId, { reason: 'gameStart', actorPlayerId: 'p1' });
    vi.advanceTimersByTime(100);

    expect(room.engine.getState().currentTurn).toBe(1);
    const emittedEvents = io.emissions.map((item) => item.eventName);
    expect(emittedEvents).toContain('game:turnAutoSkipped');
    expect(emittedEvents).toContain('game:turnChanged');

    const eventTypes = eventLogStore.getByRoom(room.roomId).map((entry) => entry.type);
    expect(eventTypes).toContain('turnAutoSkipped');
    expect(eventTypes).toContain('turnChanged');
  });
});
