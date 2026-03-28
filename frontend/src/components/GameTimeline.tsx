import { useMemo, useState } from 'react';
import { describeGameEvent, getPlayerName } from '../state/gameState';
import type { GameEvent, RoomSnapshot } from '../types';

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
    <section className="panel panel-feed">
      <div className="panel-heading">
        <h2 className="panel-title">Game timeline</h2>
        <div className="row">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter events"
            aria-label="Filter game events"
          />
          <button
            className="secondary-button"
            type="button"
            onClick={onClear}
            disabled={events.length === 0}
          >
            Clear feed
          </button>
        </div>
      </div>

      <p>
        Feed events: <strong>{filteredEvents.length}</strong> / {events.length}
      </p>

      <ol className="timeline" aria-live="polite">
        {filteredEvents.length === 0 ? (
          <li className="timeline-item muted">No events yet.</li>
        ) : (
          filteredEvents
            .slice()
            .reverse()
            .map((event) => (
              <li key={`${event.sequence}-${event.type}-${event.timestamp}`} className="timeline-item">
                <strong>#{event.sequence}</strong> {describeGameEvent(event)} ·{' '}
                {getPlayerName(room, event.playerId ?? null)} · {eventTimestampLabel(event.timestamp)}
              </li>
            ))
        )}
      </ol>
    </section>
  );
}
