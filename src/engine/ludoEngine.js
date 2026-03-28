const TOKENS_PER_PLAYER = 4;
const START_POSITION = -1;
const HOME_POSITION = 57;

export class LudoEngine {
  constructor(playerIds, options = {}) {
    if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4) {
      throw new Error('Ludo requires 2-4 players');
    }

    this.playerIds = playerIds;
    this.rng = options.rng ?? (() => Math.floor(Math.random() * 6) + 1);
    this.state = {
      status: 'active',
      playerOrder: [...playerIds],
      currentTurn: 0,
      lastDice: null,
      winner: null,
      players: Object.fromEntries(
        playerIds.map((id) => [id, { tokens: Array(TOKENS_PER_PLAYER).fill(START_POSITION) }])
      )
    };
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  ensureTurn(playerId) {
    const expected = this.state.playerOrder[this.state.currentTurn];
    if (expected !== playerId) {
      throw new Error('Not your turn');
    }
  }

  rollDice(playerId) {
    if (this.state.status === 'finished') {
      throw new Error('Game already finished');
    }
    this.ensureTurn(playerId);
    if (this.state.lastDice !== null) {
      throw new Error('Roll already made this turn');
    }

    const dice = this.rng();
    if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
      throw new Error('Invalid dice generator result');
    }

    this.state.lastDice = dice;
    const movable = this.getMovableTokens(playerId, dice);
    if (movable.length === 0) {
      this.finishTurn(dice);
    }

    return {
      type: 'diceRolled',
      playerId,
      dice,
      movableTokenIndexes: movable
    };
  }

  getMovableTokens(playerId, dice = this.state.lastDice) {
    if (!Number.isInteger(dice)) return [];
    const tokens = this.state.players[playerId]?.tokens;
    if (!tokens) return [];

    return tokens
      .map((position, tokenIndex) => ({ position, tokenIndex }))
      .filter(({ position }) => {
        if (position === HOME_POSITION) return false;
        if (position === START_POSITION) return dice === 6;
        return position + dice <= HOME_POSITION;
      })
      .map(({ tokenIndex }) => tokenIndex);
  }

  moveToken(playerId, tokenIndex) {
    if (this.state.status === 'finished') {
      throw new Error('Game already finished');
    }
    this.ensureTurn(playerId);
    const dice = this.state.lastDice;
    if (!Number.isInteger(dice)) {
      throw new Error('Roll required before move');
    }

    const player = this.state.players[playerId];
    if (!player || tokenIndex < 0 || tokenIndex >= TOKENS_PER_PLAYER) {
      throw new Error('Invalid token');
    }

    const current = player.tokens[tokenIndex];
    let next;

    if (current === START_POSITION) {
      if (dice !== 6) {
        throw new Error('Need six to leave yard');
      }
      next = 0;
    } else {
      next = current + dice;
      if (next > HOME_POSITION) {
        throw new Error('Move exceeds home position');
      }
    }

    player.tokens[tokenIndex] = next;

    if (player.tokens.every((token) => token === HOME_POSITION)) {
      this.state.status = 'finished';
      this.state.winner = playerId;
    }

    this.finishTurn(dice);

    return {
      type: 'tokenMoved',
      playerId,
      tokenIndex,
      from: current,
      to: next,
      dice,
      nextTurnPlayerId: this.state.playerOrder[this.state.currentTurn],
      winner: this.state.winner
    };
  }

  skipTurn(playerId, reason = 'timeout') {
    if (this.state.status === 'finished') {
      throw new Error('Game already finished');
    }
    this.ensureTurn(playerId);
    const previousDice = this.state.lastDice;
    this.state.lastDice = null;
    this.state.currentTurn = (this.state.currentTurn + 1) % this.state.playerOrder.length;
    return {
      type: 'turnSkipped',
      playerId,
      reason,
      previousDice,
      nextTurnPlayerId: this.state.playerOrder[this.state.currentTurn]
    };
  }

  finishTurn(dice) {
    this.state.lastDice = null;
    if (this.state.status === 'finished') return;
    if (dice !== 6) {
      this.state.currentTurn = (this.state.currentTurn + 1) % this.state.playerOrder.length;
    }
  }
}

export const EngineConstants = {
  TOKENS_PER_PLAYER,
  START_POSITION,
  HOME_POSITION
};
