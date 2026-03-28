import { useMemo, useState } from 'react';
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

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString();
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
  const [search, setSearch] = useState('');
  const [stepIndex, setStepIndex] = useState(-1);
  const roomTarget = roomInput.trim() || currentRoomId || '';

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return replayEvents;
    return replayEvents.filter((event) => {
      const payloadText = event.payload ? JSON.stringify(event.payload).toLowerCase() : '';
      return [
        event.type.toLowerCase(),
        (event.playerId ?? '').toLowerCase(),
        event.sequence.toString(),
        payloadText
      ].some((entry) => entry.includes(query));
    });
  }, [replayEvents, search]);

  const clampedStepIndex =
    filteredEvents.length === 0 ? -1 : Math.min(Math.max(stepIndex, 0), filteredEvents.length - 1);
  const activeEvent = clampedStepIndex >= 0 ? filteredEvents[clampedStepIndex] : null;

  function onPrevStep() {
    if (filteredEvents.length === 0) return;
    setStepIndex((prev) => (prev <= 0 ? 0 : prev - 1));
  }

  function onNextStep() {
    if (filteredEvents.length === 0) return;
    setStepIndex((prev) => {
      const base = prev < 0 ? 0 : prev + 1;
      return Math.min(base, filteredEvents.length - 1);
    });
  }

  return (
    <section className="panel animate-floatIn">
      <h2 className="font-display text-lg font-bold text-slate-900">Replay viewer</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="input"
          value={roomInput}
          onChange={(event) => onRoomInputChange(event.target.value)}
          placeholder="Room id for replay"
        />
        <button className="btn-primary" onClick={() => void onLoadReplay(roomTarget)} disabled={!roomTarget || loadingReplay}>
          {loadingReplay ? 'Loading…' : 'Load replay'}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-700">Replay room: {replayRoomId || 'none loaded'}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="input"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setStepIndex(-1);
          }}
          placeholder="Search events by type / player / payload"
          aria-label="Search replay events"
        />
        <button className="btn-secondary" onClick={onPrevStep} disabled={clampedStepIndex <= 0}>
          Previous
        </button>
        <button
          className="btn-secondary"
          onClick={onNextStep}
          disabled={filteredEvents.length === 0 || clampedStepIndex >= filteredEvents.length - 1}
        >
          Next
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-700">
        Showing <strong>{filteredEvents.length}</strong> / {replayEvents.length} events
      </p>

      {activeEvent ? (
        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900" role="status" aria-live="polite">
          Step {clampedStepIndex + 1}: #{activeEvent.sequence} {activeEvent.type} ·{' '}
          {activeEvent.playerId ?? 'system'} · {formatEventTime(activeEvent.timestamp)}
        </div>
      ) : null}

      <ol className="mt-3 grid max-h-72 gap-2 overflow-auto">
        {filteredEvents.map((event, index) => (
          <li
            key={`${event.sequence}-${event.type}-${event.timestamp}`}
            className={`rounded-lg border px-3 py-2 text-sm ${
              index === clampedStepIndex
                ? 'border-sky-300 bg-sky-50 text-sky-900'
                : 'border-amber-200 bg-white text-slate-700'
            }`}
          >
            <strong>#{event.sequence}</strong> {event.type} · {event.playerId ?? 'system'} ·{' '}
            {formatEventTime(event.timestamp)}
          </li>
        ))}
      </ol>
    </section>
  );
}
