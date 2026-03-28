import { getCurrentTurnPlayerId, getPlayerName } from '../state/gameState';
import type { LudoGameState, RoomSnapshot } from '../types';

interface LudoBoardProps {
  room: RoomSnapshot | null;
  gameState: LudoGameState | null;
  myPlayerId: string;
  movableTokens: number[];
  isMyTurn: boolean;
  isSubmitting: boolean;
  onMoveToken: (tokenIndex: number) => Promise<void>;
}

type Coord = [number, number];

const PLAYER_STYLES = [
  {
    token: 'bg-rose-500 text-white border-rose-600',
    houseBg: 'bg-rose-200/80'
  },
  {
    token: 'bg-emerald-600 text-white border-emerald-700',
    houseBg: 'bg-emerald-200/80'
  },
  {
    token: 'bg-amber-400 text-slate-900 border-amber-500',
    houseBg: 'bg-amber-200/80'
  },
  {
    token: 'bg-sky-600 text-white border-sky-700',
    houseBg: 'bg-sky-200/80'
  }
] as const;

const TRACK: Coord[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8],
  [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12],
  [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6],
  [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0], [7, 1], [7, 2], [7, 3],
  [7, 4], [7, 5]
];

const YARD_SPOTS: Coord[][] = [
  [
    [10, 1],
    [12, 1],
    [10, 3],
    [12, 3]
  ],
  [
    [10, 10],
    [12, 10],
    [10, 12],
    [12, 12]
  ],
  [
    [1, 10],
    [3, 10],
    [1, 12],
    [3, 12]
  ],
  [
    [1, 1],
    [3, 1],
    [1, 3],
    [3, 3]
  ]
];

function keyOf([x, y]: Coord): string {
  return `${x},${y}`;
}

function getPlayerIndex(gameState: LudoGameState, playerId: string): number {
  const index = gameState.playerOrder.indexOf(playerId);
  if (index < 0) return 0;
  return index % 4;
}

function getCellBackgroundClass(x: number, y: number): string {
  if (x <= 5 && y <= 5) return 'bg-sky-100';
  if (x >= 9 && y <= 5) return 'bg-rose-100';
  if (x <= 5 && y >= 9) return 'bg-amber-100';
  if (x >= 9 && y >= 9) return 'bg-emerald-100';

  const inCross = (x >= 6 && x <= 8) || (y >= 6 && y <= 8);
  if (inCross) return 'bg-white';
  return 'bg-transparent';
}

function laneClass(x: number, y: number): string {
  if (x === 7 && y >= 1 && y <= 5) return 'bg-rose-300';
  if (y === 7 && x >= 9 && x <= 13) return 'bg-emerald-300';
  if (x === 7 && y >= 9 && y <= 13) return 'bg-amber-300';
  if (y === 7 && x >= 1 && x <= 5) return 'bg-sky-300';
  return '';
}

