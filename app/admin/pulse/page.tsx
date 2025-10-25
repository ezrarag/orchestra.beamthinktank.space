'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Music, 
  Calendar, 
  Mail, 
  Lightbulb, 
  Send, 
  Bot,
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react'

// Mock data for Pulse dashboard
const mockPulseData = {
  missingInstruments: [
    { instrument: 'Violin II', needed: 6, confirmed: 0, priority: 'high' },
    { instrument: 'Cello', needed: 4, confirmed: 0, priority: 'high' },
    { instrument: 'Bass', needed: 3, confirmed: 0, priority: 'medium' },
    { instrument: 'Oboe', needed: 2, confirmed: 0, priority: 'medium' },
    { instrument: 'Clarinet', needed: 2, confirmed: 0, priority: 'medium' },
    { instrument: 'Bassoon', needed: 2, confirmed: 0, priority: 'medium' },
    { instrument: 'Trombone', needed: 3, confirmed: 0, priority: 'low' },
    { instrument: 'Tuba', needed: 1, confirmed: 0, priority: 'low' },
    { instrument: 'Timpani', needed: 1, confirmed: 0, priority: 'low' },
    { instrument: 'Percussion', needed: 2, confirmed: 0, priority: 'low' },
  ],
  upcomingEvents: [
    { 
      date: '2025-12-02', 
      time: '7:00 PM', 
      type: 'Sectional - Strings', 
      location: 'Central United Methodist Church',
      musicians: 8,
      needed: 25
    },
    { 
      date: '2025-12-04', 
      time: '7:00 PM', 
      type: 'Sectional - Winds', 
      location: 'Central United Methodist Church',
      musicians: 3,
      needed: 12
    },
    { 
      date: '2025-12-06', 
      time: '7:00 PM', 
      type: 'Sectional - Brass', 
      location: 'Central United Methodist Church',
      musicians: 2,
      needed: 8
    },
  ],
  unreadEmails: [
    { 
      from: 'yolandaodufuwa@gmail.com', 
      subject: 'Re: Violin I Audition Submission', 
      time: '2 hours ago',
      priority: 'high',
      project: 'BDSO Memorial Concert'
    },
    { 
      from: 'rachel.jacobson.horn@gmail.com', 
      subject: 'Horn Section Availability', 
      time: '4 hours ago',
      priority: 'medium',
      project: 'BDSO Memorial Concert'
    },
    { 
      from: 'anyavani.prakash@gmail.com', 
      subject: 'Viola Audition Follow-up', 
      time: '1 day ago',
      priority: 'medium',
      project: 'BDSO Memorial Concert'
    },
  ],
  suggestedActions: [
    { 
      action: 'Send reminder emails to missing string players', 
      priority: 'high',
      estimatedTime: '15 min',
      impact: 'High - Critical for rehearsal'
    },
    { 
      action: 'Review and respond to pending auditions', 
      priority: 'high',
      estimatedTime: '30 min',
      impact: 'High - Musician recruitment'
    },
    { 
      action: 'Update rehearsal schedule for December', 
      priority: 'medium',
      estimatedTime: '20 min',
      impact: 'Medium - Planning efficiency'
    },
    { 
      action: 'Generate progress report for BDSO', 
      priority: 'low',
      estimatedTime: '10 min',
      impact: 'Low - Documentation'
    },
  ]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AdminPulse() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Pulse, your AI assistant for BEAM Orchestra management. I can help you with musician recruitment, rehearsal planning, and project coordination. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsTyping(true)

    // Simulate AI response (in production, this would call OpenAI API)
    setTimeout(() => {
      const responses = [
        "Based on the current roster data, I can see that Violin II, Cello, and Bass sections are critically understaffed. I recommend prioritizing outreach to local music schools and community orchestras.",
        "The upcoming sectional rehearsals need immediate attention. String sectionals are only 32% filled (8/25 musicians). Would you like me to draft reminder emails to confirmed musicians?",
        "I've analyzed the audition submissions and found 3 high-priority applications that need review. The viola and horn sections have promising candidates.",
        "For the BDSO Memorial Concert project, the current completion rate is 13% (8/60 musicians). The most critical gaps are in the string sections.",
        "I can help you generate automated emails to recruit musicians for specific instruments. Would you like me to create a template for the missing string players?"
      ]
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const PulseCard = ({ 
    title, 
    icon: Icon, 
    children, 
    color = 'orchestra-gold',
    count 
  }: {
    title: string
    icon: any
    children: React.ReactNode
    color?: string
    count?: number
  }) => (
    <motion.div
      className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${color}/20`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
          <h3 className="text-lg font-bold text-orchestra-cream">{title}</h3>
        </div>
        {count !== undefined && (
          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${color}/20 text-${color}`}>
            {count}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  )

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-green-500/20 text-green-400'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
        {priority}
      </span>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-orchestra-gold mb-2">Pulse Dashboard</h1>
            <p className="text-orchestra-cream/70">AI-powered insights and communications for BEAM Orchestra management</p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Missing Instruments */}
            <PulseCard 
              title="Missing Instruments" 
              icon={Music} 
              color="red-500"
              count={mockPulseData.missingInstruments.length}
            >
              <div className="space-y-3">
                {mockPulseData.missingInstruments.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orchestra-dark/30 rounded-lg">
                    <div>
                      <div className="font-medium text-orchestra-cream">{item.instrument}</div>
                      <div className="text-sm text-orchestra-cream/70">Need {item.needed} musicians</div>
                    </div>
                    <PriorityBadge priority={item.priority} />
                  </div>
                ))}
                {mockPulseData.missingInstruments.length > 5 && (
                  <div className="text-center text-orchestra-cream/50 text-sm">
                    +{mockPulseData.missingInstruments.length - 5} more instruments
                  </div>
                )}
              </div>
            </PulseCard>

            {/* Upcoming Events */}
            <PulseCard 
              title="Upcoming Rehearsals" 
              icon={Calendar} 
              color="blue-500"
              count={mockPulseData.upcomingEvents.length}
            >
              <div className="space-y-3">
                {mockPulseData.upcomingEvents.map((event, index) => (
                  <div key={index} className="p-3 bg-orchestra-dark/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orchestra-cream">{event.type}</div>
                      <div className="text-sm text-orchestra-cream/70">{event.date}</div>
                    </div>
                    <div className="text-sm text-orchestra-cream/70 mb-2">{event.location}</div>
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-orchestra-gold" />
                      <span className="text-orchestra-cream">{event.musicians}/{event.needed} musicians</span>
                    </div>
                  </div>
                ))}
              </div>
            </PulseCard>

            {/* Unread Emails */}
            <PulseCard 
              title="Unread Emails" 
              icon={Mail} 
              color="yellow-500"
              count={mockPulseData.unreadEmails.length}
            >
              <div className="space-y-3">
                {mockPulseData.unreadEmails.map((email, index) => (
                  <div key={index} className="p-3 bg-orchestra-dark/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orchestra-cream">{email.from}</div>
                      <PriorityBadge priority={email.priority} />
                    </div>
                    <div className="text-sm text-orchestra-cream/70 mb-1">{email.subject}</div>
                    <div className="text-xs text-orchestra-cream/50">{email.time} • {email.project}</div>
                  </div>
                ))}
              </div>
            </PulseCard>

            {/* Suggested Actions */}
            <PulseCard 
              title="AI Suggested Actions" 
              icon={Lightbulb} 
              color="purple-500"
              count={mockPulseData.suggestedActions.length}
            >
              <div className="space-y-3">
                {mockPulseData.suggestedActions.map((action, index) => (
                  <div key={index} className="p-3 bg-orchestra-dark/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orchestra-cream">{action.action}</div>
                      <PriorityBadge priority={action.priority} />
                    </div>
                    <div className="text-sm text-orchestra-cream/70 mb-2">{action.impact}</div>
                    <div className="flex items-center text-xs text-orchestra-cream/50">
                      <Clock className="h-3 w-3 mr-1" />
                      {action.estimatedTime}
                    </div>
                  </div>
                ))}
              </div>
            </PulseCard>
          </div>
        </div>
      </div>

      {/* Chat Pane */}
      <motion.div
        className="w-96 bg-orchestra-dark/50 backdrop-blur-md border-l border-orchestra-gold/20 flex flex-col"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-orchestra-gold/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orchestra-gold/20">
              <Bot className="h-5 w-5 text-orchestra-gold" />
            </div>
            <div>
              <h3 className="font-bold text-orchestra-gold">Ask Pulse</h3>
              <p className="text-xs text-orchestra-cream/70">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {chatMessages.map((message) => (
              <motion.div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-orchestra-gold text-orchestra-dark'
                      : 'bg-orchestra-cream/10 text-orchestra-cream'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-orchestra-cream/10 text-orchestra-cream p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-orchestra-gold rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-orchestra-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-orchestra-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-orchestra-gold/20">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Pulse about musicians, rehearsals, or projects..."
              className="flex-1 px-3 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream placeholder-orchestra-cream/50 focus:outline-none focus:ring-2 focus:ring-orchestra-gold/50"
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isTyping}
              className="p-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:bg-orchestra-gold/50 text-orchestra-dark rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
