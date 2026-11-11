
import { z } from 'zod'

import {
  getSchoolsWithStats,
  createSchool,
  updateSchool,
  setSchoolStatus,
} from '../services/adminService.js'

const schoolIdSchema = z.string().uuid()

const schoolSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, 'School code contains invalid characters.'),
})

const schoolStatusSchema = z.object({
  isActive: z.boolean(),
})

function sendDatabaseError(res, error, operation) {
  console.error(`Admin ${operation} error:`, error.message)

  if (error.message.includes('duplicate key')) {
    return res.status(409).json({
      success: false,
      message: 'A school with this code already exists.',
    })
  }

  if (
    error.message.includes('schools_code_format') ||
    error.message.includes('schools_name_not_empty')
  ) {
    return res.status(400).json({
      success: false,
      message: 'School details do not satisfy the database rules.',
    })
  }

  return res.status(500).json({
    success: false,
    message: `Unable to ${operation} school data.`,
  })
}

// GET UNIVERSITY DASHBOARD AND SCHOOL STATISTICS
export async function getAdminDashboard(req, res) {
  try {
    const result = await getSchoolsWithStats()

    return res.status(200).json({
      success: true,
      message: 'University dashboard data retrieved successfully.',
      data: result,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve university dashboard data.',
    })
  }
}

// GET ALL SCHOOLS
export async function getAllSchools(req, res) {
  try {
    const result = await getSchoolsWithStats()

    return res.status(200).json({
      success: true,
      message: 'Schools retrieved successfully.',
      data: result.schools,
    })
  } catch (error) {
    console.error('Get schools error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve schools.',
    })
  }
}

// CREATE SCHOOL
export async function addSchool(req, res) {
  const validation = schoolSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid school name and code.',
      errors: validation.error.issues,
    })
  }

  try {
    const school = await createSchool(validation.data)

    return res.status(201).json({
      success: true,
      message: 'School created successfully.',
      data: school,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'create')
  }
}

// EDIT SCHOOL
export async function editSchool(req, res) {
  const idValidation = schoolIdSchema.safeParse(req.params.schoolId)
  const bodyValidation = schoolSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid school ID and school details.',
    })
  }

  try {
    const school = await updateSchool(
      idValidation.data,
      bodyValidation.data
    )

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'School updated successfully.',
      data: school,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'update')
  }
}

// ACTIVATE OR DEACTIVATE SCHOOL
export async function changeSchoolStatus(req, res) {
  const idValidation = schoolIdSchema.safeParse(req.params.schoolId)
  const bodyValidation = schoolStatusSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid school ID and status.',
    })
  }

  try {
    const school = await setSchoolStatus(
      idValidation.data,
      bodyValidation.data.isActive
    )

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: bodyValidation.data.isActive
        ? 'School activated successfully.'
        : 'School deactivated successfully.',
      data: school,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'update')
  }
}
 