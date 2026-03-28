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
    <section className="panel animate-floatIn">
      <h2 className="font-display text-lg font-bold text-slate-900">Turn controls</h2>
      <div className="mt-3 grid gap-1 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 px-3 py-2">
          Active turn: <strong>{currentTurnPlayerName}</strong>
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2">
          Last dice: <strong>{lastDice ?? '—'}</strong>
        </p>
        <p
          className={`rounded-lg px-3 py-2 font-semibold ${
            isMyTurn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isMyTurn ? 'Your turn' : 'Waiting for other player'}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => void onRollDice()} disabled={!canRoll || isSubmitting}>
          {isSubmitting ? 'Rolling…' : 'Roll dice'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {movableTokens.length === 0 ? (
          <small className="text-sm text-slate-600">
            {isMyTurn ? 'No valid token move for this dice.' : 'Wait for your turn to move tokens.'}
          </small>
        ) : (
          <small className="text-sm text-slate-700">
            Movable chips are highlighted on the board. Click a highlighted chip to move.
          </small>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {movableTokens.map((tokenIndex) => (
          <button
            key={tokenIndex}
            className="btn-secondary"
            onClick={() => void onMoveToken(tokenIndex)}
            disabled={!isMyTurn || isSubmitting}
          >
            Move token #{tokenIndex + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
