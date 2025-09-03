export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  isVerified: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  role: 'user' | 'admin' | 'moderator';
  balance: number;
  demoBalance: number;
  lastLogin: Date;
  lastLoginDevice: string;
  loginHistory: LoginRecord[];
  preferences: UserPreferences;
  stats: UserStats;
  luxurySearches: LuxurySearch[];
  searchPatterns: SearchPatterns;
  kyc: KYCInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRecord {
  device: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  language: string;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalBets: number;
  totalWinnings: number;
  biggestWin: number;
  averageBet: number;
}

export interface LuxurySearch {
  query: string;
  timestamp: Date;
  category: string;
}

export interface SearchPatterns {
  luxuryScore: number;
  gamblingFrequency: number;
  highValueInterests: string[];
}

export interface KYCInfo {
  isVerified: boolean;
  documents: KYCDocument[];
  verifiedAt?: Date;
}

export interface KYCDocument {
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
}

export interface Game {
  id: string;
  userId: string;
  gameType: 'minesweeper' | 'demo';
  betAmount: number;
  gridSize: number;
  bombCount: number;
  bombPositions: number[];
  revealedTiles: number[];
  currentMultiplier: number;
  maxMultiplier: number;
  status: 'active' | 'cashed_out' | 'exploded' | 'abandoned';
  result: 'win' | 'loss' | 'pending';
  winnings: number;
  profit: number;
  gameConfig: GameConfig;
  device: string;
  ip: string;
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  actions: GameAction[];
  tilesRevealed: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  createdAt: Date;
  updatedAt: Date;
}

export interface GameConfig {
  baseMultiplier: number;
  bombPercentage: number;
  houseEdge: number;
  luxuryBonus: number;
}

export interface GameAction {
  action: 'reveal' | 'cashout' | 'explode';
  tileIndex?: number;
  timestamp: Date;
  multiplier: number;
}

export interface GameState {
  currentGame: Game | null;
  games: Game[];
  loading: boolean;
  error: string | null;
}

export interface GameStartParams {
  betAmount: number;
  gridSize: number;
  gameType: 'minesweeper' | 'demo';
}

export interface GameResult {
  exploded?: boolean;
  tileIndex?: number;
  multiplier?: number;
  remainingSafeTiles?: number;
  success?: boolean;
  winnings?: number;
  profit?: number;
}

export interface AuthCredentials {
  fullName?: string;
  phoneNumber: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: User;
  requiresOTP?: boolean;
  userId?: string;
  otpSentVia?: 'sms' | 'email';
}

export interface OTPVerification {
  userId: string;
  otp: string;
}

export interface WinnersFeedItem {
  id: string;
  username: string;
  amount: number;
  multiplier: number;
  timestamp: Date;
  isDemo: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalBets: number;
  totalWinnings: number;
  totalProfit: number;
}

export interface LuxuryScoreAnalytics {
  topLuxuryUsers: {
    fullName: string;
    phoneNumber: string;
    luxuryScore: number;
    gamblingFrequency: number;
  }[];
  stats: {
    avgLuxuryScore: number;
    maxLuxuryScore: number;
    minLuxuryScore: number;
    totalUsers: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationParams;
}

export interface SocketEvents {
  'join-game': (gameId: string) => void;
  'leave-game': (gameId: string) => void;
  'game-action': (data: any) => void;
  'game-update': (data: any) => void;
}

export interface GameSettings {
  minBet: number;
  maxBet: number;
  baseBombPercentage: number;
  houseEdge: number;
  demoModeMultiplierBoost: number;
  otpExpiryHours: number;
}
