'use client';

import React, { useState } from 'react';
import { Game } from '@/types/game';

interface GameBoardProps {
  gameState: {
    currentGame: Game | null;
    games: Game[];
    loading: boolean;
    error: string | null;
  };
  onTileClick: (tileIndex: number) => void;
  isDemoMode: boolean;
  onPlaceBet?: () => void; // Callback to trigger bet placement
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, isDemoMode, onPlaceBet }) => {
  const { currentGame } = gameState;
  const [showBetPrompt, setShowBetPrompt] = useState(false);

  const handleTileClick = (tileIndex: number) => {
    if (!currentGame || currentGame.status !== 'active') {
      if (onPlaceBet) {
        onPlaceBet();
      } else {
        setShowBetPrompt(true);
      }
      return;
    }
    onTileClick(tileIndex);
  };

  const renderTile = (index: number) => {
    const isRevealed = currentGame?.revealedTiles?.includes(index) || false;
    const isBomb = currentGame?.bombPositions?.includes(index) || false;
    const isExploded = currentGame?.status === 'exploded' && isBomb;
    const isActive = currentGame?.status === 'active';

    let tileContent = '';
    let tileClass = '';

    if (isRevealed) {
      if (isBomb) {
        tileContent = '💥';
        tileClass = 'bg-danger-500 animate-explode';
      } else {
        tileContent = '✅';
        tileClass = 'bg-primary-500 animate-tile-reveal';
      }
    } else if (currentGame?.status === 'exploded' && isBomb) {
      tileContent = '💣';
      tileClass = 'bg-danger-600';
    } else if (currentGame?.status === 'exploded' && !isRevealed) {
      tileContent = '❓';
      tileClass = 'bg-dark-600';
    } else {
      tileContent = '?';
      tileClass = isActive 
        ? 'bg-dark-700 hover:bg-dark-600 cursor-pointer' 
        : 'bg-dark-600 cursor-not-allowed opacity-75';
    }

    return (
      <div
        key={index}
        className={`w-12 h-12 ${tileClass} rounded-lg border border-dark-600 flex items-center justify-center text-white font-bold text-lg transition-all duration-200 ${
          isActive && !isRevealed ? 'hover:scale-105' : ''
        }`}
        onClick={() => handleTileClick(index)}
      >
        {tileContent}
      </div>
    );
  };

  const renderGameBoard = () => {
    const gridSize = currentGame?.gridSize || 5;
    const totalTiles = gridSize * gridSize;

    return (
      <div className="flex justify-center">
        <div 
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`
          }}
        >
          {Array.from({ length: totalTiles }).map((_, index) => renderTile(index))}
        </div>
      </div>
    );
  };

  if (!currentGame) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💣</div>
        <h2 className="text-2xl font-bold text-gray-300 mb-4">Welcome to BoomBank!</h2>
        <p className="text-gray-400 mb-6">
          Place your bet and start playing to reveal the board
        </p>
        {renderGameBoard()}
        
        {/* Call to Action */}
        <div className="mt-8">
          <button
            onClick={onPlaceBet}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            🎯 Place Your Bet
          </button>
        </div>
      </div>
    );
  }

  const gridSize = currentGame.gridSize;
  const totalTiles = gridSize * gridSize;

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {isDemoMode ? 'Demo Mode' : 'Real Money Mode'}
        </h2>
        <div className="flex justify-center space-x-8 text-sm text-gray-400">
          <div>
            <span className="block">Grid Size</span>
            <span className="text-white font-semibold">{gridSize}x{gridSize}</span>
          </div>
          <div>
            <span className="block">Bombs</span>
            <span className="text-danger-500 font-semibold">{currentGame.bombCount}</span>
          </div>
          <div>
            <span className="block">Risk Level</span>
            <span className={`font-semibold capitalize ${
              currentGame.riskLevel === 'low' ? 'text-primary-500' :
              currentGame.riskLevel === 'medium' ? 'text-warning-500' :
              currentGame.riskLevel === 'high' ? 'text-orange-500' :
              'text-danger-500'
            }`}>
              {currentGame.riskLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      {renderGameBoard()}

      {/* Game Status */}
      <div className="text-center">
        {currentGame.status === 'active' && (
          <div className="space-y-2">
            <div className="text-lg text-gray-300">
              Tiles Revealed: <span className="text-primary-500 font-semibold">{currentGame.tilesRevealed}</span>
            </div>
            <div className="text-lg text-gray-300">
              Current Multiplier: <span className="text-secondary-500 font-semibold">{currentGame.currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="text-lg text-gray-300">
              Max Multiplier: <span className="text-warning-500 font-semibold">{currentGame.maxMultiplier.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {currentGame.status === 'cashed_out' && (
          <div className="text-center space-y-2">
            <div className="text-2xl text-primary-500 font-bold">🎉 CASHED OUT!</div>
            <div className="text-lg text-gray-300">
              Winnings: <span className="text-primary-500 font-semibold">${currentGame.winnings.toFixed(2)}</span>
            </div>
            <div className="text-lg text-gray-300">
              Profit: <span className="text-green-500 font-semibold">${currentGame.profit.toFixed(2)}</span>
            </div>
            <div className="text-lg text-gray-300">
              Final Multiplier: <span className="text-secondary-500 font-semibold">{currentGame.currentMultiplier.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {currentGame.status === 'exploded' && (
          <div className="text-center space-y-2">
            <div className="text-2xl text-danger-500 font-bold">💥 GAME OVER!</div>
            <div className="text-lg text-gray-300">
              You hit a bomb! Better luck next time.
            </div>
            <div className="text-lg text-gray-300">
              Loss: <span className="text-danger-500 font-semibold">${currentGame.betAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {currentGame.status === 'abandoned' && (
          <div className="text-center space-y-2">
            <div className="text-2xl text-warning-500 font-bold">⚠️ GAME ABANDONED</div>
            <div className="text-lg text-gray-300">
              Game abandoned. Partial refund may be available.
            </div>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-secondary-400 mb-3">Game Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Bet Amount:</span>
            <span className="text-white ml-2">${currentGame.betAmount.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">Game Type:</span>
            <span className="text-white ml-2 capitalize">{currentGame.gameType}</span>
          </div>
          <div>
            <span className="text-gray-400">Started:</span>
            <span className="text-white ml-2">
              {new Date(currentGame.startedAt).toLocaleTimeString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Duration:</span>
            <span className="text-white ml-2">
              {currentGame.duration ? `${currentGame.duration}s` : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Bet Placement Prompt Modal */}
      {showBetPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Place Your Bet First!</h3>
            <p className="text-gray-600 mb-6">
              You need to place a bet before you can reveal tiles and start winning!
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBetPrompt(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBetPrompt(false);
                  if (onPlaceBet) onPlaceBet();
                }}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Place Bet Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
