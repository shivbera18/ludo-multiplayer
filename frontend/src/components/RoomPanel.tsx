import type { FormEvent } from 'react';
import type { RoomSnapshot } from '../types';

interface RoomPanelProps {
  room: RoomSnapshot | null;
  playerId: string;
  playerName: string;
  roomInput: string;
  isSubmitting: boolean;
  onPlayerIdChange: (value: string) => void;
  onPlayerNameChange: (value: string) => void;
  onRoomInputChange: (value: string) => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: () => Promise<void>;
  onStartGame: () => Promise<void>;
  onCopyRoomId: () => Promise<void>;
}

export function RoomPanel({
  room,
  playerId,
  playerName,
  roomInput,
  isSubmitting,
  onPlayerIdChange,
  onPlayerNameChange,
  onRoomInputChange,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onCopyRoomId
}: RoomPanelProps) {
  const isHost = room?.players[0]?.playerId === playerId;
  const canStart = Boolean(isHost && room?.status === 'waiting' && room.players.length >= 2);
  const hasRoomInput = roomInput.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasRoomInput) {
      await onJoinRoom();
      return;
    }
    await onCreateRoom();
  }

  return (
    <section className="panel">
      <h2>Room lobby</h2>
      <form onSubmit={handleSubmit} className="stack-sm">
        <label>
          Player id
          <input
            value={playerId}
            onChange={(event) => onPlayerIdChange(event.target.value)}
            placeholder="player-1"
            required
          />
        </label>
        <label>
          Display name
          <input
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            placeholder="Player One"
            required
          />
        </label>
        <label>
          Room id (optional to join)
          <input
            value={roomInput}
            onChange={(event) => onRoomInputChange(event.target.value)}
            placeholder="Paste room id to join"
          />
        </label>
        <div className="row">
          <button type="submit" disabled={isSubmitting}>
            {hasRoomInput ? 'Join room' : 'Create room'}
          </button>
          <button type="button" onClick={() => void onStartGame()} disabled={!canStart || isSubmitting}>
            {isHost ? 'Start match' : 'Host starts game'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void onCopyRoomId()}
            disabled={!room?.roomId || isSubmitting}
          >
            Copy room id
          </button>
        </div>
      </form>

      <div className="room-meta">
        <p>
          <strong>Current room:</strong> {room?.roomId ?? 'none'}
        </p>
        <p>
          <strong>Status:</strong> {room?.status ?? 'idle'}
        </p>
        <p>
          <strong>Your role:</strong>{' '}
          {room ? (isHost ? 'Host' : 'Player') : 'No room joined'}
        </p>
        <p>
          <strong>Players ({room?.players.length ?? 0}):</strong>{' '}
          {room?.players.map((player) => player.name).join(', ') || '—'}
        </p>
        {room?.status === 'waiting' && isHost && room.players.length < 2 ? (
          <p className="hint">Invite another player, then start the match.</p>
        ) : null}
      </div>
    </section>
  );
}
