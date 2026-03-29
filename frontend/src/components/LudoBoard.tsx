import { getPlayerName } from '../state/gameState';
import type { LudoGameState, RoomSnapshot } from '../types';

interface LudoBoardProps {
  room: RoomSnapshot | null;
  gameState: LudoGameState | null;
  myPlayerId: string;
  movableTokens: number[];
  isMyTurn: boolean;
  isSubmitting: boolean;
  canRoll: boolean;
  lastDice: number | null;
  onMoveToken: (tokenIndex: number) => Promise<void>;
  onRollDice: () => Promise<void>;
}

type Coord = [number, number];

const PLAYER_STYLES = [
  { token: 'bg-rose-500 text-white border-rose-200', house: 'bg-rose-100', lane: 'bg-rose-200' },
  { token: 'bg-emerald-500 text-white border-emerald-200', house: 'bg-emerald-100', lane: 'bg-emerald-200' },
  { token: 'bg-amber-400 text-slate-900 border-amber-200', house: 'bg-amber-100', lane: 'bg-amber-200' },
  { token: 'bg-sky-500 text-white border-sky-200', house: 'bg-sky-100', lane: 'bg-sky-200' }
] as const;

const PLAYER_START_OFFSETS = [0, 13, 26, 39];

const MAIN_RING: Coord[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8],
  [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12],
  [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6],
  [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];

const SAFE_RING_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const YARD_SPOTS: Coord[][] = [
  [[10, 1], [12, 1], [10, 3], [12, 3]],
  [[10, 10], [12, 10], [10, 12], [12, 12]],
  [[1, 10], [3, 10], [1, 12], [3, 12]],
  [[1, 1], [3, 1], [1, 3], [3, 3]]
];

function rotateClockwise([x, y]: Coord): Coord {
  return [14 - y, x];
}

function rotateCoord(coord: Coord, turns: number): Coord {
  let next = coord;
  for (let i = 0; i < turns; i += 1) {
    next = rotateClockwise(next);
  }
  return next;
}

const RED_HOME_LANE: Coord[] = [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]];
const HOME_LANES: Coord[][] = [
  RED_HOME_LANE,
  RED_HOME_LANE.map((coord) => rotateCoord(coord, 1)),
  RED_HOME_LANE.map((coord) => rotateCoord(coord, 2)),
  RED_HOME_LANE.map((coord) => rotateCoord(coord, 3))
];

const DICE_FACE: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅'
};

function getCellKey([x, y]: Coord): string {
  return `${x},${y}`;
}

function getPlayerIndex(state: LudoGameState, playerId: string): number {
  const idx = state.playerOrder.indexOf(playerId);
  return idx < 0 ? 0 : idx % 4;
}

function getBoardCoord(playerIndex: number, tokenIndex: number, position: number): Coord {
  if (position < 0) {
    return YARD_SPOTS[playerIndex]?.[tokenIndex] ?? YARD_SPOTS[playerIndex]?.[0] ?? [7, 7];
  }

  if (position === 57) {
    return [7, 7];
  }

  if (position <= 50) {
    const ringIndex = (position + (PLAYER_START_OFFSETS[playerIndex] ?? 0)) % MAIN_RING.length;
    return MAIN_RING[ringIndex] ?? MAIN_RING[0];
  }

  const laneIndex = position - 51;
  return HOME_LANES[playerIndex]?.[laneIndex] ?? [7, 7];
}

function getBaseCellClass(x: number, y: number): string {
  if (x <= 5 && y <= 5) return 'bg-sky-50';
  if (x >= 9 && y <= 5) return 'bg-rose-50';
  if (x <= 5 && y >= 9) return 'bg-amber-50';
  if (x >= 9 && y >= 9) return 'bg-emerald-50';
  return 'bg-slate-50';
}

