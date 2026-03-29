import { useEffect, useMemo, useReducer, useState } from 'react';
import { GameTimeline } from './components/GameTimeline';
import { ChatPanel } from './components/ChatPanel';
import { LudoBoard } from './components/LudoBoard';
import { ReplayViewer } from './components/ReplayViewer';
import { RoomPanel } from './components/RoomPanel';
import { TurnControls } from './components/TurnControls';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { loginAccount, registerAccount } from './services/authApi';
import { fetchReplay } from './services/replayApi';
import { createSocketClient } from './services/socketClient';
import {
  gameReducer,
  getCurrentTurnPlayerId,
  getMovableTokenIndexes,
  getPlayerName,
  initialState
} from './state/gameState';
import type { AuthUser } from './types';
import './index.css';

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

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [auth, setAuth] = useState<StoredAuth | null>(() => loadStoredAuth());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomChoice, setRoomChoice] = useState<'create' | 'join'>('create');

  const socketClient = useMemo(() => createSocketClient(socketUrl), []);

  useEffect(() => {
    socketClient.setAuthToken(auth?.token ?? null);
    if (auth?.token) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
      dispatch({ type: 'connection', connected: false });
    }
  }, [socketClient, auth?.token]);

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
  }, [socketClient]);

  useEffect(() => {
    if (!state.info && !state.error) return;
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'message:clear' });
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state.info, state.error]);

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

  async function submitAuthForm() {
    setAuthBusy(true);
    setAuthError(null);

    try {
      if (isRegisterMode) {
        const result = await registerAccount(apiBaseUrl, {
          username,
          displayName,
          password
        });
        setAuth({ token: result.token, user: result.user });
      } else {
        const result = await loginAccount(apiBaseUrl, {
          username,
          password
        });
        setAuth({ token: result.token, user: result.user });
      }
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to authenticate');
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    setAuth(null);
    dispatch({ type: 'events:clear' });
    dispatch({ type: 'message:clear' });
  }

  async function createOrJoinRoom(modeOverride?: 'create' | 'join') {
    if (!auth) {
      setAuthError('Login required');
      return;
    }

    dispatch({ type: 'request:start' });

    const mode = modeOverride ?? roomChoice;

    if (mode === 'join') {
      if (!roomInput.trim()) {
        dispatch({ type: 'error', message: 'Enter a room id to join' });
        return;
      }
      const response = await socketClient.joinRoom({
        roomId: roomInput.trim(),
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
      return;
    }

    const response = await socketClient.createRoom({ playerId, name: playerName });
    if (!response.ok || !response.room) {
      dispatch({ type: 'error', message: response.error ?? 'Unable to create room' });
      return;
    }
    dispatch({ type: 'room:update', room: response.room });
    dispatch({ type: 'info', message: `Created room ${response.room.roomId}` });
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

  if (!auth) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl p-4 sm:p-6">
        <section className="panel mx-auto mt-12 max-w-xl animate-floatIn">
          <p className="border-4 border-black bg-yellow-300 px-2 py-1 inline-block text-xs font-black uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000]">LudoX online</p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase text-black">Create your player account</h1>
          <p className="mt-2 text-sm font-bold text-black/70">
            Register once, then create or join multiplayer rooms with your account identity.
          </p>

          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuthForm();
            }}
          >
            <label className="grid gap-1 text-sm font-black uppercase text-black">
              Username
              <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            {isRegisterMode ? (
              <label className="grid gap-1 text-sm font-black uppercase text-black">
                Display name
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-black uppercase text-black">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError ? (
              <p className="rounded-none border-4 border-black bg-rose-400 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]">{authError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={authBusy} type="submit">
                {authBusy ? 'Please wait…' : isRegisterMode ? 'Register and enter lobby' : 'Login'}
              </Button>
              <Button
                variant="secondary"
                disabled={authBusy}
                type="button"
                onClick={() => {
                  setIsRegisterMode((prev) => !prev);
                  setAuthError(null);
                }}
              >
                {isRegisterMode ? 'Already have an account? Login' : 'Need an account? Register'}
              </Button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 sm:p-6">
      <header className="panel animate-floatIn">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="border-4 border-black bg-emerald-300 px-2 py-1 inline-block text-xs font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_0_#000]">Realtime Multiplayer Arena</p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase text-black">LudoX Command Deck</h1>
            <p className="mt-1 text-sm font-bold text-black/70">Accounts, room play, turn controls, and replay explorer in one screen.</p>
          </div>
          <div className="rounded-none border-4 border-black bg-pink-300 px-3 py-2 text-right text-sm text-black shadow-[4px_4px_0_0_#000]">
            <p className="font-bold">{auth.user.displayName}</p>
            <p className="text-xs font-bold text-black/70">@{auth.user.username}</p>
            <Button className="mt-2" variant="outline" type="button" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <p className="rounded-none border-2 border-black bg-white px-3 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000]">
            Realtime:{' '}
            <strong className={state.isConnected ? 'text-emerald-500' : 'text-rose-500'}>
              {state.isConnected ? 'connect x O' : 'disconnect x O'}
            </strong>
          </p>
          {state.gameState?.winner ? (
            <p className="rounded-none border-2 border-black bg-emerald-400 px-3 py-1 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              Winner: {getPlayerName(state.room, state.gameState.winner)}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p className="mt-3 rounded-none border-4 border-black bg-rose-400 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.info ? (
          <p className="mt-3 rounded-none border-4 border-black bg-sky-300 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]" role="status" aria-live="polite">
            {state.info}
          </p>
        ) : null}
      </header>

      {!state.room ? (
        <section className="mt-4 panel animate-floatIn">
          <h2 className="font-display text-2xl font-black uppercase text-black">Choose room action first</h2>
          <p className="mt-1 text-sm font-bold text-black/70">
            Start by creating a new room or joining an existing room. The 4-house Ludo board appears after you join.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              className={`border-4 p-4 text-left transition shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] ${
                roomChoice === 'create'
                  ? 'border-black bg-emerald-300'
                  : 'border-black bg-white'
              }`}
              type="button"
              onClick={() => setRoomChoice('create')}
            >
              <p className="font-display text-lg font-bold text-black uppercase">Create Room</p>
              <p className="mt-1 text-sm font-bold text-black/80">Become host and share room code with others.</p>
            </button>
            <button
              className={`border-4 p-4 text-left transition shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] ${
                roomChoice === 'join'
                  ? 'border-black bg-emerald-300'
                  : 'border-black bg-white'
              }`}
              type="button"
              onClick={() => setRoomChoice('join')}
            >
              <p className="font-display text-lg font-bold text-black uppercase">Join Room</p>
              <p className="mt-1 text-sm font-bold text-black/80">Paste a room id and enter active match lobby.</p>
            </button>
          </div>

          <div className="mt-4 grid gap-3 border-4 border-black bg-yellow-100 p-4 shadow-[6px_6px_0_0_#000]">
            {roomChoice === 'join' ? (
              <label className="grid gap-1 text-sm font-black uppercase text-black">
                Room id
                <Input value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="Paste room id" />
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void createOrJoinRoom()} disabled={state.isSubmitting}>
                {state.isSubmitting ? 'Please wait…' : roomChoice === 'create' ? 'Create room now' : 'Join room now'}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <LudoBoard
              room={null}
              gameState={null}
              myPlayerId={playerId}
              movableTokens={[]}
              isMyTurn={false}
              isSubmitting={false}
              onMoveToken={async () => undefined}
            />
          </div>
        </section>
      ) : null}

      {state.room ? (
        <>
          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <div className="grid gap-4">
              <LudoBoard
                room={state.room}
                gameState={state.gameState}
                myPlayerId={playerId}
                movableTokens={movableTokens}
                isMyTurn={isMyTurn}
                isSubmitting={state.isSubmitting}
                onMoveToken={moveToken}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <GameTimeline events={state.events} room={state.room} onClear={() => dispatch({ type: 'events:clear' })} />
                <ReplayViewer
                  replayRoomId={state.replayRoomId}
                  replayEvents={state.replayEvents}
                  loadingReplay={state.loadingReplay}
                  roomInput={roomInput}
                  currentRoomId={currentRoomId}
                  onRoomInputChange={setRoomInput}
                  onLoadReplay={loadReplay}
                />
              </div>
            </div>

            <aside className="grid content-start gap-4">
              <TurnControls
                isMyTurn={isMyTurn}
                canRoll={canRoll}
                movableTokens={movableTokens}
                lastDice={state.gameState?.lastDice ?? null}
                isSubmitting={state.isSubmitting}
                currentTurnPlayerName={currentTurnPlayerName}
                onRollDice={rollDice}
                onMoveToken={moveToken}
              />

              <ChatPanel
                roomId={currentRoomId}
                playerId={playerId}
                messages={state.chatMessages}
                onSendMessage={sendChatMessage}
                isSubmitting={state.isSubmitting}
              />

              <RoomPanel
                room={state.room}
                playerId={playerId}
                playerName={playerName}
                roomInput={roomInput}
                isSubmitting={state.isSubmitting}
                onRoomInputChange={setRoomInput}
                onCreateRoom={() => createOrJoinRoom('create')}
                onJoinRoom={() => createOrJoinRoom('join')}
                onStartGame={startGame}
                onCopyRoomId={copyRoomId}
              />
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}

export default App;
