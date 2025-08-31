import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Use a raw SQL query to get table information since Supabase doesn't allow direct access to information_schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_schema')

    if (tablesError) {
      // Fallback: manually define the schema for known tables
      const schema = {
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
              { name: 'draft_pick', type: 'INTEGER', nullable: true },
              { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
              { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: true }
            ]
          }
        ]
      }
      return NextResponse.json(schema)
    }

    return NextResponse.json({ tables: tables || [] })

  } catch (error) {
    console.error('Error fetching database schema:', error)
    // Fallback: manually define the schema for known tables
    const schema = {
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
            { name: 'draft_pick', type: 'INTEGER', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
            { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: true }
          ]
        }
      ]
    }
    return NextResponse.json(schema)
  }
}
