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

export function LudoBoard({ room, gameState, myPlayerId }: LudoBoardProps) {
  if (!room) {
    return (
      <section className="panel">
        <h2 className="panel-title">Ludo board</h2>
        <p>Create or join a room to begin.</p>
      </section>
    );
  }

  if (!gameState) {
    return (
      <section className="panel">
        <h2 className="panel-title">Ludo board</h2>
        <p>Waiting for host to start the game.</p>
      </section>
    );
  }

  const occupancy = buildTrackOccupancy(gameState);
  const currentTurnPlayerId = getCurrentTurnPlayerId(gameState);

  return (
    <section className="panel panel-board">
      <div className="panel-heading">
        <h2 className="panel-title">Ludo board</h2>
        <div className="board-status-row">
          <span className="status-chip">
            Turn: <strong>{getPlayerName(room, currentTurnPlayerId)}</strong>
          </span>
          {gameState.winner ? (
            <span className="status-chip winner-chip" role="status" aria-live="polite">
              Winner: <strong>{getPlayerName(room, gameState.winner)}</strong>
            </span>
          ) : null}
        </div>
      </div>

      <div className="players-grid">
        {gameState.playerOrder.map((playerId) => {
          const tokens = gameState.players[playerId]?.tokens ?? [];
          const playerName = getPlayerName(room, playerId);
          const isCurrentTurn = playerId === currentTurnPlayerId;
          const isWinner = gameState.winner === playerId;
          const isMe = myPlayerId === playerId;

          return (
            <article
              key={playerId}
              className={`player-card ${getPlayerClass(gameState.playerOrder, playerId)} ${
                isCurrentTurn ? 'current-turn' : ''
              } ${isWinner ? 'is-winner' : ''}`.trim()}
            >
              <h3>
                {playerName}
                {isMe ? ' (You)' : ''}
              </h3>
              <p className="player-id">{playerId}</p>
              <div className="token-strip">
                {tokens.map((position, index) => (
                  <span key={`${playerId}-${index}`} className="token-pill">
                    T{index + 1}: {humanTokenPosition(position)}
                  </span>
                ))}
              </div>
              {isCurrentTurn ? <small className="turn-marker">Current turn</small> : null}
              {isWinner ? <small className="winner-marker">Winner</small> : null}
            </article>
          );
        })}
      </div>

      <h3>Track occupancy (0-57)</h3>
      <div className="track-grid" aria-label="track-grid">
        {Array.from({ length: 58 }, (_, index) => {
          const players = occupancy.get(index) ?? [];
          const isGoal = index === 57;
          const isStart = index === 0;
          return (
            <div
              key={index}
              className={`track-cell ${players.length ? 'occupied' : ''} ${isGoal ? 'goal-cell' : ''} ${
                isStart ? 'start-cell' : ''
              }`.trim()}
            >
              <strong>{index}</strong>
              <div className="track-cell-tokens">
                {players.length ? (
                  players.map(({ playerId, tokenIndex }) => (
                    <span
                      key={`${index}-${playerId}-${tokenIndex}`}
                      className={`track-token ${getPlayerClass(gameState.playerOrder, playerId)}`}
                      title={`${getPlayerName(room, playerId)} token ${tokenIndex + 1}`}
                    >
                      {getPlayerName(room, playerId).slice(0, 1).toUpperCase()}
                      {tokenIndex + 1}
                    </span>
                  ))
                ) : (
                  <span className="empty-track-cell">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
