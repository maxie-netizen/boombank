import { useState, useCallback } from 'react';
import { Game, GameState, GameStartParams, GameResult } from '@/types/game';
import { useAuth } from './useAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useGame = () => {
  const { getAuthHeaders } = useAuth();
  const [gameState, setGameState] = useState<GameState>({
    currentGame: null,
    games: [],
    loading: false,
    error: null
  });

  const startGame = useCallback(async (params: GameStartParams): Promise<Game> => {
    try {
      setGameState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/game/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      const newGame: Game = {
        id: data.game.id,
        userId: data.game.userId,
        gameType: data.game.gameType,
        betAmount: data.game.betAmount,
        gridSize: data.game.gridSize,
        bombCount: data.game.bombCount,
        bombPositions: data.game.bombPositions,
        revealedTiles: data.game.revealedTiles,
        currentMultiplier: data.game.currentMultiplier,
        maxMultiplier: data.game.maxMultiplier,
        status: data.game.status,
        result: data.game.result,
        winnings: data.game.winnings,
        profit: data.game.profit,
        gameConfig: data.game.gameConfig,
        device: data.game.device,
        ip: data.game.ip,
        sessionId: data.game.sessionId,
        startedAt: new Date(data.game.startedAt),
        actions: data.game.actions,
        tilesRevealed: data.game.tilesRevealed,
        riskLevel: data.game.riskLevel,
        createdAt: new Date(data.game.createdAt),
        updatedAt: new Date(data.game.updatedAt)
      };

      setGameState(prev => ({
        ...prev,
        currentGame: newGame,
        games: [newGame, ...prev.games],
        loading: false
      }));

      return newGame;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game';
      setGameState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw error;
    }
  }, [getAuthHeaders]);

  const revealTile = useCallback(async (gameId: string, tileIndex: number): Promise<GameResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/reveal`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gameId, tileIndex })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reveal tile');
      }

      // Update game state
      setGameState(prev => {
        if (!prev.currentGame || prev.currentGame.id !== gameId) {
          return prev;
        }

        const updatedGame = { ...prev.currentGame };
        
        if (data.game.status === 'exploded') {
          updatedGame.status = 'exploded';
          updatedGame.result = 'loss';
          updatedGame.endedAt = new Date();
          updatedGame.bombPositions = data.game.bombPositions;
          updatedGame.revealedTiles = data.game.revealedTiles;
        } else {
          updatedGame.currentMultiplier = data.game.currentMultiplier;
          updatedGame.maxMultiplier = data.game.maxMultiplier;
          updatedGame.tilesRevealed = data.game.tilesRevealed;
          updatedGame.revealedTiles = data.game.revealedTiles;
        }

        return {
          ...prev,
          currentGame: updatedGame,
          games: prev.games.map(game => 
            game.id === gameId ? updatedGame : game
          )
        };
      });

      return data.game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reveal tile';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const cashOut = useCallback(async (gameId: string): Promise<GameResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/cashout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gameId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cash out');
      }

      // Update game state
      setGameState(prev => {
        if (!prev.currentGame || prev.currentGame.id !== gameId) {
          return prev;
        }

        const updatedGame = { ...prev.currentGame };
        updatedGame.status = 'cashed_out';
        updatedGame.result = 'win';
        updatedGame.winnings = data.game.winnings;
        updatedGame.profit = data.game.profit;
        updatedGame.endedAt = new Date();
        updatedGame.duration = data.game.duration;

        return {
          ...prev,
          currentGame: updatedGame,
          games: prev.games.map(game => 
            game.id === gameId ? updatedGame : game
          )
        };
      });

      return data.game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cash out';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const abandonGame = useCallback(async (gameId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/abandon`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gameId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to abandon game');
      }

      // Update game state
      setGameState(prev => {
        if (!prev.currentGame || prev.currentGame.id !== gameId) {
          return prev;
        }

        const updatedGame = { ...prev.currentGame };
        updatedGame.status = 'abandoned';
        updatedGame.result = 'loss';
        updatedGame.endedAt = new Date();
        updatedGame.duration = data.game.duration;

        return {
          ...prev,
          currentGame: updatedGame,
          games: prev.games.map(game => 
            game.id === gameId ? updatedGame : game
          )
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to abandon game';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const getGameHistory = useCallback(async (limit: number = 50): Promise<Game[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/history?limit=${limit}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get game history');
      }

      const games = data.games.map((game: any) => ({
        ...game,
        startedAt: new Date(game.startedAt),
        endedAt: game.endedAt ? new Date(game.endedAt) : undefined,
        createdAt: new Date(game.createdAt),
        updatedAt: new Date(game.updatedAt)
      }));

      setGameState(prev => ({ ...prev, games }));

      return games;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get game history';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const getUserStats = useCallback(async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/stats/summary`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user stats');
      }

      return data.stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user stats';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const trackSearch = useCallback(async (query: string, category: string = 'general'): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/track-search`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, category })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track search');
      }

      // Update user's luxury score in the auth context if needed
      console.log('Search tracked successfully:', data);
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }, [getAuthHeaders]);

  const getOptimizedOdds = useCallback(async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/odds/optimized`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get optimized odds');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get optimized odds';
      setGameState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getAuthHeaders]);

  const clearError = useCallback(() => {
    setGameState(prev => ({ ...prev, error: null }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(prev => ({ ...prev, currentGame: null }));
  }, []);

  // Calculate game statistics
  const getGameStats = useCallback(() => {
    const { games } = gameState;
    
    if (games.length === 0) {
      return {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        totalBets: 0,
        totalWinnings: 0,
        totalProfit: 0,
        averageBet: 0,
        biggestWin: 0,
        biggestLoss: 0
      };
    }

    const totalGames = games.length;
    const totalWins = games.filter(game => game.result === 'win').length;
    const totalLosses = games.filter(game => game.result === 'loss').length;
    const winRate = (totalWins / totalGames) * 100;
    
    const totalBets = games.reduce((sum, game) => sum + game.betAmount, 0);
    const totalWinnings = games.reduce((sum, game) => sum + game.winnings, 0);
    const totalProfit = games.reduce((sum, game) => sum + game.profit, 0);
    const averageBet = totalBets / totalGames;
    
    const biggestWin = Math.max(...games.map(game => game.winnings));
    const biggestLoss = Math.min(...games.map(game => game.profit));

    return {
      totalGames,
      totalWins,
      totalLosses,
      winRate,
      totalBets,
      totalWinnings,
      totalProfit,
      averageBet,
      biggestWin,
      biggestLoss
    };
  }, [gameState.games]);

  return {
    gameState,
    startGame,
    revealTile,
    cashOut,
    abandonGame,
    getGameHistory,
    getUserStats,
    trackSearch,
    getOptimizedOdds,
    clearError,
    resetGame,
    getGameStats
  };
};
