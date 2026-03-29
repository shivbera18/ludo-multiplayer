import { useMemo, useState } from 'react';
import { describeGameEvent, getPlayerName } from '../state/gameState';
import type { GameEvent, RoomSnapshot } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface GameTimelineProps {
  events: GameEvent[];
  room: RoomSnapshot | null;
  onClear: () => void;
}

function eventTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString();
}

export function GameTimeline({ events, room, onClear }: GameTimelineProps) {
  const [filter, setFilter] = useState('');

  const filteredEvents = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) => {
      const playerName = getPlayerName(room, event.playerId ?? null).toLowerCase();
      const payloadText = event.payload ? JSON.stringify(event.payload).toLowerCase() : '';
      return [event.type.toLowerCase(), playerName, (event.playerId ?? '').toLowerCase(), payloadText].some(
        (value) => value.includes(query)
      );
    });
  }, [events, filter, room]);

  return (
    <section className="panel animate-floatIn">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-black uppercase">Game timeline</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter events"
            aria-label="Filter game events"
          />
          <Button
            variant="secondary"
            type="button"
            onClick={onClear}
            disabled={events.length === 0}
          >
            Clear feed
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-black">
        Feed events: <strong>{filteredEvents.length}</strong> / {events.length}
      </p>

      <ol className="mt-3 grid max-h-72 gap-2 overflow-auto" aria-live="polite">
        {filteredEvents.length === 0 ? (
          <li className="border-4 border-black bg-white px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]">No events yet.</li>
        ) : (
          filteredEvents
            .slice()
            .reverse()
            .map((event) => (
              <li
                key={`${event.sequence}-${event.type}-${event.timestamp}`}
                className="border-4 border-black bg-white px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]"
              >
                <strong>#{event.sequence}</strong> {describeGameEvent(event)} ·{' '}
                {getPlayerName(room, event.playerId ?? null)} · {eventTimestampLabel(event.timestamp)}
              </li>
            ))
        )}
      </ol>
    </section>
  );
}
