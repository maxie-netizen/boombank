'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdrawal';
  onSuccess: (data: any) => void;
}

interface Transaction {
  id: string;
  status: string;
  amount: number;
  type: string;
  createdAt: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('pending');

  useEffect(() => {
    if (user) {
      // Pre-fill description based on type
      setDescription(type === 'deposit' ? 'BoomBank Deposit' : 'BoomBank Withdrawal');
    }
  }, [user, type]);

  useEffect(() => {
    if (transactionId) {
      const interval = setInterval(checkTransactionStatus, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [transactionId]);

  const validateAmount = (value: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return 'Please enter a valid amount';
    }
    
    if (type === 'deposit') {
      if (numValue < 10) return 'Minimum deposit is KES 10';
      if (numValue > 100000) return 'Maximum deposit is KES 100,000';
    } else {
      if (numValue < 100) return 'Minimum withdrawal is KES 100';
      if (numValue > 200000) return 'Maximum withdrawal is KES 200,000';
      if (user && numValue > user.balance) return 'Insufficient balance';
    }
    
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = type === 'deposit' ? '/api/payment/deposit' : '/api/payment/withdraw';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Transaction failed');
      }

      setTransactionId(data.data.transactionId);
      setSuccess(true);
      onSuccess(data.data);
      
      // Start polling for status
      setTimeout(() => checkTransactionStatus(), 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to process transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTransactionStatus = async () => {
    if (!transactionId) return;

    try {
      const response = await fetch(`/api/payment/transactions/${transactionId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactionStatus(data.data.status);
        
        if (data.data.status === 'completed') {
          // Transaction completed successfully
          setTimeout(() => {
            onClose();
            window.location.reload(); // Refresh to update balance
          }, 2000);
        } else if (data.data.status === 'failed') {
          setError('Transaction failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error checking transaction status:', err);
    }
  };

  const cancelTransaction = async () => {
    if (!transactionId) return;

    try {
      const response = await fetch(`/api/payment/transactions/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setTransactionStatus('cancelled');
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error('Error cancelling transaction:', err);
    }
  };

  const handleClose = () => {
    if (isLoading || transactionStatus === 'processing') {
      return; // Prevent closing during processing
    }
    onClose();
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
      case 'processing': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      case 'processing': return '⏳';
      default: return '⏳';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {type === 'deposit' ? '💰 Deposit Funds' : '📤 Withdraw Funds'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={isLoading || transactionStatus === 'processing'}
          >
            ×
          </button>
        </div>

        {/* Phone Number Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center text-blue-800 text-sm">
            <span className="mr-2">📱</span>
            <span>
              {type === 'deposit' ? 'Deposit to' : 'Withdraw to'}: <strong>{user?.phoneNumber || 'Loading...'}</strong>
            </span>
          </div>
        </div>

        {!success ? (
          /* Payment Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (KES)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  KES
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={type === 'deposit' ? '10 - 100,000' : '100 - 200,000'}
                  min={type === 'deposit' ? 10 : 100}
                  max={type === 'deposit' ? 100000 : 200000}
                  step="0.01"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {type === 'deposit' ? 'Min: KES 10 | Max: KES 100,000' : 'Min: KES 100 | Max: KES 200,000'}
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Current Balance Display */}
            {type === 'withdrawal' && user && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-600">
                  Current Balance: <span className="font-semibold text-gray-800">KES {user.balance?.toLocaleString() || '0'}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !amount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                `${type === 'deposit' ? 'Deposit' : 'Withdraw'} KES ${amount || '0'}`
              )}
            </button>
          </form>
        ) : (
          /* Transaction Status */
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl mb-2 ${getStatusColor(transactionStatus)}`}>
                {getStatusIcon(transactionStatus)}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Transaction {transactionStatus === 'completed' ? 'Successful!' : transactionStatus === 'failed' ? 'Failed' : 'Processing...'}
              </h3>
              <p className="text-gray-600 text-sm">
                {transactionStatus === 'completed' 
                  ? `Your ${type} of KES ${amount} has been processed successfully.`
                  : transactionStatus === 'failed'
                  ? 'The transaction could not be completed. Please try again.'
                  : `Processing your ${type} of KES ${amount}...`
                }
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600 space-y-1">
                <div>Amount: <span className="font-semibold">KES {amount}</span></div>
                <div>Type: <span className="font-semibold capitalize">{type}</span></div>
                <div>Status: <span className={`font-semibold ${getStatusColor(transactionStatus)}`}>{transactionStatus}</span></div>
                <div>Transaction ID: <span className="font-mono text-xs">{transactionId}</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            {transactionStatus === 'pending' && (
              <div className="flex space-x-2">
                <button
                  onClick={cancelTransaction}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancel Transaction
                </button>
                <button
                  onClick={checkTransactionStatus}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Check Status
                </button>
              </div>
            )}

            {transactionStatus === 'completed' && (
              <button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            )}

            {transactionStatus === 'failed' && (
              <button
                onClick={() => {
                  setSuccess(false);
                  setError('');
                  setTransactionId(null);
                  setTransactionStatus('pending');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
