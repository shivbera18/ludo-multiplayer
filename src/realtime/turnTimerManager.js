const DEFAULT_TURN_MS = 10_000;

function makeTimerState(endsAt, timeoutHandle) {
  return {
    endsAt,
    timeoutHandle
  };
}

export class TurnTimerManager {
  constructor({
    roomStore,
    eventLogStore,
    io,
    now = () => Date.now(),
    turnDurationMs = DEFAULT_TURN_MS
  }) {
    this.roomStore = roomStore;
    this.eventLogStore = eventLogStore;
    this.io = io;
    this.now = now;
    this.turnDurationMs = turnDurationMs;
    this.timersByRoom = new Map();
  }

  clearTimer(roomId) {
    const existing = this.timersByRoom.get(roomId);
    if (existing?.timeoutHandle) {
      clearTimeout(existing.timeoutHandle);
    }
    this.timersByRoom.delete(roomId);
  }

  getRemainingMs(roomId) {
    const timer = this.timersByRoom.get(roomId);
    if (!timer) return null;
    return Math.max(timer.endsAt - this.now(), 0);
  }

  scheduleForRoom(roomId, { reason = 'turnChanged', actorPlayerId = null } = {}) {
    const room = this.roomStore.getRoom(roomId);
    if (!room?.engine || room.status !== 'active') {
      this.clearTimer(roomId);
      return;
    }

    const state = room.engine.getState();
    if (state.status === 'finished') {
      this.clearTimer(roomId);
      return;
    }

    this.clearTimer(roomId);
    const currentPlayerId = state.playerOrder[state.currentTurn];
    const endsAt = this.now() + this.turnDurationMs;

    const timeoutHandle = setTimeout(() => {
      this.handleTimeout(roomId);
    }, this.turnDurationMs);

    this.timersByRoom.set(roomId, makeTimerState(endsAt, timeoutHandle));

    const timerEvent = this.eventLogStore.append(roomId, {
      type: 'turnTimerScheduled',
      payload: {
        currentPlayerId,
        durationMs: this.turnDurationMs,
        endsAt,
        reason,
        actorPlayerId
      }
    });

    this.io.to(roomId).emit('game:timerUpdate', {
      roomId,
      currentPlayerId,
      turnDurationMs: this.turnDurationMs,
      turnEndsAt: endsAt,
      remainingMs: this.turnDurationMs
    });

    this.io.to(roomId).emit('game:event', {
      event: timerEvent,
      gameState: room.engine.getState()
    });
  }

  handleTimeout(roomId) {
    const room = this.roomStore.getRoom(roomId);
    if (!room?.engine || room.status !== 'active') {
      this.clearTimer(roomId);
      return;
    }

    const stateBefore = room.engine.getState();
    if (stateBefore.status === 'finished') {
      this.clearTimer(roomId);
      return;
    }

    const playerId = stateBefore.playerOrder[stateBefore.currentTurn];
    room.engine.finishTurn(null);
    const stateAfter = room.engine.getState();
    const nextTurnPlayerId = stateAfter.playerOrder[stateAfter.currentTurn];

    const event = this.eventLogStore.append(roomId, {
      type: 'turnAutoSkipped',
      playerId,
      payload: {
        reason: 'timeout',
        nextTurnPlayerId
      }
    });
    const turnChangedEvent = this.eventLogStore.append(roomId, {
      type: 'turnChanged',
      payload: {
        currentPlayerId: nextTurnPlayerId,
        reason: 'timeout',
        actorPlayerId: playerId
      }
    });

    this.io.to(roomId).emit('game:turnAutoSkipped', {
      roomId,
      playerId,
      reason: 'timeout',
      gameState: stateAfter
    });
    this.io.to(roomId).emit('game:turnChanged', {
      roomId,
      currentPlayerId: nextTurnPlayerId,
      reason: 'timeout',
      actorPlayerId: playerId
    });

    this.io.to(roomId).emit('game:event', {
      event,
      gameState: stateAfter
    });
    this.io.to(roomId).emit('game:event', {
      event: turnChangedEvent,
      gameState: stateAfter
    });

    this.scheduleForRoom(roomId, { reason: 'timeout', actorPlayerId: playerId });
  }
}

export const TurnTimerConstants = {
  DEFAULT_TURN_MS
};
