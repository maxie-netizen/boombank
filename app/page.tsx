'use client';

import React, { useState, useCallback } from 'react';
import GameBoard from '@/components/GameBoard';
import { Game } from '@/types/game';
import PaymentModal from '@/components/PaymentModal';
import TransactionHistory from '@/components/TransactionHistory';

export default function HomePage() {
  // Game state
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Balance states
  const [balance, setBalance] = useState(1000);
  const [demoBalance, setDemoBalance] = useState(5000);
  
  // Payment modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  
  // Bet placement state
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  // Mock user data (replace with actual auth)
  const mockUser = {
    id: '123456789',
    accountId: '123456',
    fullName: 'John Doe',
    phoneNumber: '254700000000',
    balance: balance,
    demoBalance: demoBalance
  };

  // Mock game start function
  const startGame = useCallback(async (params: any) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newGame: Game = {
        id: Date.now().toString(),
        userId: mockUser.id,
        betAmount: parseFloat(params.betAmount),
        gameType: 'minesweeper',
        gridSize: 5,
        bombCount: 5,
        bombPositions: [2, 7, 12, 17, 22], // Mock bomb positions
        revealedTiles: [],
        currentMultiplier: 1.0,
        maxMultiplier: 2.5,
        status: 'active',
        result: null,
        winnings: 0,
        profit: 0,
        tilesRevealed: 0,
        startedAt: new Date().toISOString(),
        endedAt: null,
        duration: null,
        riskLevel: 'medium',
        actions: [],
        gameConfig: {},
        device: 'web',
        ip: '127.0.0.1',
        sessionId: 'mock-session'
      };
      
      setCurrentGame(newGame);
      setGames(prev => [newGame, ...prev]);
      setShowBetModal(false);
      setBetAmount('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle tile click
  const handleTileClick = useCallback((tileIndex: number) => {
    if (!currentGame || currentGame.status !== 'active') return;
    
    setCurrentGame(prev => {
      if (!prev) return prev;
      
      const newRevealedTiles = [...prev.revealedTiles, tileIndex];
      const isBomb = prev.bombPositions.includes(tileIndex);
      
      if (isBomb) {
        // Game over - hit bomb
        return {
          ...prev,
          status: 'exploded',
          revealedTiles: newRevealedTiles,
          endedAt: new Date().toISOString(),
          result: 'lost'
        };
      } else {
        // Safe tile - continue game
        const newMultiplier = prev.currentMultiplier * 1.1;
        const newTilesRevealed = prev.tilesRevealed + 1;
        
        return {
          ...prev,
          revealedTiles: newRevealedTiles,
          currentMultiplier: newMultiplier,
          tilesRevealed: newTilesRevealed
        };
      }
    });
  }, [currentGame]);

  // Handle bet placement
  const handlePlaceBet = useCallback(() => {
    setShowBetModal(true);
  }, []);

  // Handle bet submission
  const handleBetSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setBetError('');
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetError('Please enter a valid bet amount');
      return;
    }
    
    const currentBalance = getCurrentBalance();
    if (amount > currentBalance) {
      setBetError('Insufficient balance');
      return;
    }
    
    if (amount < 1) {
      setBetError('Minimum bet is KES 1');
      return;
    }
    
    if (amount > 10000) {
      setBetError('Maximum bet is KES 10,000');
      return;
    }
    
    // Deduct bet amount from balance
    if (isDemoMode) {
      setDemoBalance(prev => prev - amount);
    } else {
      setBalance(prev => prev - amount);
    }
    
    // Start game
    startGame({ betAmount: amount });
  }, [betAmount, isDemoMode, startGame]);

  // Get current balance based on mode
  const getCurrentBalance = useCallback(() => {
    return isDemoMode ? demoBalance : balance;
  }, [isDemoMode, demoBalance, balance]);

  // Handle game completion
  const handleGameComplete = useCallback((game: Game) => {
    if (game.status === 'cashed_out' && game.winnings > 0) {
      // Add winnings to balance
      if (isDemoMode) {
        setDemoBalance(prev => prev + game.winnings);
      } else {
        setBalance(prev => prev + game.winnings);
      }
    }
  }, [isDemoMode]);

  // Handle payment success
  const handlePaymentSuccess = useCallback((data: any) => {
    if (data.type === 'deposit') {
      // Update balance after successful deposit
      setBalance(prev => prev + data.amount);
    }
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary-500">💣 BoomBank</h1>
            <div className="text-sm text-gray-400">
              Account ID: <span className="text-white font-mono">{mockUser.accountId}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Mode:</span>
              <button
                onClick={() => setIsDemoMode(true)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isDemoMode 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => setIsDemoMode(false)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  !isDemoMode 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                Real
              </button>
            </div>
            
            {/* Balance Display */}
            <div className="text-right">
              <div className="text-sm text-gray-400">
                {isDemoMode ? 'Demo Balance' : 'Real Balance'}
              </div>
              <div className="text-lg font-bold text-primary-500">
                ${getCurrentBalance().toFixed(2)}
              </div>
              
              {/* Payment Buttons - Only show for real money mode */}
              {!isDemoMode && (
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
                  >
                    💰 Deposit
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                  >
                    📤 Withdraw
                  </button>
                  <button
                    onClick={() => setShowTransactionHistory(true)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
                  >
                    📊 History
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Game Board */}
        <GameBoard
          gameState={{
            currentGame,
            games,
            loading,
            error
          }}
          onTileClick={handleTileClick}
          isDemoMode={isDemoMode}
          onPlaceBet={handlePlaceBet}
        />
        
        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900 border border-red-700 rounded-lg p-4">
            <div className="text-red-200">{error}</div>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-300 hover:text-red-100 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}
      </main>

      {/* Bet Placement Modal */}
      {showBetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎯</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Place Your Bet</h3>
              <p className="text-gray-600 text-sm">
                Enter your bet amount to start the game
              </p>
            </div>
            
            <form onSubmit={handleBetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bet Amount (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    KES
                  </span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="1 - 10,000"
                    min="1"
                    max="10000"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Min: KES 1 | Max: KES 10,000
                </div>
              </div>
              
              {/* Current Balance Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-600">
                  Available Balance: <span className="font-semibold text-gray-800">KES {getCurrentBalance().toLocaleString()}</span>
                </div>
              </div>
              
              {/* Error Display */}
              {betError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-red-800 text-sm">{betError}</div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBetModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!betAmount || loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {loading ? 'Starting...' : 'Start Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modals */}
      <PaymentModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        type="deposit"
        onSuccess={handlePaymentSuccess}
      />
      
      <PaymentModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        type="withdrawal"
        onSuccess={handlePaymentSuccess}
      />
      
      <TransactionHistory
        isOpen={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
      />
    </div>
  );
}