export function LudoBoard({
  room,
  gameState,
  myPlayerId,
  movableTokens,
  isMyTurn,
  isSubmitting,
  canRoll,
  lastDice,
  onMoveToken,
  onRollDice
}: LudoBoardProps) {
  const fallbackMe = myPlayerId || 'you';
  const roomPlayers = room?.players ?? [{ playerId: fallbackMe, name: 'You' }];
  const previewPlayers = [...roomPlayers];
  while (previewPlayers.length < 4) {
    previewPlayers.push({
      playerId: `preview-${previewPlayers.length}`,
      name: `Player ${previewPlayers.length + 1}`
    });
  }

  const boardPlayers = gameState ? roomPlayers : previewPlayers;
  const boardState: LudoGameState =
    gameState ?? {
      status: 'active',
      playerOrder: boardPlayers.slice(0, 4).map((player) => player.playerId),
      currentTurn: 0,
      lastDice: null,
      winner: null,
      players: Object.fromEntries(boardPlayers.slice(0, 4).map((player) => [player.playerId, { tokens: [-1, -1, -1, -1] }]))
    };

  const currentTurnPlayerId = boardState.playerOrder[boardState.currentTurn] ?? null;

  const ringPositionByKey = new Map<string, number>();
  MAIN_RING.forEach((coord, index) => {
    ringPositionByKey.set(getCellKey(coord), index);
  });

  const laneKeyByPlayerIndex = HOME_LANES.map((lane) => new Set(lane.map(getCellKey)));

  const tokensByCell = new Map<string, Array<{ playerId: string; tokenIndex: number; position: number }>>();
  boardState.playerOrder.forEach((playerId) => {
    const playerIndex = getPlayerIndex(boardState, playerId);
    const tokenPositions = boardState.players[playerId]?.tokens ?? [];
    tokenPositions.forEach((position, tokenIndex) => {
      const coord = getBoardCoord(playerIndex, tokenIndex, position);
      const key = getCellKey(coord);
      const list = tokensByCell.get(key) ?? [];
      list.push({ playerId, tokenIndex, position });
      tokensByCell.set(key, list);
    });
  });

  return (
    <section className="panel animate-floatIn">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Ludo Game Board</h2>
          <p className="text-xs text-slate-500">Click center dice on your turn, then move a highlighted token.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
            Turn: {getPlayerName(room, currentTurnPlayerId)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
            Dice: {lastDice ?? '-'}
          </span>
          {boardState.winner ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              Winner: {getPlayerName(room, boardState.winner)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid aspect-square grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] gap-[2px] rounded-xl bg-slate-200 p-[2px]">
          {Array.from({ length: 225 }, (_, index) => {
            const x = index % 15;
            const y = Math.floor(index / 15);
            const key = `${x},${y}`;
            const tokens = tokensByCell.get(key) ?? [];
            const isCenter = x === 7 && y === 7;

            let laneClass = '';
            laneKeyByPlayerIndex.forEach((laneKeys, lanePlayerIndex) => {
              if (laneKeys.has(key)) {
                laneClass = PLAYER_STYLES[lanePlayerIndex].lane;
              }
            });

            const ringPosition = ringPositionByKey.get(key);
            const isRing = ringPosition !== undefined;
            const isSafe = ringPosition !== undefined && SAFE_RING_POSITIONS.has(ringPosition);

            const cellClass = laneClass || (isRing ? 'bg-white' : getBaseCellClass(x, y));

            return (
              <div key={key} className={`relative flex items-center justify-center rounded-[3px] border border-slate-200 ${cellClass}`}>
                {isSafe ? <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-slate-400" /> : null}

                {isCenter ? (
                  <button
                    type="button"
                    className={`z-10 h-12 w-12 rounded-xl border border-slate-300 text-lg font-semibold shadow-sm transition ${
                      canRoll && !isSubmitting ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-500'
                    }`}
                    onClick={() => void onRollDice()}
                    disabled={!canRoll || isSubmitting}
                    title={isMyTurn ? 'Roll dice' : 'Wait for your turn'}
                  >
                    {Number.isInteger(lastDice) ? DICE_FACE[lastDice as number] : 'Roll'}
                  </button>
                ) : null}

                <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-[2px] p-[1px]">
                  {tokens.map((token) => {
                    const playerIndex = getPlayerIndex(boardState, token.playerId);
                    const canMove =
                      token.playerId === myPlayerId &&
                      isMyTurn &&
                      !isSubmitting &&
                      token.position !== 57 &&
                      movableTokens.includes(token.tokenIndex);

                    return (
                      <button
                        key={`${token.playerId}-${token.tokenIndex}-${key}`}
                        type="button"
                        className={`h-5 w-5 rounded-full border text-[10px] font-bold shadow-sm transition ${PLAYER_STYLES[playerIndex].token} ${
                          canMove ? 'ring-2 ring-sky-300' : 'opacity-95'
                        }`}
                        onClick={() => void onMoveToken(token.tokenIndex)}
                        disabled={!canMove}
                        title={`${getPlayerName(room, token.playerId)} token ${token.tokenIndex + 1}`}
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {boardState.playerOrder.map((playerId) => {
          const playerIndex = getPlayerIndex(boardState, playerId);
          const isTurn = playerId === currentTurnPlayerId;
          const tokens = boardState.players[playerId]?.tokens ?? [];

          return (
            <div
              key={playerId}
              className={`rounded-xl border p-3 text-xs ${PLAYER_STYLES[playerIndex].house} ${
                isTurn ? 'border-sky-300' : 'border-slate-200'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">{getPlayerName(room, playerId)}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {isTurn ? 'TURN' : 'WAIT'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tokens.map((position, tokenIndex) => (
                  <span key={`${playerId}-${tokenIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700">
                    #{tokenIndex + 1} {position < 0 ? 'Yard' : position === 57 ? 'Home' : position}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}