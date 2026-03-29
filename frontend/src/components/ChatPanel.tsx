import { useMemo, useState } from 'react';
import type { ChatMessage } from '../types';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ChatPanelProps {
  roomId: string | null;
  playerId: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isSubmitting: boolean;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ roomId, playerId, messages, onSendMessage, isSubmitting }: ChatPanelProps) {
  const [draft, setDraft] = useState('');

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.sequence - b.sequence),
    [messages]
  );

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    await onSendMessage(content);
    setDraft('');
  }

  return (
    <section className="panel animate-floatIn min-h-[320px]">
      <div className="flex items-center justify-between gap-2 border-b-4 border-black pb-2">
        <h2 className="font-display text-lg font-bold text-black uppercase">Room chat</h2>
        <span className="rounded-none border-2 border-black bg-emerald-300 px-2 py-0.5 text-[11px] font-black text-black shadow-[2px_2px_0_0_#000]">
          {roomId ? 'Live' : 'No room'}
        </span>
      </div>

      <div className="mt-3 grid max-h-64 gap-2 overflow-auto pr-1">
        {sortedMessages.length === 0 ? (
          <p className="border-4 border-black bg-yellow-100 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]">
            No messages yet. Say hi to start the table chat.
          </p>
        ) : (
          sortedMessages.map((entry) => {
            const isMine = entry.playerId === playerId;
            return (
              <article
                key={`${entry.sequence}-${entry.timestamp}-${entry.playerId}`}
                className={`max-w-[92%] border-4 border-black px-3 py-2 text-sm shadow-[4px_4px_0_0_#000] ${
                  isMine
                    ? 'ml-auto bg-blue-300 text-black'
                    : 'mr-auto bg-white text-black'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold opacity-80">
                  <span>{entry.playerName}</span>
                  <span>{formatTime(entry.timestamp)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{entry.message}</p>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-3 grid gap-2 border-t-4 border-black pt-3">
        <Textarea
          className="min-h-20 resize-none"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={320}
          placeholder={roomId ? 'Type your message...' : 'Join a room to chat'}
          disabled={!roomId || isSubmitting}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{draft.length}/320</span>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={!roomId || !draft.trim() || isSubmitting}
          >
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
