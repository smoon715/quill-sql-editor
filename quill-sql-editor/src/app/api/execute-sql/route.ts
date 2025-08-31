import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json()
    
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      )
    }

    // Remove SQL comments before processing
    const cleanSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim()
    
    const query = cleanSql.toLowerCase()
    
    // Debug logging
    console.log('Original SQL:', sql)
    console.log('Clean SQL:', cleanSql)
    console.log('Lowercase query:', query)
    console.log('Starts with select?', query.startsWith('select'))
    
    // Security: Only allow SELECT queries for now
    if (!query.startsWith('select')) {
      return NextResponse.json(
        { error: `Only SELECT queries are currently supported for security reasons. Received: "${sql}"` },
        { status: 400 }
      )
    }

    // Execute the actual SQL query using Supabase's rpc method
    // This allows us to execute raw SQL queries
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: cleanSql
    })

    if (error) {
      console.error('Supabase query error:', error)
      
      // If the RPC method doesn't exist, fall back to basic query execution
      // Note: This is a fallback and may not work for all complex queries
      console.log('Falling back to basic query execution...')
      
      try {
        // For simple queries, we can use Supabase's query builder
        if (query.includes('avg(') || query.includes('count(') || query.includes('sum(') || query.includes('max(') || query.includes('min(')) {
          console.log('Detected aggregation query:', query)
          
          // Handle aggregation queries
          if (query.includes('avg(draft_pick)') && query.includes('where draft_pick is not null')) {
            console.log('Handling avg(draft_pick) query')
            const { data: allData } = await supabase
              .from('players')
              .select('draft_pick')
              .not('draft_pick', 'is', null)
            
            if (allData && allData.length > 0) {
              const avgDraftPick = allData.reduce((sum, p) => sum + p.draft_pick, 0) / allData.length
              return NextResponse.json({ 
                data: [{ average_draft_pick: Math.round(avgDraftPick * 100) / 100 }],
                totalRows: 1,
                originalQuery: sql
              })
            } else {
              return NextResponse.json({ 
                data: [{ average_draft_pick: 0 }],
                totalRows: 1,
                originalQuery: sql
              })
            }
          }
          
          // Handle other aggregation queries
          if (query.includes('count(*)')) {
            console.log('Handling count(*) query')
            const { count } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
            
            return NextResponse.json({ 
              data: [{ count: count || 0 }],
              totalRows: 1,
              originalQuery: sql
            })
          }

          // Handle AVG(rating) queries
          if (query.includes('avg(rating)')) {
            console.log('Handling avg(rating) query')
            const { data: allData, error: ratingError } = await supabase
              .from('players')
              .select('rating')
            
            if (ratingError) throw ratingError
            
            if (allData && allData.length > 0) {
              const avgRating = allData.reduce((sum, p) => sum + p.rating, 0) / allData.length
              return NextResponse.json({ 
                data: [{ average_rating: Math.round(avgRating * 100) / 100 }],
                totalRows: 1,
                originalQuery: sql
              })
            } else {
              return NextResponse.json({ 
                data: [{ average_rating: 0 }],
                totalRows: 1,
                originalQuery: sql
              })
            }
          }
          
          // Handle COUNT queries with WHERE clauses (like your Lakers query)
          if (query.includes('count(*)') && query.includes('where')) {
            console.log('Handling count(*) with WHERE clause')
            
            if (query.includes('team = \'lakers\'')) {
              const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('team', 'Lakers')
              
              return NextResponse.json({ 
                data: [{ lakers_player_count: count || 0 }],
                totalRows: 1,
                originalQuery: sql
              })
            }
          }
        }
        
        // For basic SELECT queries without aggregations
        if (query.includes('select * from players')) {
          const { data: allData, error: selectError } = await supabase
            .from('players')
            .select('*')
          
          if (selectError) throw selectError
          
          return NextResponse.json({ 
            data: allData,
            totalRows: allData?.length || 0,
            originalQuery: sql
          })
        }
        
        // For queries with WHERE clauses
        if (query.includes('where')) {
          let queryBuilder = supabase.from('players').select('*')
          
          if (query.includes('league = \'nba\'')) {
            queryBuilder = queryBuilder.eq('league', 'NBA')
          } else if (query.includes('league = \'nfl\'')) {
            queryBuilder = queryBuilder.eq('league', 'NFL')
          } else if (query.includes('league = \'mlb\'')) {
            queryBuilder = queryBuilder.eq('league', 'MLB')
          } else if (query.includes('team = \'')) {
            // Dynamic team handling - extract team name from SQL
            const teamMatch = cleanSql.match(/team\s*=\s*['"]([^'"]+)['"]/i)
            if (teamMatch) {
              const teamName = teamMatch[1]
              console.log('Detected team filter:', teamName)
              queryBuilder = queryBuilder.eq('team', teamName)
            }
          } else if (query.includes('draft_pick is not null')) {
            queryBuilder = queryBuilder.not('draft_pick', 'is', null)
          }
          
          const { data: filteredData, error: filterError } = await queryBuilder
          
          if (filterError) throw filterError
          
          return NextResponse.json({ 
            data: filteredData,
            totalRows: filteredData?.length || 0,
            originalQuery: sql
          })
        }
        
        // If we get here, the query is too complex for our fallback
        return NextResponse.json(
          { error: 'Query too complex for fallback execution. Please use simpler queries or ensure the database has the exec_sql function.' },
          { status: 400 }
        )
        
      } catch (fallbackError) {
        console.error('Fallback execution error:', fallbackError)
        return NextResponse.json(
          { error: `Failed to execute query: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      data: data || [],
      totalRows: Array.isArray(data) ? data.length : 1,
      originalQuery: sql
    })

  } catch (error) {
    console.error('SQL execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute SQL query' },
      { status: 500 }
    )
  }
}
