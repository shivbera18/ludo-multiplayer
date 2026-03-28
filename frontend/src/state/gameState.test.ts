import { describe, expect, it } from 'vitest';
import {
  gameReducer,
  getCurrentTurnPlayerId,
  getMovableTokenIndexes,
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
        players: [{ playerId: 'p1', name: 'P1' }, { playerId: 'p2', name: 'P2' }],
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
});