export function LudoBoard({ room, gameState, myPlayerId, movableTokens, isMyTurn, isSubmitting, onMoveToken }: LudoBoardProps) {
  const fallbackMeId = myPlayerId || 'you';
  const basePlayers = room?.players ?? [{ playerId: fallbackMeId, name: 'You' }];
  const previewPlayers = [...basePlayers];
  const previewNames = ['Scarlet', 'Emerald', 'Amber'];
  for (let i = previewPlayers.length; i < 4; i += 1) {
    previewPlayers.push({
      playerId: `preview-bot-${i}`,
      name: previewNames[i - 1] ?? `Player ${i + 1}`
    });
  }

  const boardRoom: RoomSnapshot = {
    roomId: room?.roomId ?? 'preview-room',
    status: room?.status ?? 'waiting',
    players: gameState ? basePlayers : previewPlayers,
    gameState: gameState ?? null
  };

  const boardState: LudoGameState =
    gameState ?? {
      status: 'active',
      playerOrder: boardRoom.players.slice(0, 4).map((player) => player.playerId),
      currentTurn: 0,
      lastDice: null,
      winner: null,
      players: Object.fromEntries(
        boardRoom.players.slice(0, 4).map((player) => [player.playerId, { tokens: [-1, -1, -1, -1] }])
      )
    };

  const isLiveGame = Boolean(gameState && room);
  const currentTurnPlayerId = getCurrentTurnPlayerId(boardState);

  const tokensByCell = new Map<string, Array<{ playerId: string; tokenIndex: number; isHome: boolean; position: number }>>();

  boardState.playerOrder.forEach((playerId) => {
    const player = boardState.players[playerId];
    if (!player) return;

    const playerIndex = getPlayerIndex(boardState, playerId);
    player.tokens.forEach((position, tokenIndex) => {
      let coord: Coord;
      if (position < 0) {
        coord = YARD_SPOTS[playerIndex][tokenIndex] ?? YARD_SPOTS[playerIndex][0];
      } else if (position === 57) {
        coord = [7, 7];
      } else {
        coord = TRACK[position] ?? TRACK[0];
      }
      const key = keyOf(coord);
      const row = tokensByCell.get(key) ?? [];
      row.push({ playerId, tokenIndex, isHome: position === 57, position });
      tokensByCell.set(key, row);
    });
  });

  return (
    <section className="panel animate-floatIn">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-slate-900">Ludo King style board</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            Turn: {getPlayerName(boardRoom, currentTurnPlayerId)}
          </span>
          {boardState.winner ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Winner: {getPlayerName(boardRoom, boardState.winner)}
            </span>
          ) : null}
          {!isLiveGame ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {room ? 'Waiting for host to start' : 'Board preview: join or create room'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="mx-auto w-full max-w-[760px] rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-2 shadow-inner">
          <div className="grid aspect-square grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] gap-[2px] rounded-2xl bg-amber-200/70 p-2">
            {Array.from({ length: 15 * 15 }, (_, i) => {
              const x = i % 15;
              const y = Math.floor(i / 15);
              const key = `${x},${y}`;
              const inCenter = x >= 6 && x <= 8 && y >= 6 && y <= 8;
              const lane = laneClass(x, y);
              const tokens = tokensByCell.get(key) ?? [];

              return (
                <div
                  key={key}
                  className={`relative flex items-center justify-center overflow-hidden rounded-[4px] border border-amber-300/80 ${getCellBackgroundClass(
                    x,
                    y
                  )} ${lane}`}
                >
                  {inCenter ? (
                    <div className="text-[10px] font-extrabold tracking-wide text-slate-700">FINISH</div>
                  ) : null}

                  <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-[2px] p-[1px]">
                    {tokens.map((token) => {
                      const pIndex = getPlayerIndex(boardState, token.playerId);
                      const style = PLAYER_STYLES[pIndex];
                      const isMine = token.playerId === myPlayerId;
                      const canMove =
                        isLiveGame &&
                        isMine &&
                        isMyTurn &&
                        movableTokens.includes(token.tokenIndex) &&
                        !isSubmitting &&
                        token.position !== 57;

                      return (
                        <button
                          key={`${token.playerId}-${token.tokenIndex}-${key}`}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-extrabold shadow-sm transition ${
                            style.token
                          } ${canMove ? 'ring-2 ring-yellow-300 hover:scale-110' : 'opacity-95'}`}
                          title={`${getPlayerName(boardRoom, token.playerId)} token ${token.tokenIndex + 1}`}
                          type="button"
                          disabled={!canMove}
                          onClick={() => void onMoveToken(token.tokenIndex)}
                        >
                          {token.tokenIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <div className="rounded-2xl border border-amber-200 bg-white/90 p-3">
            <h3 className="font-display text-sm font-bold text-slate-800">Player houses</h3>
            <div className="mt-2 grid gap-2">
              {boardState.playerOrder.map((playerId) => {
                const pIndex = getPlayerIndex(boardState, playerId);
                const style = PLAYER_STYLES[pIndex];
                const isTurn = playerId === currentTurnPlayerId;
                const isWinner = boardState.winner === playerId;
                const tokens = boardState.players[playerId]?.tokens ?? [];

                return (
                  <article
                    key={playerId}
                    className={`rounded-xl border p-2 ${style.houseBg} ${
                      isTurn ? 'border-slate-700' : isWinner ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{getPlayerName(boardRoom, playerId)}</p>
                      <span className="text-[11px] font-bold text-slate-700">{isTurn ? 'TURN' : isWinner ? 'WIN' : 'PLAY'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tokens.map((position, idx) => (
                        <span key={`${playerId}-${idx}`} className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          #{idx + 1} {position < 0 ? 'Yard' : position === 57 ? 'Home' : `P${position}`}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
            <p className="font-semibold">Move hint</p>
            <p className="mt-1">Roll dice, then tap any highlighted yellow-ring chip on the board to move.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
