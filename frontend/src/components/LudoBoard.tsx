import {
  getCurrentTurnPlayerId,
  getPlayerName,
  humanTokenPosition
} from '../state/gameState';
import type { LudoGameState, RoomSnapshot } from '../types';

interface LudoBoardProps {
  room: RoomSnapshot | null;
  gameState: LudoGameState | null;
  myPlayerId: string;
}

const PLAYER_COLORS = ['player-red', 'player-blue', 'player-green', 'player-yellow'];

function buildTrackOccupancy(gameState: LudoGameState) {
  const occupancy = new Map<number, Array<{ playerId: string; tokenIndex: number }>>();
  Object.entries(gameState.players).forEach(([playerId, playerState]) => {
    playerState.tokens.forEach((position, tokenIndex) => {
      if (position < 0 || position > 57) return;
      const existing = occupancy.get(position) ?? [];
      existing.push({ playerId, tokenIndex });
      occupancy.set(position, existing);
    });
  });
  return occupancy;
}

function getPlayerClass(playerOrder: string[], playerId: string) {
  const index = playerOrder.indexOf(playerId);
  if (index < 0) return 'player-neutral';
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

function tokenBgClass(playerClass: string) {
  switch (playerClass) {
    case 'player-red':
      return 'bg-rose-500';
    case 'player-blue':
      return 'bg-sky-500';
    case 'player-green':
      return 'bg-emerald-500';
    case 'player-yellow':
      return 'bg-amber-400';
    default:
      return 'bg-slate-500';
  }
}

export function LudoBoard({ room, gameState, myPlayerId }: LudoBoardProps) {
  if (!room) {
    return (
      <section className="panel">
        <h2 className="font-display text-lg font-bold">Ludo board</h2>
        <p className="mt-2 text-sm text-slate-700">Create or join a room to begin.</p>
      </section>
    );
  }

  if (!gameState) {
    return (
      <section className="panel">
        <h2 className="font-display text-lg font-bold">Ludo board</h2>
        <p className="mt-2 text-sm text-slate-700">Waiting for host to start the game.</p>
      </section>
    );
  }

  const occupancy = buildTrackOccupancy(gameState);
  const currentTurnPlayerId = getCurrentTurnPlayerId(gameState);

  return (
    <section className="panel animate-floatIn">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Ludo board</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            Turn: <strong>{getPlayerName(room, currentTurnPlayerId)}</strong>
          </span>
          {gameState.winner ? (
            <span
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"
              role="status"
              aria-live="polite"
            >
              Winner: <strong>{getPlayerName(room, gameState.winner)}</strong>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-board-line bg-board-bg p-3">
          <div className="grid grid-cols-3 gap-2">
            {gameState.playerOrder.slice(0, 4).map((playerId, index) => {
              const playerName = getPlayerName(room, playerId);
              const playerClass = getPlayerClass(gameState.playerOrder, playerId);
              const tokenColor = tokenBgClass(playerClass);
              const tokens = gameState.players[playerId]?.tokens ?? [];

              const positionClass =
                index === 0
                  ? 'col-start-1 row-start-1'
                  : index === 1
                    ? 'col-start-3 row-start-1'
                    : index === 2
                      ? 'col-start-1 row-start-3'
                      : 'col-start-3 row-start-3';

              return (
                <div key={`house-${playerId}`} className={`${positionClass} rounded-xl border border-board-line bg-white p-2`}>
                  <p className="truncate text-xs font-semibold text-slate-700">{playerName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {tokens.map((position, tokenIndex) => (
                      <div
                        key={`${playerId}-${tokenIndex}`}
                        className={`flex h-10 items-center justify-center rounded-full text-xs font-bold text-white ${tokenColor}`}
                      >
                        {position < 0 ? 'H' : position === 57 ? 'G' : tokenIndex + 1}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="col-start-2 row-start-2 flex items-center justify-center rounded-xl border border-dashed border-amber-400 bg-amber-50 p-2 text-center text-xs font-semibold text-amber-900">
              Ludo Center
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-board-line bg-white p-3">
          <h3 className="font-display text-sm font-bold text-slate-800">Players and token positions</h3>
          <div className="mt-3 grid gap-2">
            {gameState.playerOrder.map((playerId) => {
              const tokens = gameState.players[playerId]?.tokens ?? [];
              const playerName = getPlayerName(room, playerId);
              const isCurrentTurn = playerId === currentTurnPlayerId;
              const isWinner = gameState.winner === playerId;
              const isMe = myPlayerId === playerId;

              return (
                <article
                  key={playerId}
                  className={`rounded-xl border p-3 ${
                    isCurrentTurn
                      ? 'border-sky-300 bg-sky-50'
                      : isWinner
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    {playerName}
                    {isMe ? ' (You)' : ''}
                  </h3>
                  <p className="text-xs text-slate-500">{playerId}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tokens.map((position, index) => (
                      <span key={`${playerId}-${index}`} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs text-slate-700">
                        T{index + 1}: {humanTokenPosition(position)}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <h3 className="mt-4 font-display text-sm font-bold text-slate-800">Track occupancy (0-57)</h3>
      <div className="mt-2 grid max-h-[320px] grid-cols-3 gap-2 overflow-auto sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12" aria-label="track-grid">
        {Array.from({ length: 58 }, (_, index) => {
          const players = occupancy.get(index) ?? [];
          const isGoal = index === 57;
          const isStart = index === 0;
          return (
            <div
              key={index}
              className={`rounded-lg border p-2 text-xs ${
                isGoal
                  ? 'border-emerald-300 bg-emerald-50'
                  : isStart
                    ? 'border-sky-300 bg-sky-50'
                    : players.length
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-amber-200 bg-white'
              }`}
            >
              <strong className="text-slate-700">{index}</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {players.length ? (
                  players.map(({ playerId, tokenIndex }) => {
                    const playerClass = getPlayerClass(gameState.playerOrder, playerId);
                    const tokenColor = tokenBgClass(playerClass);
                    return (
                      <span
                        key={`${index}-${playerId}-${tokenIndex}`}
                        className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${tokenColor}`}
                        title={`${getPlayerName(room, playerId)} token ${tokenIndex + 1}`}
                      >
                        {getPlayerName(room, playerId).slice(0, 1).toUpperCase()}
                        {tokenIndex + 1}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
