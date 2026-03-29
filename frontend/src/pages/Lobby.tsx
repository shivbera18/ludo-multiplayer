import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomPanel } from '../components/RoomPanel';
import { Button } from '../components/ui/button';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const {
    auth,
    logout,
    state,
    playerName,
    createRoom,
    joinRoom,
    startGame,
    copyRoomId,
    clearMessages
  } = useGame();
  const navigate = useNavigate();

  const [roomInput, setRoomInput] = useState('');

  useEffect(() => {
    if (!auth) {
      navigate('/');
      return;
    }
    if (state.room?.status === 'active' || state.room?.status === 'finished') {
      navigate('/arena');
    }
  }, [auth, state.room?.status, navigate]);

  if (!auth) return null;

  const canEnterArena = state.room?.status === 'active' || state.room?.status === 'finished';

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-8">
      <header className="panel animate-floatIn">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Room Lobby
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Create or Join a Room</h1>
            <p className="mt-1 text-sm text-slate-600">
              Setup happens here. The game page is dedicated to the Ludo board only.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-800">
            <p className="font-semibold">{auth.user.displayName}</p>
            <p className="text-xs text-slate-500">@{auth.user.username}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" type="button" onClick={() => navigate('/arena')} disabled={!canEnterArena}>
                Enter Game
              </Button>
              <Button variant="outline" type="button" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>

        {state.error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.info ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700" role="status" aria-live="polite">
            {state.info}
          </p>
        ) : null}
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="panel animate-floatIn">
          <h2 className="text-lg font-semibold text-slate-900">Game Flow</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Create or join room</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Wait for players</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Start and enter game</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => navigate('/arena')} disabled={!canEnterArena}>
              Open Game Page
            </Button>
            <Button type="button" variant="secondary" onClick={clearMessages}>
              Clear Alerts
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              <strong>Current Room:</strong> {state.room?.roomId ?? 'none'}
            </p>
            <p className="mt-1">
              <strong>Status:</strong> {state.room?.status ?? 'idle'}
            </p>
            <p className="mt-1">
              <strong>Players:</strong> {state.room?.players.map((player) => player.name).join(', ') || playerName}
            </p>
          </div>
        </div>

        <aside className="grid content-start">
          <RoomPanel
            room={state.room}
            playerId={auth.user.username}
            playerName={playerName}
            roomInput={roomInput}
            isSubmitting={state.isSubmitting}
            onRoomInputChange={setRoomInput}
            onCreateRoom={createRoom}
            onJoinRoom={async () => joinRoom(roomInput)}
            onStartGame={startGame}
            onCopyRoomId={copyRoomId}
          />
        </aside>
      </section>
    </main>
  );
}
