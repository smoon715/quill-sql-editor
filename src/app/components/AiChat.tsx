'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Play, Copy, Check } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestedQuery?: string
}

interface DatabaseSchema {
  tables: {
    name: string
    columns: {
      name: string
      type: string
      nullable: boolean
    }[]
  }[]
}

export default function AiChat({ onQuerySuggestion }: { onQuerySuggestion: (query: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your SQL assistant. I can help you write queries for your database. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(true)
  const [dbSchema, setDbSchema] = useState<DatabaseSchema>({
    tables: []
  })

  const fetchDatabaseSchema = async () => {
    try {
      const response = await fetch('/api/schema')
      if (!response.ok) {
        throw new Error('Failed to fetch schema')
      }
      const schema = await response.json()
      setDbSchema(schema)
    } catch (error) {
      console.error('Failed to fetch database schema:', error)
      // Fallback to mock schema if API fails
      const mockSchema: DatabaseSchema = {
        tables: [
          {
            name: 'players',
            columns: [
              { name: 'id', type: 'SERIAL', nullable: false },
              { name: 'name', type: 'VARCHAR(100)', nullable: false },
              { name: 'league', type: 'VARCHAR(20)', nullable: false },
              { name: 'team', type: 'VARCHAR(50)', nullable: false },
              { name: 'age', type: 'INTEGER', nullable: false },
              { name: 'position', type: 'VARCHAR(30)', nullable: false },
              { name: 'rating', type: 'DECIMAL(3,1)', nullable: false },
              { name: 'salary', type: 'DECIMAL(12,2)', nullable: false },
              { name: 'experience_years', type: 'INTEGER', nullable: false },
              { name: 'height', type: 'VARCHAR(10)', nullable: true },
              { name: 'weight', type: 'INTEGER', nullable: true },
              { name: 'college', type: 'VARCHAR(100)', nullable: true },
              { name: 'draft_year', type: 'INTEGER', nullable: true },
              { name: 'draft_round', type: 'INTEGER', nullable: true },
              { name: 'draft_pick', type: 'INTEGER', nullable: true }
            ]
          }
        ]
      }
      setDbSchema(mockSchema)
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
    }
  }

  useEffect(() => {
    // Scroll to bottom whenever messages change or typing starts
    scrollToBottom()
  }, [messages.length, isTyping])

  useEffect(() => {
    fetchDatabaseSchema()
  }, [])

  const generateResponse = async (userMessage: string): Promise<Message> => {
    if (!dbSchema.tables.length) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I\'m having trouble accessing the database schema right now.',
        timestamp: new Date()
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          schema: dbSchema
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.content,
        timestamp: new Date(),
        suggestedQuery: data.suggestedQuery || undefined
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const aiResponse = await generateResponse(userMessage.content)
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error in chat:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyQuery = async (query: string) => {
    try {
      await navigator.clipboard.writeText(query)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy query:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 flex-shrink-0">
        <Bot className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">AI SQL Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : 'order-2'}`}>
              <div className={`rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
              
              {message.suggestedQuery && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Suggested Query:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyQuery(message.suggestedQuery!)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => onQuerySuggestion(message.suggestedQuery!)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        <Play className="w-3 h-3" />
                        Use
                      </button>
                    </div>
                  </div>
                  <code className="block text-sm text-blue-800 bg-blue-100 p-2 rounded font-mono">
                    {message.suggestedQuery}
                  </code>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your database or request a SQL query..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
