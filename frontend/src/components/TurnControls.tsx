interface TurnControlsProps {
  isMyTurn: boolean;
  canRoll: boolean;
  movableTokens: number[];
  lastDice: number | null;
  isSubmitting: boolean;
  onRollDice: () => Promise<void>;
  onMoveToken: (tokenIndex: number) => Promise<void>;
}

export function TurnControls({
  isMyTurn,
  canRoll,
  movableTokens,
  lastDice,
  isSubmitting,
  onRollDice,
  onMoveToken
}: TurnControlsProps) {
  return (
    <section className="panel">
      <h2>Turn controls</h2>
      <p>Last dice: {lastDice ?? '—'}</p>
      <p>Turn: {isMyTurn ? 'Your turn' : 'Waiting for other player'}</p>
      <div className="row">
        <button onClick={() => void onRollDice()} disabled={!canRoll || isSubmitting}>Roll dice</button>
      </div>
      <div className="token-buttons">
        {movableTokens.length === 0 ? (
          <small>No movable tokens yet.</small>
        ) : (
          movableTokens.map((tokenIndex) => (
            <button
              key={tokenIndex}
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
