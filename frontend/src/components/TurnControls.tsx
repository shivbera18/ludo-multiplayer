import { Button } from './ui/button';

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
      <h2 className="font-display text-lg font-bold text-black uppercase">Turn controls</h2>
      <div className="mt-3 grid gap-2 text-sm font-bold text-black">
        <p className="border-4 border-black bg-pink-300 px-3 py-2 shadow-[4px_4px_0_0_#000]">
          Active turn: <strong>{currentTurnPlayerName}</strong>
        </p>
        <p className="border-4 border-black bg-white px-3 py-2 shadow-[4px_4px_0_0_#000]">
          Last dice: <strong>{lastDice ?? '—'}</strong>
        </p>
        <p
          className={`border-4 border-black px-3 py-2 font-bold shadow-[4px_4px_0_0_#000] ${
            isMyTurn ? 'bg-emerald-400 text-black' : 'bg-slate-200 text-black'
          }`}
        >
          {isMyTurn ? 'Your turn' : 'Waiting for other player'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void onRollDice()} disabled={!canRoll || isSubmitting}>
          {isSubmitting ? 'Rolling…' : 'Roll dice'}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {movableTokens.length === 0 ? (
          <small className="text-sm font-bold text-black/70">
            {isMyTurn ? 'No valid token move for this dice.' : 'Wait for your turn to move tokens.'}
          </small>
        ) : (
          <small className="text-sm font-bold text-black/70">
            Movable chips are highlighted on the board. Click a highlighted chip to move.
          </small>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {movableTokens.map((tokenIndex) => (
          <Button
            key={tokenIndex}
            variant="secondary"
            onClick={() => void onMoveToken(tokenIndex)}
            disabled={!isMyTurn || isSubmitting}
          >
            Move token #{tokenIndex + 1}
          </Button>
        ))}
      </div>
    </section>
  );
}
