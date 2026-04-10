export type GameType = 'standard' | 'commander';

export interface CommanderDamage {
  [sourcePlayerId: string]: number;
}

export interface CommanderCard {
  id: string;
  name: string;
  imageURL: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  userCode: string;
  createdAt: string;
  photoURL?: string;
  provider?: 'google' | 'email';
  commanderCard?: CommanderCard;
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
    userCode?: string;
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
  userCode?: string;
  life: number;
  color: string;
  photoURL?: string;
  isEliminated: boolean;
  commanderDamage: CommanderDamage;
  poisonDamage: number;
  commanderCard?: CommanderCard;
}

export interface GameState {
  id?: string;
  gameType: GameType;
  players: Player[];
  startTime: number | null;
  isGameOver: boolean;
  winner: Player | null;
  hostUid?: string;
  hasBeenSaved?: boolean;
  lastLifeChangeTimestamp?: number;
  isTimeout?: boolean;
  isWaitingForCommanders?: boolean;
  readyPlayers?: string[];
}

export interface ActiveGame {
  id: string;
  gameType: GameType;
  startTime: number;
  isGameOver: boolean;
  players: Player[];
  winner: Player | null;
  hostUid: string;
  participantUids: string[];
  lastUpdated: number;
  lastLifeChangeTimestamp: number;
  isWaitingForCommanders?: boolean;
  readyPlayers?: string[]; // UIDs of players who have selected their commander/ready
}
