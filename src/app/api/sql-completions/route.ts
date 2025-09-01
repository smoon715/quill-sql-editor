import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CompletionRequest {
  sql: string
  schema: any
}

export async function POST(request: NextRequest) {
  try {
    const { sql, schema }: CompletionRequest = await request.json()

    if (!sql || !schema) {
      return NextResponse.json(
        { error: 'SQL query and schema are required' },
        { status: 400 }
      )
    }

    // Create a system prompt for intelligent SQL completions
    const systemPrompt = `You are an expert SQL assistant that provides intelligent completions for SQL queries.

Database Schema:
${schema.tables.map((table: any) => 
  `Table: ${table.name}
Columns: ${table.columns.map((col: any) => `${col.name} (${col.type})`).join(', ')}`
).join('\n\n')}

Your task is to analyze the current SQL query and cursor position, then suggest 3-5 intelligent completions that would be helpful for the user.

Rules:
1. Only suggest completions that make sense in the current context
2. Use actual table and column names from the schema
3. Provide completions that are commonly needed
4. Include helpful documentation for each suggestion
5. Keep suggestions concise but useful
6. Consider what the user is likely trying to do next

Return only a JSON array of completion objects with this exact format:
[
  {
    "label": "suggestion text",
    "insertText": "text to insert",
    "documentation": "helpful explanation"
  }
]`

    const userPrompt = `Current SQL query:
\`\`\`sql
${sql}
\`\`\`

What would be helpful completions or next steps for this query? 

IMPORTANT: Only suggest the NEXT PART of the query, not the entire query. For example:
- If the query is "SELECT name FROM", suggest "players" or "players WHERE age > 25"
- If the query is "SELECT name FROM players", suggest "WHERE age > 25" or "ORDER BY name"
- Do NOT suggest "SELECT name FROM players WHERE age > 25" when the query already has "SELECT name FROM"

Return only the completion part that should be appended to the existing query.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const aiResponse = completion.choices[0]?.message?.content || '[]'
    
         // Try to parse the JSON response
     let suggestions = []
     try {
       const parsed = JSON.parse(aiResponse)
       suggestions = parsed.map((item: any, index: number) => ({
         id: `suggestion-${index}`,
         text: item.insertText || item.label,
         description: item.documentation || item.label
       }))
     } catch (error) {
       console.error('Failed to parse LLM response:', aiResponse)
       // Fallback to basic suggestions based on current query
       const trimmedSql = sql.trim()
       if (trimmedSql.endsWith('FROM')) {
         suggestions = [
           {
             id: 'suggestion-1',
             text: ' players',
             description: 'Complete with table name'
           }
         ]
       } else if (trimmedSql.includes('FROM') && !trimmedSql.includes('WHERE')) {
         suggestions = [
           {
             id: 'suggestion-1',
             text: ' WHERE age > 25',
             description: 'Add a WHERE clause to filter results'
           }
         ]
       } else {
         suggestions = [
           {
             id: 'suggestion-1',
             text: ' ORDER BY name',
             description: 'Add ORDER BY clause'
           }
         ]
       }
     }

    return NextResponse.json({
      suggestions: suggestions
    })

  } catch (error) {
    console.error('SQL completions API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate completions' },
      { status: 500 }
    )
  }
}
