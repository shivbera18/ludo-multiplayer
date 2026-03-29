import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LudoBoard } from '../components/LudoBoard';
import { Button } from '../components/ui/button';
import { useGame } from '../context/GameContext';

export default function Arena() {
  const {
    auth,
    logout,
    state,
    playerId,
    movableTokens,
    isMyTurn,
    currentRoomId,
    rollDice,
    moveToken,
    canRoll
  } = useGame();

  const navigate = useNavigate();

  const latestDiceByPlayer = useMemo(() => {
    const latest: Record<string, number | null> = {};

    state.events.forEach((event) => {
      if (event.type !== 'diceRolled' || !event.playerId) return;
      const payload = event.payload as { dice?: unknown } | undefined;
      const dice = payload?.dice;
      if (typeof dice === 'number' && Number.isInteger(dice) && dice >= 1 && dice <= 6) {
        latest[event.playerId] = dice;
      }
    });

    return latest;
  }, [state.events]);
  useEffect(() => {
    if (!auth) {
      navigate('/');
      return;
    }
    if (!state.room) {
      navigate('/lobby');
      return;
    }
    if (state.room.status === 'waiting') {
      navigate('/lobby');
    }
  }, [auth, state.room, navigate]);

  if (!auth) return null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-6">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur animate-floatIn">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Room: {currentRoomId ?? 'none'}</p>
            <p className="text-xs text-slate-500">Player: {auth.user.displayName}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => navigate('/lobby')}>
              Lobby
            </Button>
            <Button variant="outline" type="button" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {state.error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.info ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700" role="status" aria-live="polite">
            {state.info}
          </p>
        ) : null}
      </header>

      <LudoBoard
        room={state.room}
        gameState={state.gameState}
        myPlayerId={playerId}
        movableTokens={movableTokens}
        isMyTurn={isMyTurn}
        isSubmitting={state.isSubmitting}
        canRoll={canRoll}
        lastDice={state.gameState?.lastDice ?? null}
        latestDiceByPlayer={latestDiceByPlayer}
        onMoveToken={moveToken}
        onRollDice={rollDice}
      />
    </main>
  );
}
