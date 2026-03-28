export type RoomStatus = 'waiting' | 'active' | 'finished';

export interface Player {
  playerId: string;
  name: string;
}

export interface LudoPlayerState {
  tokens: number[];
}

export interface LudoGameState {
  status: 'active' | 'finished';
  playerOrder: string[];
  currentTurn: number;
  lastDice: number | null;
  winner: string | null;
  players: Record<string, LudoPlayerState>;
}

export interface RoomSnapshot {
  roomId: string;
  status: RoomStatus;
  players: Player[];
  gameState: LudoGameState | null;
}

export interface GameEvent {
  sequence: number;
  timestamp: string;
  type: string;
  playerId?: string;
  actionId?: string;
  payload?: unknown;
}

export interface ReplayResponse {
  roomId: string;
  status: RoomStatus;
  events: GameEvent[];
}

export interface AckResponse<T> {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  room?: RoomSnapshot;
  event?: GameEvent;
  gameState?: LudoGameState;
  payload?: T;
}
