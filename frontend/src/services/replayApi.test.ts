import { describe, expect, it } from 'vitest';
import { normalizeReplayEvents } from './replayApi';

describe('replay api helpers', () => {
  it('sorts replay events by sequence', () => {
    const sorted = normalizeReplayEvents([
      { sequence: 3, timestamp: '2024-01-01T00:00:03.000Z', type: 'tokenMoved' },
      { sequence: 1, timestamp: '2024-01-01T00:00:01.000Z', type: 'roomCreated' },
      { sequence: 2, timestamp: '2024-01-01T00:00:02.000Z', type: 'diceRolled' }
    ]);

    expect(sorted.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });
});
