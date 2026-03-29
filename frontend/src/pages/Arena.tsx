import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatPanel } from '../components/ChatPanel';
import { GameTimeline } from '../components/GameTimeline';
import { LudoBoard } from '../components/LudoBoard';
import { ReplayViewer } from '../components/ReplayViewer';
import { TurnControls } from '../components/TurnControls';
import { Button } from '../components/ui/button';
import { useGame } from '../context/GameContext';

export default function Arena() {
  const {
    auth,
    logout,
    state,
    playerId,
    movableTokens,
    isMyTurn,
    canRoll,
    currentTurnPlayerName,
    currentRoomId,
    rollDice,
    moveToken,
    sendChatMessage,
    loadReplay,
    clearEvents
  } = useGame();

  const navigate = useNavigate();
  const [replayRoomInput, setReplayRoomInput] = useState('');

  useEffect(() => {
    if (!auth) {
      navigate('/');
      return;
    }
    if (!state.room) {
      navigate('/lobby');
      return;
    }
    if (state.room.status === 'waiting') {
      navigate('/lobby');
    }
  }, [auth, state.room, navigate]);

  if (!auth) return null;

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] p-4 sm:p-6">
      <header className="panel animate-floatIn">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-block border-4 border-black bg-rose-400 px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_0_#000]">
              Live Match
            </p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase text-black">Arena Gameplay</h1>
            <p className="mt-1 text-sm font-bold text-black/70">
              Real-time turns, tactical movement, chat, event feed, and replay analysis in one battle station.
            </p>
          </div>
          <div className="rounded-none border-4 border-black bg-emerald-300 px-3 py-2 text-right text-sm text-black shadow-[4px_4px_0_0_#000]">
            <p className="font-bold">Room: {currentRoomId ?? 'none'}</p>
            <p className="text-xs font-bold text-black/70">Player: {auth.user.displayName}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" type="button" onClick={() => navigate('/lobby')}>
                Lobby
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

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
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
            <GameTimeline events={state.events} room={state.room} onClear={clearEvents} />
            <ReplayViewer
              replayRoomId={state.replayRoomId}
              replayEvents={state.replayEvents}
              loadingReplay={state.loadingReplay}
              roomInput={replayRoomInput || currentRoomId || ''}
              currentRoomId={currentRoomId}
              onRoomInputChange={setReplayRoomInput}
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
        </aside>
      </section>
    </main>
  );
}
