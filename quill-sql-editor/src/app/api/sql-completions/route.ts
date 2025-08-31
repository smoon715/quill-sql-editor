import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CompletionRequest {
  currentQuery: string
  cursorPosition: number
  currentLine: string
  schema: any
}

export async function POST(request: NextRequest) {
  try {
    const { currentQuery, cursorPosition, currentLine, schema }: CompletionRequest = await request.json()

    if (!currentQuery || !schema) {
      return NextResponse.json(
        { error: 'Current query and schema are required' },
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
${currentQuery}
\`\`\`

Cursor position: ${cursorPosition}
Current line: "${currentLine}"

What would be helpful completions here?`

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
    let completions = []
    try {
      completions = JSON.parse(aiResponse)
    } catch (error) {
      console.error('Failed to parse LLM response:', aiResponse)
      // Fallback to basic suggestions
      completions = [
        {
          label: "Continue with WHERE clause",
          insertText: "WHERE ",
          documentation: "Add a WHERE clause to filter results"
        }
      ]
    }

    return NextResponse.json({
      completions: completions
    })

  } catch (error) {
    console.error('SQL completions API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate completions' },
      { status: 500 }
    )
  }
}
