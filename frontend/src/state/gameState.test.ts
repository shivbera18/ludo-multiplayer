import { describe, expect, it } from 'vitest';
import {
  describeGameEvent,
  gameReducer,
  getCurrentTurnPlayerId,
  getMovableTokenIndexes,
  getPlayerName,
  humanTokenPosition,
  initialState
} from './gameState';

describe('game state reducer', () => {
  it('stores room and game snapshot from server', () => {
    const state = gameReducer(initialState, {
      type: 'room:update',
      room: {
        roomId: 'r1',
        status: 'active',
        players: [
          { playerId: 'p1', name: 'P1' },
          { playerId: 'p2', name: 'P2' }
        ],
        gameState: {
          status: 'active',
          playerOrder: ['p1', 'p2'],
          currentTurn: 0,
          lastDice: null,
          winner: null,
          players: {
            p1: { tokens: [-1, -1, -1, -1] },
            p2: { tokens: [-1, -1, -1, -1] }
          }
        }
      }
    });

    expect(state.room?.roomId).toBe('r1');
    expect(state.gameState?.playerOrder).toEqual(['p1', 'p2']);
  });

  it('derives movable token indexes for dice constraints', () => {
    const movable = getMovableTokenIndexes(
      {
        status: 'active',
        playerOrder: ['p1', 'p2'],
        currentTurn: 0,
        lastDice: 6,
        winner: null,
        players: {
          p1: { tokens: [-1, 55, 57, 12] },
          p2: { tokens: [-1, -1, -1, -1] }
        }
      },
      'p1'
    );

    expect(movable).toEqual([0, 3]);
  });

  it('exposes current turn player and token labels', () => {
    const turnPlayer = getCurrentTurnPlayerId({
      status: 'active',
      playerOrder: ['p2', 'p1'],
      currentTurn: 1,
      lastDice: null,
      winner: null,
      players: {
        p1: { tokens: [-1, -1, -1, -1] },
        p2: { tokens: [-1, -1, -1, -1] }
      }
    });

    expect(turnPlayer).toBe('p1');
    expect(humanTokenPosition(-1)).toBe('YARD');
    expect(humanTokenPosition(57)).toBe('HOME');
  });

  it('clears scoped notifications and trims event feed', () => {
    let state = gameReducer(initialState, { type: 'error', message: 'bad' });
    state = gameReducer(state, { type: 'info', message: 'ok' });
    state = gameReducer(state, { type: 'message:clear', scope: 'error' });
    expect(state.error).toBeNull();
    expect(state.info).toBe('ok');

    for (let index = 0; index < 205; index += 1) {
      state = gameReducer(state, {
        type: 'event:add',
        event: {
          sequence: index + 1,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'eventType',
          playerId: 'p1'
        }
      });
    }

    expect(state.events).toHaveLength(200);
    expect(state.events[0]?.sequence).toBe(6);
  });

  it('provides event and player labels for ui surfaces', () => {
    const message = describeGameEvent({
      sequence: 9,
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'diceRolled',
      playerId: 'p1'
    });
    expect(message).toContain('diceRolled');
    expect(message).toContain('#9');

    expect(
      getPlayerName(
        {
          roomId: 'room',
          status: 'active',
          gameState: null,
          players: [{ playerId: 'p1', name: 'Player One' }]
        },
        'p1'
      )
    ).toBe('Player One');
    expect(getPlayerName(null, 'p1')).toBe('—');
  });
});
