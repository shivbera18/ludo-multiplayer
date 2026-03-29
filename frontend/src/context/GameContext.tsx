import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { fetchReplay } from '../services/replayApi';
import { loginAccount, registerAccount } from '../services/authApi';
import { createSocketClient } from '../services/socketClient';
import {
  gameReducer,
  getCurrentTurnPlayerId,
  getMovableTokenIndexes,
  getPlayerName,
  initialState
} from '../state/gameState';
import type { FrontendGameState } from '../state/gameState';
import type { AuthUser } from '../types';

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const authStorageKey = 'ludox-auth';

function generateActionId(prefix: string) {
  if ('randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function loadStoredAuth(): StoredAuth | null {
  const stored = localStorage.getItem(authStorageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredAuth;
  } catch {
    return null;
  }
}

interface GameContextValue {
  auth: StoredAuth | null;
  authBusy: boolean;
  authError: string | null;
  state: FrontendGameState;
  playerId: string;
  playerName: string;
  currentRoomId: string | null;
  currentTurnPlayerName: string;
  isMyTurn: boolean;
  movableTokens: number[];
  canRoll: boolean;
  register: (payload: { username: string; displayName: string; password: string }) => Promise<void>;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  clearMessages: () => void;
  clearEvents: () => void;
  createRoom: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  startGame: () => Promise<void>;
  rollDice: () => Promise<void>;
  moveToken: (tokenIndex: number) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  loadReplay: (roomId: string) => Promise<void>;
  copyRoomId: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

function useGameStateSnapshot() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return { state, dispatch };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => loadStoredAuth());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { state, dispatch } = useGameStateSnapshot();

  const [socketClient] = useState(() => createSocketClient(socketUrl));

  useEffect(() => {
    socketClient.setAuthToken(auth?.token ?? null);
    if (auth?.token) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
      dispatch({ type: 'connection', connected: false });
    }
  }, [socketClient, auth?.token, dispatch]);

  useEffect(() => {
    socketClient.onConnect(() => dispatch({ type: 'connection', connected: true }));
    socketClient.onDisconnect(() => dispatch({ type: 'connection', connected: false }));

    const removeRoomUpdate = socketClient.onRoomUpdate((room) => {
      dispatch({ type: 'room:update', room });
    });

    const removeGameState = socketClient.onGameState((room) => {
      dispatch({ type: 'room:update', room });
      if (room.gameState) {
        dispatch({ type: 'game:update', gameState: room.gameState });
      }
    });

    const removeGameEvent = socketClient.onGameEvent(({ event, gameState }) => {
      dispatch({ type: 'event:add', event, gameState });
    });

    const removeChatMessage = socketClient.onChatMessage((message) => {
      dispatch({ type: 'chat:add', message });
    });

    return () => {
      removeRoomUpdate();
      removeGameState();
      removeGameEvent();
      removeChatMessage();
      socketClient.disconnect();
    };
  }, [socketClient, dispatch]);

  useEffect(() => {
    if (!state.info && !state.error) return;
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'message:clear' });
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state.info, state.error, dispatch]);

  useEffect(() => {
    if (!auth) {
      localStorage.removeItem(authStorageKey);
      return;
    }
    localStorage.setItem(authStorageKey, JSON.stringify(auth));
  }, [auth]);

  const playerId = auth?.user.username ?? '';
  const playerName = auth?.user.displayName ?? '';
  const currentRoomId = state.room?.roomId ?? null;
  const currentTurnPlayerId = getCurrentTurnPlayerId(state.gameState);
  const currentTurnPlayerName = getPlayerName(state.room, currentTurnPlayerId);
  const isMyTurn = currentTurnPlayerId === playerId;
  const movableTokens = getMovableTokenIndexes(state.gameState, playerId);
  const canRoll = Boolean(state.room?.roomId && isMyTurn && state.gameState?.lastDice === null);

  async function register(payload: { username: string; displayName: string; password: string }) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await registerAccount(apiBaseUrl, payload);
      setAuth({ token: result.token, user: result.user });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to register');
    } finally {
      setAuthBusy(false);
    }
  }

  async function login(payload: { username: string; password: string }) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await loginAccount(apiBaseUrl, payload);
      setAuth({ token: result.token, user: result.user });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to login');
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    dispatch({ type: 'session:reset' });
    setAuth(null);
    setAuthError(null);
  }

  function clearMessages() {
    dispatch({ type: 'message:clear' });
  }

  function clearEvents() {
    dispatch({ type: 'events:clear' });
  }

  async function createRoom() {
    if (!auth) {
      setAuthError('Login required');
      return;
    }

    dispatch({ type: 'request:start' });
    const response = await socketClient.createRoom({ playerId, name: playerName });

    if (!response.ok || !response.room) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to create room' });
      return;
    }

    dispatch({ type: 'room:update', room: response.room });
    dispatch({ type: 'info', message: `Created room ${response.room.roomId}` });
    dispatch({ type: 'request:end' });
  }

  async function joinRoom(roomId: string) {
    if (!auth) {
      setAuthError('Login required');
      return;
    }

    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      dispatch({ type: 'error', message: 'Enter a room id to join' });
      return;
    }

    dispatch({ type: 'request:start' });
    const response = await socketClient.joinRoom({
      roomId: trimmedRoomId,
      playerId,
      name: playerName
    });

    if (!response.ok || !response.room) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to join room' });
      return;
    }

    dispatch({ type: 'room:update', room: response.room });
    dispatch({ type: 'info', message: `Joined room ${response.room.roomId}` });
    dispatch({ type: 'request:end' });
  }

  async function startGame() {
    if (!currentRoomId) return;
    dispatch({ type: 'request:start' });
    const response = await socketClient.startGame({
      roomId: currentRoomId,
      playerId
    });

    if (!response.ok || !response.room) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to start game' });
      return;
    }

    dispatch({ type: 'room:update', room: response.room });
    if (response.room.gameState) {
      dispatch({ type: 'game:update', gameState: response.room.gameState });
    }
    dispatch({ type: 'info', message: 'Game started' });
    dispatch({ type: 'request:end' });
  }

  async function rollDice() {
    if (!currentRoomId) return;
    dispatch({ type: 'request:start' });
    const response = await socketClient.rollDice({
      roomId: currentRoomId,
      playerId,
      actionId: generateActionId('roll')
    });

    if (!response.ok) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to roll dice' });
      return;
    }

    if (response.duplicate) {
      dispatch({ type: 'info', message: 'Duplicate roll ignored by server.' });
      dispatch({ type: 'request:end' });
      return;
    }

    if (response.event) {
      dispatch({ type: 'event:add', event: response.event, gameState: response.gameState });
    }
    dispatch({ type: 'request:end' });
  }

  async function moveToken(tokenIndex: number) {
    if (!currentRoomId) return;
    dispatch({ type: 'request:start' });

    const response = await socketClient.moveToken({
      roomId: currentRoomId,
      playerId,
      tokenIndex,
      actionId: generateActionId('move')
    });

    if (!response.ok) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to move token' });
      return;
    }

    if (response.duplicate) {
      dispatch({ type: 'info', message: 'Duplicate move ignored by server.' });
      dispatch({ type: 'request:end' });
      return;
    }

    if (response.event) {
      dispatch({ type: 'event:add', event: response.event, gameState: response.gameState });
    }
    dispatch({ type: 'request:end' });
  }

  async function sendChatMessage(message: string) {
    if (!currentRoomId) return;

    const response = await socketClient.sendChatMessage({
      roomId: currentRoomId,
      message,
      playerId,
      name: playerName
    });

    if (!response.ok) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to send message' });
    }
  }

  async function loadReplay(roomId: string) {
    if (!roomId.trim()) return;
    dispatch({ type: 'replay:loading', roomId });
    try {
      const replay = await fetchReplay(apiBaseUrl, roomId.trim());
      dispatch({ type: 'replay:loaded', roomId: replay.roomId, events: replay.events });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load replay';
      dispatch({ type: 'error', message });
    }
  }

  async function copyRoomId() {
    if (!currentRoomId) return;
    try {
      await navigator.clipboard.writeText(currentRoomId);
      dispatch({ type: 'info', message: `Copied room id ${currentRoomId}` });
    } catch {
      dispatch({ type: 'error', message: 'Clipboard not available in this browser context.' });
    }
  }

  const value: GameContextValue = {
    auth,
    authBusy,
    authError,
    state,
    playerId,
    playerName,
    currentRoomId,
    currentTurnPlayerName,
    isMyTurn,
    movableTokens,
    canRoll,
    register,
    login,
    logout,
    clearMessages,
    clearEvents,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    moveToken,
    sendChatMessage,
    loadReplay,
    copyRoomId
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used inside GameProvider');
  }
  return context;
}
