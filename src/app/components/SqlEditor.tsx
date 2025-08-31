'use client'

import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface QueryResult {
  data: any[] | null
  error: string | null
  columns: string[]
  message?: string
}

interface SqlEditorProps {
  suggestedQuery?: string
}

export default function SqlEditor({ suggestedQuery }: SqlEditorProps) {
  const [sqlQuery, setSqlQuery] = useState(`-- Example query
-- SELECT * FROM players;`)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<any>(null)

  // Update SQL editor when a query is suggested from AI chat
  useEffect(() => {
    if (suggestedQuery) {
      setSqlQuery(suggestedQuery)
      // Clear any previous results
      setQueryResult(null)
    }
  }, [suggestedQuery])

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return
    
    setIsExecuting(true)
    setQueryResult(null)
    
    try {
      // Call the new SQL parser API - security is handled on the backend
      const response = await fetch('/api/execute-sql-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: sqlQuery.trim() })
      })

      const result = await response.json()
      
      if (result.error) {
        setQueryResult({
          data: null,
          error: result.error,
          columns: []
        })
      } else {
        // Extract column names from the first row
        const columns = result.data && result.data.length > 0 
          ? Object.keys(result.data[0]) 
          : []
        
        setQueryResult({
          data: result.data,
          error: null,
          columns
        })
      }
    } catch (err) {
      setQueryResult({
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        columns: []
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlQuery)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleEditorDidMount = async (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Ensure SQL language is properly loaded
    try {
      // Force Monaco to load SQL language features
      await monaco.languages.register({ id: 'sql' })
      
      // Set up enhanced SQL completion provider with schema awareness
      monaco.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: [' ', '.', ',', '(', ')', '=', '>', '<', '!', '+', '-', '*', '/', '%', '|', '&', '^', '~', '?', ':', ';', '[', ']', '{', '}', '"', "'", '`'],
        provideCompletionItems: async (model: any, position: any) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          })
          
          const suggestions = []
          
          // Basic SQL keywords
          const sqlKeywords = [
            { label: 'SELECT', insertText: 'SELECT', documentation: 'Select data from a table' },
            { label: 'FROM', insertText: 'FROM', documentation: 'Specify the table to query' },
            { label: 'WHERE', insertText: 'WHERE', documentation: 'Filter results with conditions' },
            { label: 'ORDER BY', insertText: 'ORDER BY', documentation: 'Sort results' },
            { label: 'GROUP BY', insertText: 'GROUP BY', documentation: 'Group results by column' },
            { label: 'HAVING', insertText: 'HAVING', documentation: 'Filter grouped results' },
            { label: 'JOIN', insertText: 'JOIN', documentation: 'Join tables together' },
            { label: 'LEFT JOIN', insertText: 'LEFT JOIN', documentation: 'Left outer join' },
            { label: 'RIGHT JOIN', insertText: 'RIGHT JOIN', documentation: 'Right outer join' },
            { label: 'INNER JOIN', insertText: 'INNER JOIN', documentation: 'Inner join' },
            { label: 'ON', insertText: 'ON', documentation: 'Join condition' },
            { label: 'AS', insertText: 'AS', documentation: 'Alias for table or column' },
            { label: 'DISTINCT', insertText: 'DISTINCT', documentation: 'Return unique values only' },
            { label: 'LIMIT', insertText: 'LIMIT', documentation: 'Limit number of results' },
            { label: 'OFFSET', insertText: 'OFFSET', documentation: 'Skip results' }
          ]
          
          // SQL functions
          const sqlFunctions = [
            { label: 'COUNT(*)', insertText: 'COUNT(*)', documentation: 'Count all rows' },
            { label: 'COUNT', insertText: 'COUNT', documentation: 'Count non-null values' },
            { label: 'SUM', insertText: 'SUM', documentation: 'Sum numeric values' },
            { label: 'AVG', insertText: 'AVG', documentation: 'Calculate average' },
            { label: 'MAX', insertText: 'MAX', documentation: 'Find maximum value' },
            { label: 'MIN', insertText: 'MIN', documentation: 'Find minimum value' },
            { label: 'ROUND', insertText: 'ROUND', documentation: 'Round to decimal places' },
            { label: 'UPPER', insertText: 'UPPER', documentation: 'Convert to uppercase' },
            { label: 'LOWER', insertText: 'LOWER', documentation: 'Convert to lowercase' },
            { label: 'LENGTH', insertText: 'LENGTH', documentation: 'Get string length' },
            { label: 'SUBSTRING', insertText: 'SUBSTRING', documentation: 'Extract part of string' },
            { label: 'CONCAT', insertText: 'CONCAT', documentation: 'Concatenate strings' },
            { label: 'COALESCE', insertText: 'COALESCE', documentation: 'Return first non-null value' },
            { label: 'NULLIF', insertText: 'NULLIF', documentation: 'Return null if values equal' },
            { label: 'CURRENT_DATE', insertText: 'CURRENT_DATE', documentation: 'Current date' },
            { label: 'NOW', insertText: 'NOW', documentation: 'Current timestamp' }
          ]
          
          // Add keywords and functions
          sqlKeywords.forEach(keyword => {
            suggestions.push({
              label: keyword.label,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword.insertText,
              documentation: keyword.documentation,
              sortText: '0' + keyword.label
            })
          })
          
          sqlFunctions.forEach(func => {
            suggestions.push({
              label: func.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: func.insertText,
              documentation: func.documentation,
              sortText: '1' + func.label
            })
          })
          
          // Try to get schema-aware suggestions
          try {
            const schemaResponse = await fetch('/api/schema')
            if (schemaResponse.ok) {
              const schema = await schemaResponse.json()
              
              // Add table names
              schema.tables?.forEach((table: any) => {
                suggestions.push({
                  label: table.name,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table.name,
                  documentation: `Table: ${table.name}`,
                  sortText: '2' + table.name
                })
                
                // Add column names for this table
                table.columns?.forEach((column: any) => {
                  suggestions.push({
                    label: `${table.name}.${column.name}`,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: `${table.name}.${column.name}`,
                    documentation: `${table.name}.${column.name} (${column.type})`,
                    sortText: '3' + column.name
                  })
                  
                  // Also add just column names for convenience
                  suggestions.push({
                    label: column.name,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: column.name,
                    documentation: `Column: ${column.name} (${column.type}) from table ${table.name}`,
                    sortText: '4' + column.name
                  })
                })
              })
            }
          } catch (error) {
            console.log('Could not fetch schema for completions:', error)
          }
          
          // Add common query patterns based on context
          if (textUntilPosition.includes('SELECT') && !textUntilPosition.includes('FROM')) {
            suggestions.push({
              label: 'SELECT * FROM players',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'SELECT * FROM players',
              documentation: 'Select all from players table',
              sortText: '5SELECT * FROM players'
            })
            
            suggestions.push({
              label: 'SELECT name, age FROM players',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'SELECT name, age FROM players',
              documentation: 'Select specific columns from players',
              sortText: '5SELECT name, age FROM players'
            })
          }
          
          if (textUntilPosition.includes('WHERE')) {
            suggestions.push({
              label: 'WHERE age > 25',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'WHERE age > 25',
              documentation: 'Filter by age greater than 25',
              sortText: '5WHERE age > 25'
            })
            
            suggestions.push({
              label: 'WHERE name LIKE',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'WHERE name LIKE \'%\'',
              documentation: 'Filter by name pattern',
              sortText: '5WHERE name LIKE'
            })
          }
          
          // LLM-powered intelligent completions
          try {
            const currentQuery = model.getValue()
            const cursorPosition = position.column - 1
            const currentLine = model.getLineContent(position.lineNumber)
            
            // Only call LLM if we have meaningful context
            if (currentQuery.trim().length > 5 && currentLine.trim().length > 2) {
              const llmResponse = await fetch('/api/sql-completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  currentQuery: currentQuery,
                  cursorPosition: cursorPosition,
                  currentLine: currentLine,
                  schema: await getSchemaForLLM()
                })
              })
              
              if (llmResponse.ok) {
                const llmSuggestions = await llmResponse.json()
                
                llmSuggestions.completions?.forEach((suggestion: any, index: number) => {
                  suggestions.push({
                    label: suggestion.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: suggestion.insertText,
                    documentation: suggestion.documentation || 'AI-powered suggestion',
                    sortText: '6' + suggestion.label,
                    detail: '🤖 AI Suggestion'
                  })
                })
              }
            }
          } catch (error) {
            console.log('LLM completions failed:', error)
          }
          
          return { suggestions }
        }
      })
      
      console.log('Enhanced SQL completion provider registered')
    } catch (error) {
      console.error('Failed to setup SQL completion:', error)
    }
  }
  
  // Helper function to get schema for LLM
  const getSchemaForLLM = async () => {
    try {
      const response = await fetch('/api/schema')
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.log('Could not fetch schema for LLM:', error)
    }
    return null
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">SQL Editor</h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={executeQuery}
            disabled={isExecuting || !sqlQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Run Query'}
          </button>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <Editor
          height="300px"
          defaultLanguage="sql"
          value={sqlQuery}
          onChange={(value) => setSqlQuery(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordBasedSuggestions: 'allDocuments',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true
          }}
        />
      </div>

      {queryResult && (
        <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 flex flex-col">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-800">
              Query Results
              {queryResult.data && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({queryResult.data.length} row{queryResult.data.length !== 1 ? 's' : ''})
                </span>
              )}
            </h4>
          </div>
          
          <div className="p-4 flex-1 overflow-hidden">
            {queryResult.error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-800 text-sm">
                  <strong>Error:</strong> {queryResult.error}
                </p>
              </div>
            ) : queryResult.data && queryResult.data.length > 0 ? (
              <div className="overflow-x-auto overflow-y-auto border border-gray-200 rounded-md h-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {queryResult.columns.map((column) => (
                        <th
                          key={column}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queryResult.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {queryResult.columns.map((column) => (
                          <td
                            key={column}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {String(row[column] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-green-800 text-sm">
                  {queryResult.message || 'Query executed successfully. No data returned.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
