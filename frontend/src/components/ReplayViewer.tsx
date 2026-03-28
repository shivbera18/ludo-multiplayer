import type { GameEvent } from '../types';

interface ReplayViewerProps {
  replayRoomId: string;
  replayEvents: GameEvent[];
  loadingReplay: boolean;
  roomInput: string;
  currentRoomId: string | null;
  onRoomInputChange: (value: string) => void;
  onLoadReplay: (roomId: string) => Promise<void>;
}

export function ReplayViewer({
  replayRoomId,
  replayEvents,
  loadingReplay,
  roomInput,
  currentRoomId,
  onRoomInputChange,
  onLoadReplay
}: ReplayViewerProps) {
  const roomTarget = roomInput.trim() || currentRoomId || '';

  return (
    <section className="panel">
      <h2>Replay viewer</h2>
      <div className="row">
        <input
          value={roomInput}
          onChange={(event) => onRoomInputChange(event.target.value)}
          placeholder="Room id for replay"
        />
        <button
          onClick={() => void onLoadReplay(roomTarget)}
          disabled={!roomTarget || loadingReplay}
        >
          {loadingReplay ? 'Loading…' : 'Load replay'}
        </button>
      </div>
      <p>Replay room: {replayRoomId || 'none loaded'}</p>
      <ol className="timeline">
        {replayEvents.map((event) => (
          <li key={`${event.sequence}-${event.type}-${event.timestamp}`}>
            <strong>#{event.sequence}</strong> {event.type} · {event.playerId ?? 'system'} ·{' '}
            {new Date(event.timestamp).toLocaleTimeString()}
          </li>
        ))}
      </ol>
    </section>
  );
}
