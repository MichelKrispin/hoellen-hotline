// Public room discovery needs a separate service. The static MVP does not instantiate one.
export interface RoomRequest {
  mode: string;
  contentHash: string;
}
export interface RoomTicket {
  roomId: string;
  expiresAt: number;
}
export interface MatchPreferences {
  mode: string;
}
export interface MatchmakingProvider {
  createRoom(request: RoomRequest): Promise<RoomTicket>;
  joinRoom(code: string): Promise<RoomTicket>;
  quickMatch(preferences: MatchPreferences): Promise<RoomTicket>;
  leave(ticket: RoomTicket): Promise<void>;
}
export const roomService: MatchmakingProvider | null = null;
