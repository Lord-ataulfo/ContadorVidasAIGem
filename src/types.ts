export type GameType = 'standard' | 'commander';

export interface CommanderDamage {
  [sourcePlayerId: string]: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  userCode: string;
  createdAt: string;
  provider?: 'google' | 'email';
}

export interface GameRecord {
  id: string;
  userId: string;
  gameType: GameType;
  startTime: number;
  endTime: number;
  duration: number;
  players: {
    name: string;
    life: number;
    color: string;
    isEliminated: boolean;
    uid?: string;
  }[];
  winnerName: string;
  participantUids: string[];
}

export interface Friend {
  uid: string;
  friendUid: string;
  username: string;
  userCode: string;
  addedAt: string;
}

export interface Player {
  id: number;
  name: string;
  uid?: string;
  life: number;
  color: string;
  isEliminated: boolean;
  commanderDamage: CommanderDamage;
  toxicDamage: number;
}

export interface GameState {
  gameType: GameType;
  players: Player[];
  startTime: number | null;
  isGameOver: boolean;
  winner: Player | null;
}
