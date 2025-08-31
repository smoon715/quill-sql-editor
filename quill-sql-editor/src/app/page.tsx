'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SqlEditor from './components/SqlEditor'
import AiChat from './components/AiChat'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [suggestedQuery, setSuggestedQuery] = useState<string>('')

  useEffect(() => {
    async function testConnection() {
      try {
        // Just test if we can reach Supabase without querying a specific table
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          setConnectionStatus('error')
          setErrorMessage(error.message)
        } else {
          setConnectionStatus('connected')
        }
      } catch (err) {
        setConnectionStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testConnection()
  }, [])

  const handleQuerySuggestion = (query: string) => {
    setSuggestedQuery(query)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900">
              Quill SQL Editor
            </h1>
            <div className="text-sm text-gray-500">
              {connectionStatus === 'connected' && (
                <span className="text-green-600">✓ PostgreSQL Connected</span>
              )}
              {connectionStatus === 'loading' && (
                <span className="text-yellow-600">⏳ Connecting to PostgreSQL...</span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-red-600">✗ PostgreSQL Connection Failed</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-gray-600">
              Write SQL queries and get AI-powered suggestions
            </p>
          </div>
        </div>
      </div>

      {connectionStatus === 'error' && (
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">
              <strong>Connection Error:</strong> {errorMessage}
            </p>
            <p className="text-red-700 text-sm mt-2">
              Please check your environment variables and Supabase configuration.
            </p>
          </div>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SQL Editor - Takes up 2/3 of the width */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 h-[calc(100vh-160px)]">
                <SqlEditor suggestedQuery={suggestedQuery} />
              </div>
            </div>

            {/* AI Chat - Takes up 1/3 of the width, matches SQL editor height */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md h-[calc(100vh-160px)]">
                <AiChat onQuerySuggestion={handleQuerySuggestion} />
              </div>
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'loading' && (
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Connecting to Supabase...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
