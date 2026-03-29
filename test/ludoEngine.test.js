import { describe, expect, it } from 'vitest';
import { EngineConstants, LudoEngine } from '../src/engine/ludoEngine.js';

function makeEngineWithDice(...diceRolls) {
  let i = 0;
  return new LudoEngine(['p1', 'p2'], {
    rng: () => diceRolls[i++]
  });
}

describe('LudoEngine deterministic rules', () => {
  it('maps each player progress to distinct board ring positions', () => {
    const engine = makeEngineWithDice(6, 1, 6);

    engine.rollDice('p1');
    engine.moveToken('p1', 0);
    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    engine.rollDice('p2');
    engine.moveToken('p2', 0);

    expect(engine.getState().players.p1.tokens[0]).toBe(1);
    expect(engine.getState().players.p2.tokens[0]).toBe(0);
  });

  it('captures opponent token when landing on same non-safe ring cell', () => {
    const engine = new LudoEngine(['p1', 'p2'], {
      rng: () => 1
    });

    // Place tokens directly on equivalent ring spots (ring index 1).
    engine.state.players.p1.tokens[0] = 1;
    engine.state.players.p2.tokens[0] = 41;
    engine.state.lastDice = 1;

    const result = engine.moveToken('p1', 0);

    expect(result.captures).toEqual([
      expect.objectContaining({ playerId: 'p2', tokenIndex: 0, from: 41, to: -1 })
    ]);
    expect(engine.getState().players.p2.tokens[0]).toBe(-1);
  });

  it('uses server rng for dice and sets pending move state when move exists', () => {
    const engine = makeEngineWithDice(6);
    const result = engine.rollDice('p1');

    expect(result.dice).toBe(6);
    expect(engine.getState().lastDice).toBe(6);
  });

  it('rejects rolling when it is not player turn', () => {
    const engine = makeEngineWithDice(3);
    expect(() => engine.rollDice('p2')).toThrow('Not your turn');
  });

  it('auto-skips turn when no token can move', () => {
    const engine = makeEngineWithDice(5);
    const result = engine.rollDice('p1');

    expect(result.movableTokenIndexes).toEqual([]);
    expect(engine.getState().lastDice).toBeNull();
    expect(engine.getState().currentTurn).toBe(1);
  });

  it('requires six to leave yard', () => {
    const engine = makeEngineWithDice(6, 5);

    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    engine.rollDice('p1');
    expect(() => engine.moveToken('p1', 1)).toThrow('Need six to leave yard');
  });

  it('advances turn after non-six move', () => {
    const engine = makeEngineWithDice(6, 2);
    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    expect(engine.getState().currentTurn).toBe(1);
  });

  it('keeps same turn after a six move', () => {
    const engine = makeEngineWithDice(6);
    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    expect(engine.getState().currentTurn).toBe(0);
  });

  it('prevents overshoot beyond home position', () => {
    const engine = makeEngineWithDice(6, 6);
    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    const state = engine.state;
    state.players.p1.tokens[0] = EngineConstants.HOME_POSITION - 2;

    engine.rollDice('p1');
    expect(() => engine.moveToken('p1', 0)).toThrow('Move exceeds home position');
  });

  it('rejects actions after game is finished', () => {
    const engine = makeEngineWithDice(1);
    engine.state.players.p1.tokens = [56, 57, 57, 57];

    engine.rollDice('p1');
    engine.moveToken('p1', 0);

    expect(engine.getState().status).toBe('finished');
    expect(() => engine.rollDice('p1')).toThrow('Game already finished');
    expect(() => engine.moveToken('p1', 0)).toThrow('Game already finished');
  });
});
