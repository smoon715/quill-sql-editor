import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

interface ChatRequest {
  message: string
  schema: DatabaseSchema
}

export async function POST(request: NextRequest) {
  try {
    const { message, schema }: ChatRequest = await request.json()

    if (!message || !schema) {
      return NextResponse.json(
        { error: 'Message and schema are required' },
        { status: 400 }
      )
    }

    // Create a system prompt that includes the database schema
    const systemPrompt = `You are a helpful SQL assistant. You have access to the following database schema but NOT the actual data:

${schema.tables.map(table => 
  `Table: ${table.name}
Columns:
${table.columns.map(col => `  - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ' (not null)'}`).join('\n')}`
).join('\n\n')}

Your job is to:
1. Understand what the user wants to query
2. Suggest appropriate SQL queries based on the schema
3. Explain the query in simple terms
4. Only suggest queries that are valid for the given schema
5. Never hallucinate tables or columns that don't exist

When suggesting a query, always include it in a "suggestedQuery" field in your response.
Keep your explanations concise and helpful.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.'

    // Try to extract a suggested query from the AI response
    let suggestedQuery: string | undefined
    
    // Look for SQL code blocks or SQL-like patterns
    const sqlMatch = aiResponse.match(/```sql\s*([\s\S]*?)\s*```/) || 
                     aiResponse.match(/`([^`]*SELECT[^`]*)`/) ||
                     aiResponse.match(/(SELECT\s+.*?;)/i)
    
    if (sqlMatch) {
      suggestedQuery = sqlMatch[1] || sqlMatch[0]
    }

    return NextResponse.json({
      content: aiResponse,
      suggestedQuery: suggestedQuery
    })

  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
