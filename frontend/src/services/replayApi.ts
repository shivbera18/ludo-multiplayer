import type { GameEvent, ReplayResponse } from '../types';

export function normalizeReplayEvents(events: GameEvent[]): GameEvent[] {
  return [...events].sort((a, b) => a.sequence - b.sequence);
}

export async function fetchReplay(baseUrl: string, roomId: string): Promise<ReplayResponse> {
  const response = await fetch(`${baseUrl}/api/replay/${roomId}`);
  if (!response.ok) {
    throw new Error(`Replay API error (${response.status})`);
  }

  const replay = (await response.json()) as ReplayResponse;
  return {
    ...replay,
    events: normalizeReplayEvents(replay.events ?? [])
  };
}
