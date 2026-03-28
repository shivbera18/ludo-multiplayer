import type { ChatMessage, GameEvent, LudoGameState, RoomSnapshot } from '../types';

export interface FrontendGameState {
  isConnected: boolean;
  room: RoomSnapshot | null;
  gameState: LudoGameState | null;
  events: GameEvent[];
  chatMessages: ChatMessage[];
  replayEvents: GameEvent[];
  replayRoomId: string;
  loadingReplay: boolean;
  error: string | null;
  info: string | null;
  isSubmitting: boolean;
}

export const initialState: FrontendGameState = {
  isConnected: false,
  room: null,
  gameState: null,
  events: [],
  chatMessages: [],
  replayEvents: [],
  replayRoomId: '',
  loadingReplay: false,
  error: null,
  info: null,
  isSubmitting: false
};

type GameAction =
  | { type: 'connection'; connected: boolean }
  | { type: 'request:start' }
  | { type: 'request:end' }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string | null }
  | { type: 'message:clear'; scope?: 'all' | 'error' | 'info' }
  | { type: 'room:update'; room: RoomSnapshot }
  | { type: 'game:update'; gameState: LudoGameState }
  | { type: 'event:add'; event: GameEvent; gameState?: LudoGameState }
  | { type: 'chat:add'; message: ChatMessage }
  | { type: 'chat:clear' }
  | { type: 'events:clear' }
  | { type: 'replay:loading'; roomId: string }
  | { type: 'replay:loaded'; roomId: string; events: GameEvent[] };

export function gameReducer(state: FrontendGameState, action: GameAction): FrontendGameState {
  switch (action.type) {
    case 'connection':
      return {
        ...state,
        isConnected: action.connected,
        error: action.connected ? state.error : 'Disconnected from realtime server.'
      };
    case 'request:start':
      return { ...state, isSubmitting: true, error: null, info: null };
    case 'request:end':
      return { ...state, isSubmitting: false };
    case 'error':
      return { ...state, error: action.message, isSubmitting: false };
    case 'info':
      return { ...state, info: action.message };
    case 'message:clear': {
      const scope = action.scope ?? 'all';
      if (scope === 'error') return { ...state, error: null };
      if (scope === 'info') return { ...state, info: null };
      return { ...state, error: null, info: null };
    }
    case 'room:update':
      return {
        ...state,
        room: action.room,
        gameState: action.room.gameState,
        chatMessages: state.room?.roomId === action.room.roomId ? state.chatMessages : [],
        error: null
      };
    case 'game:update':
      return {
        ...state,
        gameState: action.gameState,
        room: state.room
          ? {
              ...state.room,
              status: action.gameState.status === 'finished' ? 'finished' : 'active',
              gameState: action.gameState
            }
          : state.room
      };
    case 'event:add':
      return {
        ...state,
        events: [...state.events, action.event].slice(-200),
        gameState: action.gameState ?? state.gameState,
        info: describeGameEvent(action.event)
      };
    case 'chat:add':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message].slice(-120)
      };
    case 'chat:clear':
      return {
        ...state,
        chatMessages: []
      };
    case 'events:clear':
      return {
        ...state,
        events: []
      };
    case 'replay:loading':
      return {
        ...state,
        loadingReplay: true,
        replayRoomId: action.roomId,
        error: null
      };
    case 'replay:loaded':
      return {
        ...state,
        loadingReplay: false,
        replayRoomId: action.roomId,
        replayEvents: action.events,
        info: `Loaded ${action.events.length} replay events`
      };
    default:
      return state;
  }
}

export function getCurrentTurnPlayerId(gameState: LudoGameState | null): string | null {
  if (!gameState) return null;
  return gameState.playerOrder[gameState.currentTurn] ?? null;
}

export function getMovableTokenIndexes(gameState: LudoGameState | null, playerId: string): number[] {
  if (!gameState || !Number.isInteger(gameState.lastDice)) return [];
  const dice = gameState.lastDice as number;
  const positions = gameState.players[playerId]?.tokens;
  if (!positions) return [];

  return positions
    .map((position, tokenIndex) => ({ position, tokenIndex }))
    .filter(({ position }) => {
      if (position === 57) return false;
      if (position === -1) return dice === 6;
      return position + dice <= 57;
    })
    .map(({ tokenIndex }) => tokenIndex);
}

export function humanTokenPosition(position: number): string {
  if (position < 0) return 'YARD';
  if (position === 57) return 'HOME';
  return position.toString();
}

export function describeGameEvent(event: GameEvent): string {
  const actor = event.playerId ? ` by ${event.playerId}` : '';
  return `${event.type} (#${event.sequence})${actor}`;
}

export function getPlayerName(room: RoomSnapshot | null, playerId: string | null): string {
  if (!room || !playerId) return '—';
  const player = room.players.find((entry) => entry.playerId === playerId);
  return player?.name ?? playerId;
}
