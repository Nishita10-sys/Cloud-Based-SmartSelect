
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { supabase } from './config/supabase.js'

const app = express()
const PORT = process.env.PORT || 5000

// Security and middleware
app.use(helmet())

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}))

app.use(express.json({ limit: '1mb' }))

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmartSelect API Service is operational',
  })
})

// Supabase connection health check
app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase health check failed:', error.message)

      return res.status(503).json({
        success: false,
        message: 'Database connection check failed.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'SmartSelect backend connected to Supabase successfully.',
      data: {
        backend: 'operational',
        database: 'connected',
      },
    })
  } catch (error) {
    console.error('Health check error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to verify database connection.',
    })
  }
})

// Temporary database schema and constraints inspection
app.get('/api/diagnostics/schema', async (req, res) => {
  try {
    const tables = [
      'profiles',
      'student_details',
      'faculty_details',
      'auth_challenges',
    ]

    const results = {}

    // Inspect existing table columns
    for (const table of tables) {
      const { data, error } = await supabase.rpc(
        'get_table_columns',
        { target_table: table }
      )

      results[table] = error
        ? { error: error.message }
        : data
    }

    // Inspect primary keys, foreign keys, unique constraints and checks
    const {
      data: constraints,
      error: constraintError,
    } = await supabase.rpc('get_auth_constraints')

    return res.status(200).json({
      success: true,
      message: 'Database inspection completed.',
      tables: results,
      constraints: constraintError
        ? { error: constraintError.message }
        : constraints,
    })

  } catch (error) {
    console.error('Schema inspection error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Database inspection failed.',
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`SmartSelect backend running on http://localhost:${PORT}`)
})
