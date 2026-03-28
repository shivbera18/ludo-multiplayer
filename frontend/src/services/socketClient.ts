import { io, type Socket } from 'socket.io-client';
import type { AckResponse, GameEvent, LudoGameState, RoomSnapshot } from '../types';

export class SocketClient {
  private readonly socket: Socket;

  constructor(url: string) {
    this.socket = io(url, {
      autoConnect: false,
      transports: ['websocket']
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  onConnect(handler: () => void) {
    this.socket.on('connect', handler);
  }

  onDisconnect(handler: () => void) {
    this.socket.on('disconnect', handler);
  }

  onRoomUpdate(handler: (room: RoomSnapshot) => void) {
    this.socket.on('room:update', handler);
    return () => this.socket.off('room:update', handler);
  }

  onGameState(handler: (room: RoomSnapshot) => void) {
    this.socket.on('game:state', handler);
    return () => this.socket.off('game:state', handler);
  }

  onGameEvent(handler: (payload: { event: GameEvent; gameState: LudoGameState }) => void) {
    this.socket.on('game:event', handler);
    return () => this.socket.off('game:event', handler);
  }

  private emitWithAck(event: string, payload: Record<string, unknown>): Promise<AckResponse<unknown>> {
    return new Promise((resolve) => {
      this.socket.timeout(5000).emit(event, payload, (error: Error | null, response?: AckResponse<unknown>) => {
        if (error) {
          resolve({ ok: false, error: error.message });
          return;
        }
        resolve(response ?? { ok: false, error: 'No response from server' });
      });
    });
  }

  createRoom(payload: { playerId: string; name: string }) {
    return this.emitWithAck('room:create', payload);
  }

  joinRoom(payload: { roomId: string; playerId: string; name: string }) {
    return this.emitWithAck('room:join', payload);
  }

  startGame(payload: { roomId: string; playerId: string }) {
    return this.emitWithAck('game:start', payload);
  }

  rollDice(payload: { roomId: string; playerId: string; actionId: string }) {
    return this.emitWithAck('game:roll', payload);
  }

  moveToken(payload: { roomId: string; playerId: string; tokenIndex: number; actionId: string }) {
    return this.emitWithAck('game:move', payload);
  }
}

export function createSocketClient(url: string): SocketClient {
  return new SocketClient(url);
}
