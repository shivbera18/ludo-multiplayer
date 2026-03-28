interface TurnControlsProps {
  isMyTurn: boolean;
  canRoll: boolean;
  movableTokens: number[];
  lastDice: number | null;
  isSubmitting: boolean;
  currentTurnPlayerName: string;
  onRollDice: () => Promise<void>;
  onMoveToken: (tokenIndex: number) => Promise<void>;
}

export function TurnControls({
  isMyTurn,
  canRoll,
  movableTokens,
  lastDice,
  isSubmitting,
  currentTurnPlayerName,
  onRollDice,
  onMoveToken
}: TurnControlsProps) {
  return (
    <section className="panel">
      <h2>Turn controls</h2>
      <div className="turn-summary">
        <p>
          Active turn: <strong>{currentTurnPlayerName}</strong>
        </p>
        <p>
          Last dice: <strong>{lastDice ?? '—'}</strong>
        </p>
        <p className={isMyTurn ? 'turn-text my-turn' : 'turn-text waiting-turn'}>
          {isMyTurn ? 'Your turn' : 'Waiting for other player'}
        </p>
      </div>

      <div className="row">
        <button onClick={() => void onRollDice()} disabled={!canRoll || isSubmitting}>
          {isSubmitting ? 'Rolling…' : 'Roll dice'}
        </button>
      </div>

      <div className="token-buttons">
        {movableTokens.length === 0 ? (
          <small>{isMyTurn ? 'No valid token move for this dice.' : 'Wait for your turn to move tokens.'}</small>
        ) : (
          movableTokens.map((tokenIndex) => (
            <button
              key={tokenIndex}
              className="secondary-button"
              onClick={() => void onMoveToken(tokenIndex)}
              disabled={!isMyTurn || isSubmitting}
            >
              Move token #{tokenIndex + 1}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
