import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Parser } from 'node-sql-parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const parser = new Parser()

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
    
    console.log('Original SQL:', sql)
    console.log('Clean SQL:', cleanSql)
    
    // Security: Only allow SELECT queries for now
    if (!cleanSql.toLowerCase().startsWith('select')) {
      return NextResponse.json(
        { error: `Only SELECT queries are currently supported for security reasons. Received: "${sql}"` },
        { status: 400 }
      )
    }

    try {
      // Parse the SQL query into an AST (Abstract Syntax Tree)
      const ast = parser.astify(cleanSql)
      console.log('Parsed SQL AST:', JSON.stringify(ast, null, 2))
      
      // Debug: Check if this is a LIMIT query
      if (cleanSql.toLowerCase().includes('limit')) {
        console.log('LIMIT query detected, full AST:', JSON.stringify(ast, null, 2))
      }
      
      // Handle array of statements (take first one)
      const statement = Array.isArray(ast) ? ast[0] : ast
      
      if (statement.type !== 'select') {
        return NextResponse.json(
          { error: 'Only SELECT queries are supported' },
          { status: 400 }
        )
      }

      // Extract table name - handle different AST structures safely
      let tableName: string | undefined
      
      try {
        if (statement.from) {
          if (Array.isArray(statement.from)) {
            // If from is an array, get the first element's table
            const firstFrom = statement.from[0]
            if (firstFrom && typeof firstFrom === 'object') {
              // Convert to unknown first, then to the desired type
              const fromObj = firstFrom as unknown as { [key: string]: unknown }
              tableName = (fromObj['table'] as string) || (fromObj['name'] as string)
            }
          } else if (typeof statement.from === 'object') {
            // If from is a single object, get its table/name property
            const fromObj = statement.from as unknown as { [key: string]: unknown }
            tableName = (fromObj['table'] as string) || (fromObj['name'] as string)
          }
        }
      } catch (error) {
        console.warn('Error extracting table name from AST:', error)
      }
      
      if (!tableName || tableName !== 'players') {
        return NextResponse.json(
          { error: 'Only queries on the "players" table are supported' },
          { status: 400 }
        )
      }

      // Build the Supabase query
      let queryBuilder: any = supabase.from('players')

      // Handle SELECT columns
      if (statement.columns) {
        // Check if we have aggregation functions
        const hasAggregations = statement.columns.some((col: any) => col.expr.type === 'aggr_func')
        
        if (hasAggregations) {
          // For aggregation queries, we need all columns to process the data
          queryBuilder = queryBuilder.select('*')
        } else {
          // For regular queries, process columns normally
          const columns = statement.columns.map((col: any) => {
            if (col.as) return `${col.expr.column} as ${col.as}`
            if (col.expr.type === 'column_ref') return col.expr.column
            return '*'
          }).filter((col: any) => col !== '*')
          
          if (columns.length > 0) {
            queryBuilder = queryBuilder.select(columns.join(', '))
          } else {
            queryBuilder = queryBuilder.select('*')
          }
        }
      } else {
        queryBuilder = queryBuilder.select('*')
      }

      // Handle WHERE clauses
      if (statement.where) {
        queryBuilder = applyWhereClause(queryBuilder, statement.where)
      }

      // Handle ORDER BY
      if (statement.orderby) {
        statement.orderby.forEach((order: any) => {
          const column = order.expr.column
          const direction = order.type === 'DESC' ? { ascending: false } : { ascending: true }
          queryBuilder = queryBuilder.order(column, direction)
        })
      }

      // Handle LIMIT
      if (statement.limit) {
        console.log('LIMIT clause found:', statement.limit)
        let limitValue: number
        
        if (Array.isArray(statement.limit.value)) {
          // Extract the number from the array structure
          const firstItem = statement.limit.value[0] as any
          limitValue = firstItem?.value || 10
        } else if (typeof statement.limit.value === 'object' && (statement.limit.value as any)?.value) {
          // Direct object with value property
          limitValue = (statement.limit.value as any).value
        } else {
          // Fallback
          limitValue = statement.limit.value as number || 10
        }
        
        console.log('Extracted LIMIT value:', limitValue)
        queryBuilder = queryBuilder.limit(limitValue)
      }

      // Execute the query
      const { data, error } = await queryBuilder
      
      if (error) {
        throw error
      }

      // Handle aggregation functions by processing the data
      if (statement.columns && statement.columns.some((col: any) => col.expr.type === 'aggr_func')) {
        const result = processAggregations(statement.columns, data)
        return NextResponse.json({ 
          data: [result],
          totalRows: 1,
          originalQuery: sql
        })
      }

      return NextResponse.json({ 
        data: data,
        totalRows: data?.length || 0,
        originalQuery: sql
      })

    } catch (parseError) {
      console.error('SQL parsing error:', parseError)
      
      // Return the actual error message instead of falling back
      const errorMessage = parseError instanceof Error ? parseError.message : 'SQL parsing failed'
      return NextResponse.json({ 
        error: errorMessage,
        originalQuery: sql
      }, { status: 400 })
    }

  } catch (error) {
    console.error('SQL execution error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to execute SQL query'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      // Handle Supabase errors
      const supabaseError = error as any
      if (supabaseError.message) {
        errorMessage = supabaseError.message
      } else if (supabaseError.error_description) {
        errorMessage = supabaseError.error_description
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// Helper function to apply WHERE clauses
function applyWhereClause(queryBuilder: any, whereClause: any): any {
  if (whereClause.type === 'binary_expr') {
    const { operator, left, right } = whereClause
    
    if (operator === '=') {
      if (left.type === 'column_ref' && (right.type === 'string' || right.type === 'single_quote_string')) {
        return queryBuilder.eq(left.column, right.value)
      }
    } else if (operator === '>') {
      if (left.type === 'column_ref' && right.type === 'number') {
        return queryBuilder.gt(left.column, right.value)
      }
    } else if (operator === '<') {
      if (left.type === 'column_ref' && right.type === 'number') {
        return queryBuilder.lt(left.column, right.value)
      }
    } else if (operator === '>=') {
      if (left.type === 'column_ref' && right.type === 'number') {
        return queryBuilder.gte(left.column, right.value)
      }
    } else if (operator === '<=') {
      if (left.type === 'column_ref' && right.type === 'number') {
        return queryBuilder.lte(left.column, right.value)
      }
    } else if (operator === '!=') {
      if (left.type === 'column_ref' && (right.type === 'string' || right.type === 'single_quote_string')) {
        return queryBuilder.neq(left.column, right.value)
      }
    }
  } else if (whereClause.type === 'function') {
    if (whereClause.name === 'IS' && whereClause.args?.[1]?.value === 'NULL') {
      return queryBuilder.is(whereClause.args[0].column, null)
    } else if (whereClause.name === 'IS NOT' && whereClause.args?.[1]?.value === 'NULL') {
      return queryBuilder.not(whereClause.args[0].column, 'is', null)
    }
  }
  
  return queryBuilder
}

// Helper function to process aggregations
function processAggregations(columns: any[], data: any[]): any {
  const result: any = {}
  
  columns.forEach((col: any) => {
    if (col.expr.type === 'aggr_func') {
      const funcName = col.expr.name.toLowerCase()
      const alias = col.as || `${funcName}_value`
      
      if (funcName === 'count' && col.expr.args?.expr?.value === '*') {
        result[alias] = data.length
      } else if (funcName === 'avg') {
        // Extract the column name from the AVG function
        const columnName = col.expr.args?.expr?.column
        if (columnName) {
          const values = data.map(row => row[columnName]).filter(val => val !== null)
          if (values.length > 0) {
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length
            result[alias] = Math.round(avg * 100) / 100
          } else {
            result[alias] = 0
          }
        } else {
          result[alias] = 'AVG function detected - column not found'
        }
      } else if (funcName === 'sum') {
        const columnName = col.expr.args?.expr?.column
        if (columnName) {
          const values = data.map(row => row[columnName]).filter(val => val !== null)
          result[alias] = values.reduce((sum, val) => sum + val, 0)
        } else {
          result[alias] = 'SUM function detected - column not found'
        }
      } else if (funcName === 'max') {
        const columnName = col.expr.args?.expr?.column
        if (columnName) {
          const values = data.map(row => row[columnName]).filter(val => val !== null)
          result[alias] = Math.max(...values)
        } else {
          result[alias] = 'MAX function detected - column not found'
        }
      } else if (funcName === 'min') {
        const columnName = col.expr.args?.expr?.column
        if (columnName) {
          const values = data.map(row => row[columnName]).filter(val => val !== null)
          result[alias] = Math.min(...values)
        } else {
          result[alias] = 'MIN function detected - column not found'
        }
      }
    }
  })
  
  return result
}
