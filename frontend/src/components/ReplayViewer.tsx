import { useMemo, useState } from 'react';
import type { GameEvent } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
      <h2 className="font-display text-lg font-bold text-black uppercase">Replay viewer</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={roomInput}
          onChange={(event) => onRoomInputChange(event.target.value)}
          placeholder="Room id for replay"
        />
        <Button onClick={() => void onLoadReplay(roomTarget)} disabled={!roomTarget || loadingReplay}>
          {loadingReplay ? 'Loading…' : 'Load replay'}
        </Button>
      </div>
      <p className="mt-2 text-sm font-bold text-black">Replay room: {replayRoomId || 'none loaded'}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setStepIndex(-1);
          }}
          placeholder="Search events by type / player / payload"
          aria-label="Search replay events"
        />
        <Button variant="secondary" onClick={onPrevStep} disabled={clampedStepIndex <= 0}>
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={onNextStep}
          disabled={filteredEvents.length === 0 || clampedStepIndex >= filteredEvents.length - 1}
        >
          Next
        </Button>
      </div>

      <p className="mt-3 text-sm font-bold text-black">
        Showing <strong>{filteredEvents.length}</strong> / {replayEvents.length} events
      </p>

      {activeEvent ? (
        <div className="mt-2 border-4 border-black bg-emerald-300 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]" role="status" aria-live="polite">
          Step {clampedStepIndex + 1}: #{activeEvent.sequence} {activeEvent.type} ·{' '}
          {activeEvent.playerId ?? 'system'} · {formatEventTime(activeEvent.timestamp)}
        </div>
      ) : null}

      <ol className="mt-3 grid max-h-72 gap-2 overflow-auto">
        {filteredEvents.map((event, index) => (
          <li
            key={`${event.sequence}-${event.type}-${event.timestamp}`}
            className={`border-4 border-black px-3 py-2 text-sm font-bold shadow-[2px_2px_0_0_#000] ${
              index === clampedStepIndex
                ? 'bg-blue-300 text-black'
                : 'bg-white text-black'
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
