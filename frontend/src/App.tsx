import { useEffect, useMemo, useReducer, useState } from 'react';
import { GameTimeline } from './components/GameTimeline';
import { LudoBoard } from './components/LudoBoard';
import { ReplayViewer } from './components/ReplayViewer';
import { RoomPanel } from './components/RoomPanel';
import { TurnControls } from './components/TurnControls';
import { fetchReplay } from './services/replayApi';
import { createSocketClient } from './services/socketClient';
import {
  gameReducer,
  getCurrentTurnPlayerId,
  getMovableTokenIndexes,
  getPlayerName,
  initialState
} from './state/gameState';
import './index.css';

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function generateActionId(prefix: string) {
  if ('randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [playerId, setPlayerId] = useState('player-1');
  const [playerName, setPlayerName] = useState('Player One');
  const [roomInput, setRoomInput] = useState('');

  const socketClient = useMemo(() => createSocketClient(socketUrl), []);

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

    socketClient.connect();

    return () => {
      removeRoomUpdate();
      removeGameState();
      removeGameEvent();
      socketClient.disconnect();
    };
  }, [socketClient]);

  const currentRoomId = state.room?.roomId ?? null;
  const currentTurnPlayerId = getCurrentTurnPlayerId(state.gameState);
  const currentTurnPlayerName = getPlayerName(state.room, currentTurnPlayerId);
  const isMyTurn = currentTurnPlayerId === playerId;
  const movableTokens = getMovableTokenIndexes(state.gameState, playerId);
  const canRoll = Boolean(state.room?.roomId && isMyTurn && state.gameState?.lastDice === null);

  useEffect(() => {
    if (!state.info && !state.error) return;
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'message:clear' });
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state.info, state.error]);

  async function createOrJoinRoom() {
    dispatch({ type: 'request:start' });
    const name = playerName.trim() || playerId;

    if (roomInput.trim()) {
      const response = await socketClient.joinRoom({
        roomId: roomInput.trim(),
        playerId,
        name
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

    const response = await socketClient.createRoom({ playerId, name });
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

  return (
    <main className="layout">
      <header>
        <h1>LudoX frontend client</h1>
        <p className="subtitle">Realtime room play, clear turn flow, and replay exploration.</p>
        <div className="status-line">
          <p>
            Realtime:{' '}
            <strong className={state.isConnected ? 'connected' : 'disconnected'}>
              {state.isConnected ? 'connected' : 'disconnected'}
            </strong>
          </p>
          {state.gameState?.winner ? (
            <p className="winner-banner">Winner: {getPlayerName(state.room, state.gameState.winner)}</p>
          ) : null}
        </div>
        {state.error ? (
          <p className="status error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.info ? (
          <p className="status info" role="status" aria-live="polite">
            {state.info}
          </p>
        ) : null}
      </header>

      <section className="grid">
        <RoomPanel
          room={state.room}
          playerId={playerId}
          playerName={playerName}
          roomInput={roomInput}
          isSubmitting={state.isSubmitting}
          onPlayerIdChange={setPlayerId}
          onPlayerNameChange={setPlayerName}
          onRoomInputChange={setRoomInput}
          onCreateRoom={createOrJoinRoom}
          onJoinRoom={createOrJoinRoom}
          onStartGame={startGame}
          onCopyRoomId={copyRoomId}
        />

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
      </section>

      <LudoBoard room={state.room} gameState={state.gameState} myPlayerId={playerId} />

      <section className="grid">
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
      </section>
    </main>
  );
}

export default App;
