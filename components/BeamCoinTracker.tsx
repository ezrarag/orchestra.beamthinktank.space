'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, TrendingUp, Award, Gift, ArrowRight } from 'lucide-react'

interface BeamCoinTransaction {
  id: string
  date: string
  type: 'earned' | 'spent' | 'transferred'
  amount: number
  description: string
  project?: string
}

interface BeamCoinStats {
  totalBalance: number
  monthlyEarned: number
  totalEarned: number
  recentTransactions: BeamCoinTransaction[]
}

const mockTransactions: BeamCoinTransaction[] = [
  {
    id: '1',
    date: '2025-01-10',
    type: 'earned',
    amount: 4,
    description: 'Full Orchestra Rehearsal - BDSO',
    project: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: '2',
    date: '2025-01-08',
    type: 'earned',
    amount: 3,
    description: 'Sectional Rehearsal - Strings',
    project: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: '3',
    date: '2025-01-05',
    type: 'spent',
    amount: -10,
    description: 'Redeemed for Music Lesson',
    project: 'BEAM Education'
  },
  {
    id: '4',
    date: '2025-01-03',
    type: 'earned',
    amount: 2,
    description: 'Community Outreach Performance',
    project: 'BEAM Community'
  },
  {
    id: '5',
    date: '2024-12-30',
    type: 'transferred',
    amount: 5,
    description: 'Gifted to Sarah Johnson',
    project: 'BEAM Network'
  }
]

const mockStats: BeamCoinStats = {
  totalBalance: 47,
  monthlyEarned: 15,
  totalEarned: 127,
  recentTransactions: mockTransactions
}

const redeemOptions = [
  {
    title: 'Music Lessons',
    description: 'Private lessons with BEAM faculty',
    cost: 10,
    icon: Award
  },
  {
    title: 'Equipment Rental',
    description: 'Rent instruments or accessories',
    cost: 15,
    icon: Gift
  },
  {
    title: 'Concert Tickets',
    description: 'VIP tickets to BEAM performances',
    cost: 8,
    icon: TrendingUp
  },
  {
    title: 'Masterclasses',
    description: 'Special workshops with guest artists',
    cost: 12,
    icon: Award
  }
]

export default function BeamCoinTracker() {
  const [stats, setStats] = useState<BeamCoinStats>(mockStats)
  const [selectedTab, setSelectedTab] = useState<'balance' | 'transactions' | 'redeem'>('balance')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'spent':
        return <Gift className="w-4 h-4 text-blue-400" />
      case 'transferred':
        return <ArrowRight className="w-4 h-4 text-purple-400" />
      default:
        return <Coins className="w-4 h-4 text-gray-400" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-400'
      case 'spent':
        return 'text-blue-400'
      case 'transferred':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Coins className="w-7 h-7 mr-3 text-yellow-400" />
              BEAM Coins
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Digital rewards for your musical contributions
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">
              {stats.totalBalance}
            </div>
            <div className="text-gray-400 text-sm">Total Balance</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'balance', label: 'Balance', icon: Coins },
          { id: 'transactions', label: 'History', icon: TrendingUp },
          { id: 'redeem', label: 'Redeem', icon: Gift }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'balance' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-white">{stats.totalBalance}</div>
                <div className="text-gray-400 text-sm">Current Balance</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-green-400">{stats.monthlyEarned}</div>
                <div className="text-gray-400 text-sm">This Month</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-blue-400">{stats.totalEarned}</div>
                <div className="text-gray-400 text-sm">Total Earned</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {stats.recentTransactions.slice(0, 3).map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                  >
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.type)}
                      <div className="ml-3">
                        <div className="text-white text-sm font-medium">
                          {transaction.description}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-2">Earn More BEAM Coins</h4>
              <p className="text-gray-300 text-sm mb-4">
                Participate in rehearsals, performances, and community events to earn rewards.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rehearsal (3h):</span>
                  <span className="text-yellow-400">3 BEAM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Concert:</span>
                  <span className="text-yellow-400">10 BEAM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Outreach:</span>
                  <span className="text-yellow-400">2 BEAM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Content:</span>
                  <span className="text-yellow-400">5 BEAM</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'transactions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
            {stats.recentTransactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getTransactionIcon(transaction.type)}
                    <div className="ml-3">
                      <div className="text-white font-medium">
                        {transaction.description}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatDate(transaction.date)}
                      </div>
                      {transaction.project && (
                        <div className="text-purple-300 text-xs mt-1">
                          {transaction.project}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} BEAM
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {selectedTab === 'redeem' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Redeem Your BEAM Coins</h3>
              <p className="text-gray-300 text-sm mb-6">
                Use your earned BEAM Coins to access exclusive benefits and opportunities in the BEAM ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redeemOptions.map((option, index) => (
                <motion.div
                  key={option.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white/5 rounded-lg p-4 border border-white/10 hover:border-yellow-400/50 transition-all duration-200 ${
                    stats.totalBalance >= option.cost ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                        <option.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{option.title}</h4>
                        <div className="text-gray-400 text-sm">{option.description}</div>
                      </div>
                    </div>
                    <div className="text-yellow-400 font-bold text-lg">
                      {option.cost} BEAM
                    </div>
                  </div>
                  
                  <button
                    disabled={stats.totalBalance < option.cost}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      stats.totalBalance >= option.cost
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {stats.totalBalance >= option.cost ? 'Redeem' : 'Insufficient Balance'}
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
              <h4 className="text-white font-semibold mb-2">Transfer BEAM Coins</h4>
              <p className="text-gray-300 text-sm mb-4">
                Share your BEAM Coins with other musicians in the community to support their musical journey.
              </p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200">
                Transfer to Musician
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
