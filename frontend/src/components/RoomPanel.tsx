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
  onStartGame
}: RoomPanelProps) {
  const canStart = room?.players[0]?.playerId === playerId && room.status === 'waiting' && room.players.length >= 2;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roomInput.trim()) {
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
          <button type="submit" disabled={isSubmitting}>Create / Join</button>
          <button type="button" onClick={() => void onStartGame()} disabled={!canStart || isSubmitting}>
            Start game
          </button>
        </div>
      </form>

      <div className="room-meta">
        <p><strong>Current room:</strong> {room?.roomId ?? 'none'}</p>
        <p><strong>Status:</strong> {room?.status ?? 'idle'}</p>
        <p><strong>Players:</strong> {room?.players.map((player) => player.name).join(', ') || '—'}</p>
      </div>
    </section>
  );
}
