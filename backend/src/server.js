
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { supabase } from './config/supabase.js'

import { authenticateUser } from './middleware/authMiddleware.js'
import { authorizeRoles } from './middleware/roleMiddleware.js'

import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// SECURITY MIDDLEWARE
app.use(helmet())

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}))

app.use(express.json({ limit: '1mb' }))

// ROOT ROUTE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmartSelect API Service is operational',
  })
})

// DATABASE HEALTH CHECK
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

// PROTECTED STUDENT TEST ENDPOINT
app.get(
  '/api/protected/student-test',
  authenticateUser,
  authorizeRoles('student'),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Authentication and student authorization successful.',
      user: req.user,
    })
  }
)

// PROTECTED FACULTY TEST ENDPOINT
app.get(
  '/api/protected/faculty-test',
  authenticateUser,
  authorizeRoles('faculty'),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Faculty authorization successful.',
      user: req.user,
    })
  }
)

// AUTHENTICATION ROUTES
app.use('/api/auth', authRoutes)

// UNIVERSITY ADMIN ROUTES
// Every Admin route is protected by authenticateUser
// and authorizeRoles('admin') inside adminRoutes.js.
app.use('/api/admin', adminRoutes)

// TEMPORARY DATABASE SCHEMA DIAGNOSTICS
app.get('/api/diagnostics/schema', async (req, res) => {
  try {
    const tables = [
      'profiles',
      'student_details',
      'faculty_details',
      'auth_challenges',
      'schools',
      'departments',
      'specializations',
      'student_academic_records',
      'academic_years',
      'academic_terms',
      'electives',
      'elective_offerings',
      'enrollment_periods',
      'enrollments',
    ]

    const results = {}

    for (const table of tables) {
      const { data, error } = await supabase.rpc(
        'get_table_columns',
        { target_table: table }
      )

      results[table] = error
        ? { error: error.message }
        : data
    }

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

// TEMPORARY READ-ONLY TRIGGER AND FUNCTION DIAGNOSTICS
app.get('/api/diagnostics/triggers', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc(
      'get_database_triggers'
    )

    if (error) {
      console.error('Trigger inspection failed:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Unable to inspect database triggers.',
        details: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Trigger inspection completed.',
      triggers: data,
    })
  } catch (error) {
    console.error('Trigger inspection error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Database trigger inspection failed.',
    })
  }
})

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  })
})

// START SERVER
app.listen(PORT, () => {
  console.log(`SmartSelect backend running on http://localhost:${PORT}`)
})
