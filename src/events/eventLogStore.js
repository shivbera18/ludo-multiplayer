export class EventLogStore {
  constructor() {
    this.eventsByRoom = new Map();
  }

  append(roomId, event) {
    const entries = this.eventsByRoom.get(roomId) ?? [];
    const stored = {
      sequence: entries.length + 1,
      timestamp: new Date().toISOString(),
      ...event
    };
    entries.push(stored);
    this.eventsByRoom.set(roomId, entries);
    return stored;
  }

  getByRoom(roomId) {
    return [...(this.eventsByRoom.get(roomId) ?? [])].sort((a, b) => a.sequence - b.sequence);
  }
}
