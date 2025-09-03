'use client';

import React, { useState } from 'react';

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check admin credentials
    if (username === 'MAXWELL' && password === 'Maxwell21') {
      setIsLoggedIn(true);
    } else {
      alert('Invalid admin credentials!');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="bg-dark-800 p-8 rounded-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-primary-500 mb-6">
            💣 BoomBank Admin
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="Enter password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Login
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Default credentials:</p>
            <p>Username: <span className="text-primary-500">MAXWELL</span></p>
            <p>Password: <span className="text-primary-500">Maxwell21</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-500">
            💣 BoomBank Admin Dashboard
          </h1>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="bg-danger-500 hover:bg-danger-600 px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-primary-500">1,247</p>
            <p className="text-sm text-gray-500 mt-2">+12% from last month</p>
          </div>
          
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Active Games</h3>
            <p className="text-3xl font-bold text-secondary-500">89</p>
            <p className="text-sm text-gray-500 mt-2">Real-time count</p>
          </div>
          
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-500">$45,230</p>
            <p className="text-sm text-gray-500 mt-2">+8% from last month</p>
          </div>
          
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Pending Withdrawals</h3>
            <p className="text-3xl font-bold text-warning-500">23</p>
            <p className="text-sm text-gray-500 mt-2">Require attention</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-secondary-400 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-gray-300">New user registered: John Doe</span>
                <span className="text-sm text-gray-500 ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
                <span className="text-gray-300">Large win: $2,500</span>
                <span className="text-sm text-gray-500 ml-auto">5 min ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                <span className="text-gray-300">Withdrawal requested: $500</span>
                <span className="text-sm text-gray-500 ml-auto">12 min ago</span>
              </div>
            </div>
          </div>

          {/* Luxury Score Analytics 😈 */}
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-secondary-400 mb-4">
              🧠 Luxury Score Analytics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Average Luxury Score</span>
                  <span className="text-primary-500">67.3</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '67.3%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Top Luxury User</span>
                  <span className="text-warning-500">Sarah Johnson</span>
                </div>
                <div className="text-xs text-gray-500">Score: 98/100</div>
              </div>
              
              <div className="text-sm text-gray-400">
                <p>💡 High luxury scores get better odds!</p>
                <p className="text-xs mt-1">(This is our secret sauce 😈)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-dark-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-secondary-400 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-primary-500 hover:bg-primary-600 p-4 rounded-lg transition-colors">
              <div className="text-2xl mb-2">👥</div>
              <span className="text-sm">Manage Users</span>
            </button>
            <button className="bg-secondary-500 hover:bg-secondary-600 p-4 rounded-lg transition-colors">
              <div className="text-2xl mb-2">🎮</div>
              <span className="text-sm">View Games</span>
            </button>
            <button className="bg-warning-500 hover:bg-warning-600 p-4 rounded-lg transition-colors">
              <div className="text-2xl mb-2">💰</div>
              <span className="text-sm">Process Payments</span>
            </button>
            <button className="bg-danger-500 hover:bg-danger-600 p-4 rounded-lg transition-colors">
              <div className="text-2xl mb-2">⚙️</div>
              <span className="text-sm">System Settings</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
