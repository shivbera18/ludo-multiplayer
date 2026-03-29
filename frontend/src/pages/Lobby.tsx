import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LudoBoard } from '../components/LudoBoard';
import { RoomPanel } from '../components/RoomPanel';
import { Button } from '../components/ui/button';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const {
    auth,
    logout,
    state,
    playerId,
    playerName,
    movableTokens,
    isMyTurn,
    moveToken,
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
    <main className="mx-auto min-h-screen max-w-7xl p-4 sm:p-6">
      <header className="panel animate-floatIn">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-block border-4 border-black bg-emerald-300 px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_0_#000]">
              Room Staging
            </p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase text-black">Lobby Control Deck</h1>
            <p className="mt-1 text-sm font-bold text-black/70">
              Host your room, invite players, and launch the match when your squad is ready.
            </p>
          </div>
          <div className="rounded-none border-4 border-black bg-yellow-300 px-3 py-2 text-right text-sm text-black shadow-[4px_4px_0_0_#000]">
            <p className="font-bold">{auth.user.displayName}</p>
            <p className="text-xs font-bold text-black/70">@{auth.user.username}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" type="button" onClick={() => navigate('/arena')} disabled={!canEnterArena}>
                Arena
              </Button>
              <Button variant="outline" type="button" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
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

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
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

          <div className="panel animate-floatIn">
            <h2 className="font-display text-lg font-bold uppercase text-black">Flow</h2>
            <p className="mt-2 text-sm font-bold text-black/70">
              1. Create or join a room. 2. Wait for at least two players. 3. Host starts the game. 4. Move to arena for live turns.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate('/arena')} disabled={!canEnterArena}>
                Enter Arena
              </Button>
              <Button type="button" variant="secondary" onClick={clearMessages}>
                Dismiss Alerts
              </Button>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <RoomPanel
            room={state.room}
            playerId={playerId}
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
