'use client'

import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Copy, Check, ChevronDown, ChevronRight, Database, Info, Lightbulb } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface QueryResult {
  data: any[] | null
  error: string | null
  columns: string[]
  message?: string
}

interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
}

interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

interface Schema {
  tables: SchemaTable[]
}

interface AISuggestion {
  id: string
  text: string
  description: string
}

interface SqlEditorProps {
  suggestedQuery?: string
}

export default function SqlEditor({ suggestedQuery }: SqlEditorProps) {
  const [sqlQuery, setSqlQuery] = useState(`-- The PostgreSQL test database contains data about random sports players.
-- Type a query to get started or ask our AI chat assistant for help
-- SELECT * FROM players;`)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [schema, setSchema] = useState<Schema | null>(null)
  const [schemaExpanded, setSchemaExpanded] = useState(true)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [showSchemaModal, setShowSchemaModal] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false)
  const editorRef = useRef<any>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const completionProviderRef = useRef<any>(null)

  // Fetch schema on component mount
  useEffect(() => {
    fetchSchema()
  }, [])

  // Update completion provider when schema changes
  useEffect(() => {
    if (schema && editorRef.current) {
      // Re-register completion provider with updated schema
      const monaco = (window as any).monaco
      if (monaco) {
        // Dispose of previous provider to prevent duplicates
        if (completionProviderRef.current) {
          completionProviderRef.current.dispose()
        }
        
        // Register completion provider
        completionProviderRef.current = monaco.languages.registerCompletionItemProvider('sql', {
          triggerCharacters: [' ', '.', ',', '(', ')', '=', '>', '<', '!', '+', '-', '*', '/', '%', '|', '&', '^', '~', '?', ':', ';', '[', ']', '{', '}', '"', "'", '`'],
          provideCompletionItems: (model: any, position: any) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            })
            
            const suggestions: any[] = []
            
            // Essential SQL keywords only (max 5)
            const sqlKeywords = [
              { label: 'SELECT', insertText: 'SELECT', documentation: 'Select data from a table' },
              { label: 'FROM', insertText: 'FROM', documentation: 'Specify the table to query' },
              { label: 'WHERE', insertText: 'WHERE', documentation: 'Filter results with conditions' },
              { label: 'ORDER BY', insertText: 'ORDER BY', documentation: 'Sort results' },
              { label: 'LIMIT', insertText: 'LIMIT', documentation: 'Limit number of results' }
            ]
            
            // Essential SQL functions only (max 3)
            const sqlFunctions = [
              { label: 'COUNT', insertText: 'COUNT', documentation: 'Count values' },
              { label: 'SUM', insertText: 'SUM', documentation: 'Sum numeric values' },
              { label: 'AVG', insertText: 'AVG', documentation: 'Calculate average' }
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
            

            

            
            return { suggestions }
          }
        })
      }
    }
    
    // Cleanup function to dispose of provider when component unmounts
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose()
      }
    }
  }, [schema])

  // Update SQL editor when a query is suggested from AI chat
  useEffect(() => {
    if (suggestedQuery) {
      setSqlQuery(suggestedQuery)
      // Clear any previous results
      setQueryResult(null)
    }
  }, [suggestedQuery])

  // Handle click outside modals to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowSchemaModal(false)
      }
      
      // Note: AI suggestions are always visible now, so no need to close them on click outside
    }

    if (showSchemaModal || showAiSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSchemaModal, showAiSuggestions])

  // AI suggestions trigger on pause
  useEffect(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current)
    }

    if (sqlQuery.trim() && sqlQuery.length > 3) {
      aiTimeoutRef.current = setTimeout(() => {
        fetchAiSuggestions(sqlQuery)
      }, 1500) // 1.5 second delay
    } else {
      setShowAiSuggestions(false)
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
      }
    }
  }, [sqlQuery])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAiSuggestions) {
        setShowAiSuggestions(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAiSuggestions])

  const applySuggestion = (suggestion: AISuggestion) => {
    // Append the suggestion to the current query with proper spacing
    const currentQuery = sqlQuery.trim()
    
    // Check if we need to add a space between current query and suggestion
    let newQuery: string
    if (currentQuery.endsWith(' ') || suggestion.text.startsWith(' ')) {
      // No need to add space - one already exists
      newQuery = currentQuery + suggestion.text
    } else {
      // Add a space between current query and suggestion
      newQuery = currentQuery + ' ' + suggestion.text
    }
    
    setSqlQuery(newQuery)
    setShowAiSuggestions(false)
    
    // Focus back to editor and position cursor at the end
    if (editorRef.current) {
      editorRef.current.focus()
      // Set cursor position to end of the new query
      const model = editorRef.current.getModel()
      if (model) {
        const lastLine = model.getLineCount()
        const lastLineLength = model.getLineLength(lastLine)
        editorRef.current.setPosition({ lineNumber: lastLine, column: lastLineLength + 1 })
      }
    }
  }

  const hideAiSuggestions = () => {
    setShowAiSuggestions(false)
  }

  const fetchSchema = async () => {
    setLoadingSchema(true)
    try {
      const response = await fetch('/api/schema')
      if (response.ok) {
        const schemaData = await response.json()
        setSchema(schemaData)
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error)
    } finally {
      setLoadingSchema(false)
    }
  }

  const fetchAiSuggestions = async (currentQuery: string) => {
    if (!currentQuery.trim()) return
    
    setLoadingAiSuggestions(true)
    try {
      const response = await fetch('/api/sql-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sql: currentQuery,
          schema: schema 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiSuggestions(data.suggestions || [])
        setShowAiSuggestions(true)
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error)
    } finally {
      setLoadingAiSuggestions(false)
    }
  }

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
      console.log('SQL language features loaded')
    } catch (error) {
      console.error('Failed to setup SQL language features:', error)
    }
  }
  


  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">SQL Editor</h3>
          
          {/* Database Info Card */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
            <Database className="w-4 h-4 text-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                {schema?.tables?.[0]?.name || 'players'}
              </span>
              <span className="text-xs text-gray-500">
                ({schema?.tables?.[0]?.columns?.length || 0} cols)
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSchemaModal(true)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              
              {/* Schema Modal - Anchored to info button */}
              {showSchemaModal && (
                <div ref={modalRef} className="absolute right-0 top-8 w-96 bg-white rounded-lg shadow-xl h-96 flex flex-col border border-gray-300 z-50">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-800">Database Schema</h5>
                    <button
                      onClick={() => setShowSchemaModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingSchema ? (
                      <div className="text-gray-500 text-sm">Loading schema...</div>
                    ) : schema ? (
                      <div className="space-y-3">
                        {schema.tables.map((table) => (
                          <div key={table.name} className="border border-gray-200 rounded-md overflow-hidden">
                            <div className="bg-blue-50 px-3 py-2 border-b border-gray-200">
                              <h6 className="text-sm font-semibold text-blue-800">
                                📋 {table.name}
                              </h6>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {table.columns.map((column) => (
                                <div key={column.name} className="px-3 py-2 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">{column.name}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {column.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!column.nullable && (
                                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                        NOT NULL
                                      </span>
                                    )}
                                    {column.name === 'id' && (
                                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                        PRIMARY KEY
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Failed to load schema</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
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

       {/* SQL Editor */}
       <div className="border border-gray-300 rounded-b-lg overflow-hidden relative">
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
             quickSuggestions: {
               other: true,
               comments: true,
               strings: true
             },

             suggest: {
               showKeywords: true,
               showSnippets: false,
               showFunctions: true,
               showVariables: false,
               showClasses: false,
               showModules: false,
               showProperties: false,
               showEvents: false,
               showOperators: false,
               showUnits: false,
               showValues: false,
               showConstants: false,
               showEnums: false,
               showEnumMembers: false,
               showColors: false,
               showFiles: false,
               showReferences: false,
               showFolders: false,
               showTypeParameters: false,
               showWords: false
             },
             acceptSuggestionOnCommitCharacter: true,
             acceptSuggestionOnEnter: 'on',
             tabCompletion: 'on',
             suggestSelection: 'first'
           }}
         />
         
         {/* AI Suggestions Overlay - Always Visible */}
         <div className="absolute bottom-4 right-4 w-80 bg-white border border-blue-200 rounded-lg shadow-lg z-10 max-h-40 overflow-hidden">
           <div className="flex items-center gap-2 p-3 border-b border-blue-100 bg-blue-50">
             <Lightbulb className="w-4 h-4 text-blue-600" />
             <h4 className="text-sm font-semibold text-blue-800">AI Suggestions</h4>
             {loadingAiSuggestions && (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
             )}
             <button
               onClick={hideAiSuggestions}
               className="ml-auto text-blue-400 hover:text-blue-600"
             >
               ×
             </button>
           </div>
           
           <div className="max-h-48 overflow-y-auto">
             <div className="space-y-1 p-2">
               {showAiSuggestions && aiSuggestions.length > 0 ? (
                 aiSuggestions.map((suggestion) => (
                   <button
                     key={suggestion.id}
                     onClick={() => applySuggestion(suggestion)}
                     className="w-full text-left p-2 bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                   >
                     <div className="text-sm font-medium text-gray-900 mb-1">
                       {suggestion.text}
                     </div>
                     <div className="text-xs text-gray-600">
                       {suggestion.description}
                     </div>
                   </button>
                 ))
               ) : (
                 <div className="p-3 text-center text-gray-500 text-sm">
                   {loadingAiSuggestions ? 'Thinking...' : 'Start typing to see AI suggestions'}
                 </div>
               )}
             </div>
           </div>
         </div>
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
