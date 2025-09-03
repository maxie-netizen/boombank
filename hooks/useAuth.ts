import { useState, useEffect, useCallback } from 'react';
import { User, AuthCredentials, AuthResponse, OTPVerification } from '@/types/game';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('boombank_token');
    if (token) {
      checkAuthStatus(token);
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const checkAuthStatus = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { user } = await response.json();
        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        localStorage.setItem('boombank_token', token);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('boombank_token');
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('boombank_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'Authentication check failed'
      });
    }
  }, []);

  const register = useCallback(async (credentials: AuthCredentials): Promise<AuthResponse> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw error;
    }
  }, []);

  const login = useCallback(async (credentials: AuthCredentials): Promise<AuthResponse> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (verification: OTPVerification, type: 'login' | 'registration'): Promise<AuthResponse> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const endpoint = type === 'login' ? 'verify-login' : 'verify-otp';
      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verification)
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // If verification successful and we have a token and user
      if (data.token && data.user) {
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        localStorage.setItem('boombank_token', data.token);
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP verification failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw error;
    }
  }, []);

  const resendOTP = useCallback(async (userId: string, type: 'login' | 'registration'): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, type })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend OTP';
      setAuthState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const forgotPassword = useCallback(async (phoneNumber: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset request failed');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      setAuthState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (verification: OTPVerification, newPassword: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...verification, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setAuthState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('boombank_token');
      if (token) {
        // Call logout endpoint
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('boombank_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      });
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null
    }));
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('boombank_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  return {
    ...authState,
    register,
    login,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
    logout,
    updateUser,
    clearError,
    getAuthHeaders
  };
};
