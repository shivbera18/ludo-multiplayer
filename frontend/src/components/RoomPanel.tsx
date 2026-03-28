import type { FormEvent } from 'react';
import type { RoomSnapshot } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface RoomPanelProps {
  room: RoomSnapshot | null;
  playerId: string;
  playerName: string;
  roomInput: string;
  isSubmitting: boolean;
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
    <section className="panel animate-floatIn">
      <h2 className="font-display text-lg font-bold text-slate-900">Room lobby</h2>
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Player id
          <Input value={playerId} readOnly />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Display name
          <Input value={playerName} readOnly />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Room id (optional to join)
          <Input value={roomInput} onChange={(event) => onRoomInputChange(event.target.value)} placeholder="Paste room id to join" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {hasRoomInput ? 'Join room' : 'Create room'}
          </Button>
          <Button type="button" onClick={() => void onStartGame()} disabled={!canStart || isSubmitting}>
            {isHost ? 'Start match' : 'Host starts game'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onCopyRoomId()}
            disabled={!room?.roomId || isSubmitting}
          >
            Copy room id
          </Button>
        </div>
      </form>

      <div className="mt-4 grid gap-1 text-sm text-slate-700">
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
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
            Invite another player, then start the match.
          </p>
        ) : null}
      </div>
    </section>
  );
}
