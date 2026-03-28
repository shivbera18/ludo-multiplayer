import { humanTokenPosition } from '../state/gameState';
import type { LudoGameState, RoomSnapshot } from '../types';

interface LudoBoardProps {
  room: RoomSnapshot | null;
  gameState: LudoGameState | null;
}

function buildTrackOccupancy(gameState: LudoGameState) {
  const occupancy = new Map<number, string[]>();
  Object.entries(gameState.players).forEach(([playerId, playerState]) => {
    playerState.tokens.forEach((position, tokenIndex) => {
      if (position < 0 || position > 57) return;
      const existing = occupancy.get(position) ?? [];
      existing.push(`${playerId}:${tokenIndex + 1}`);
      occupancy.set(position, existing);
    });
  });
  return occupancy;
}

export function LudoBoard({ room, gameState }: LudoBoardProps) {
  if (!room) {
    return (
      <section className="panel">
        <h2>Ludo board</h2>
        <p>Create or join a room to begin.</p>
      </section>
    );
  }

  if (!gameState) {
    return (
      <section className="panel">
        <h2>Ludo board</h2>
        <p>Waiting for host to start the game.</p>
      </section>
    );
  }

  const occupancy = buildTrackOccupancy(gameState);

  return (
    <section className="panel">
      <h2>Ludo board</h2>
      <div className="players-grid">
        {gameState.playerOrder.map((playerId) => {
          const tokens = gameState.players[playerId]?.tokens ?? [];
          return (
            <article key={playerId} className="player-card">
              <h3>{playerId}</h3>
              <div className="token-strip">
                {tokens.map((position, index) => (
                  <span key={`${playerId}-${index}`} className="token-pill">
                    T{index + 1}: {humanTokenPosition(position)}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <h3>Track occupancy (0-57)</h3>
      <div className="track-grid" aria-label="track-grid">
        {Array.from({ length: 58 }, (_, index) => {
          const players = occupancy.get(index) ?? [];
          return (
            <div key={index} className="track-cell">
              <strong>{index}</strong>
              <span>{players.length ? players.join(', ') : '—'}</span>
            </div>
          );
        })}
      </div>
      {gameState.winner ? <p className="winner">Winner: {gameState.winner}</p> : null}
    </section>
  );
}
