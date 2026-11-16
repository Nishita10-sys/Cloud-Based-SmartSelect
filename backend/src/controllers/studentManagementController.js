
import { z } from 'zod'

import {
  getStudentDirectory,
  getStudentById,
  getStudentFormOptions,
  createStudent,
  setStudentAccountStatus,
} from '../services/studentManagementService.js'

// ======================================================
// VALIDATION SCHEMAS
// ======================================================

const studentIdSchema = z.string().uuid()
const schoolIdSchema = z.string().uuid()

const directoryQuerySchema = z.object({
  search: z.string().optional().default(''),
  accountStatus: z.enum([
    '',
    'pending',
    'active',
    'suspended',
    'disabled',
  ]).optional().default(''),
  schoolId: z.union([z.literal(''), z.string().uuid()]).optional().default(''),
  departmentId: z.union([z.literal(''), z.string().uuid()]).optional().default(''),
  academicYearLevel: z.enum([
    '',
    'FY',
    'SY',
    'TY',
    'LY',
  ]).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
})

const academicPlacementSchema = z.object({
  academicTermId: z.string().uuid(),
  schoolId: z.string().uuid(),
  departmentId: z.string().uuid(),
  specializationId: z.string().uuid(),
  academicYearLevel: z.enum(['FY', 'SY', 'TY', 'LY']),
  division: z.string().trim().max(50).optional().nullable(),
  rollNumber: z.string().trim().max(50).optional().nullable(),
}).nullable().optional()

const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(
    /^\+[1-9][0-9]{7,14}$/,
    'Enter a valid phone number with country code.'
  ),
  enrollmentNumber: z.string().trim().min(1).max(100),
  admissionDate: z.iso.date().nullable().optional(),
  admissionBatch: z.string().trim().max(50).nullable().optional(),
  academicPlacement: academicPlacementSchema,
})

const accountStatusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'disabled']),
})

// ======================================================
// ERROR HANDLING
// ======================================================

function sendStudentError(res, error, operation) {
  console.error(`Student ${operation} error:`, error.message)

  if (
    error.message.includes('already exists') ||
    error.message.includes('duplicate key')
  ) {
    return res.status(409).json({
      success: false,
      message: error.message.includes('already exists')
        ? error.message
        : 'A student with these details already exists.',
    })
  }

  if (
    error.message.includes('not found') ||
    error.message.includes('does not exist') ||
    error.message.includes('does not belong')
  ) {
    return res.status(404).json({
      success: false,
      message: error.message,
    })
  }

  if (
    error.message.includes('must') ||
    error.message.includes('Invalid') ||
    error.message.includes('Please provide') ||
    error.message.includes('Selected') ||
    error.message.includes('Semester') ||
    error.message.includes('match') ||
    error.message.includes('Pending')
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  return res.status(500).json({
    success: false,
    message: `Unable to ${operation} student data.`,
  })
}

// ======================================================
// EXISTING UNIVERSITY ADMIN HANDLERS
// ======================================================

export async function getStudents(req, res) {
  const validation = directoryQuerySchema.safeParse(req.query)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid student search and filter details.',
      errors: validation.error.issues,
    })
  }

  try {
    const result = await getStudentDirectory(validation.data)

    return res.status(200).json({
      success: true,
      message: 'Students retrieved successfully.',
      data: result.students,
      pagination: result.pagination,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function getStudentDetails(req, res) {
  const validation = studentIdSchema.safeParse(req.params.studentId)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid student ID.',
    })
  }

  try {
    const student = await getStudentById(validation.data)

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully.',
      data: student,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function getStudentOptions(req, res) {
  try {
    const options = await getStudentFormOptions()

    return res.status(200).json({
      success: true,
      message: 'Student form options retrieved successfully.',
      data: options,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function addStudent(req, res) {
  const validation = createStudentSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid student details.',
      errors: validation.error.issues,
    })
  }

  try {
    const student = await createStudent(validation.data)

    return res.status(201).json({
      success: true,
      message: 'Student created successfully. The account is pending first-time activation.',
      data: student,
    })
  } catch (error) {
    return sendStudentError(res, error, 'create')
  }
}

export async function changeStudentAccountStatus(req, res) {
  const idValidation = studentIdSchema.safeParse(req.params.studentId)
  const bodyValidation = accountStatusSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid student ID and account status.',
    })
  }

  try {
    const profile = await setStudentAccountStatus(
      idValidation.data,
      bodyValidation.data.accountStatus
    )

    return res.status(200).json({
      success: true,
      message: `Student account ${bodyValidation.data.accountStatus} successfully.`,
      data: profile,
    })
  } catch (error) {
    return sendStudentError(res, error, 'update')
  }
}

// ======================================================
// SCHOOL-SCOPED STUDENT HANDLERS
// ======================================================

function validateSchoolId(req, res) {
  const validation = schoolIdSchema.safeParse(req.params.schoolId)

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid school ID.',
    })

    return null
  }

  return validation.data
}

export async function getSchoolStudents(req, res) {
  const schoolId = validateSchoolId(req, res)
  if (!schoolId) return

  const validation = directoryQuerySchema.safeParse(req.query)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student search or filter details.',
      errors: validation.error.issues,
    })
  }

  try {
    const result = await getStudentDirectory({
      ...validation.data,
      schoolId,
    })

    return res.status(200).json({
      success: true,
      message: 'School students retrieved successfully.',
      data: result.students,
      pagination: result.pagination,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function getSchoolStudentDetails(req, res) {
  const schoolId = validateSchoolId(req, res)
  if (!schoolId) return

  const studentValidation = studentIdSchema.safeParse(req.params.studentId)

  if (!studentValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid student ID.',
    })
  }

  try {
    const student = await getStudentById(
      studentValidation.data,
      schoolId
    )

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in this school.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully.',
      data: student,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function getSchoolStudentOptions(req, res) {
  const schoolId = validateSchoolId(req, res)
  if (!schoolId) return

  try {
    const options = await getStudentFormOptions(schoolId)

    return res.status(200).json({
      success: true,
      message: 'School student form options retrieved successfully.',
      data: options,
    })
  } catch (error) {
    return sendStudentError(res, error, 'retrieve')
  }
}

export async function addSchoolStudent(req, res) {
  const schoolId = validateSchoolId(req, res)
  if (!schoolId) return

  const validation = createStudentSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid student details.',
      errors: validation.error.issues,
    })
  }

  try {
    // The school ID comes from the route, not the request body.
    // This prevents a client from assigning students to another school.
    const student = await createStudent({
      ...validation.data,
      schoolId,
    })

    return res.status(201).json({
      success: true,
      message: 'Student created successfully. The account is pending first-time activation.',
      data: student,
    })
  } catch (error) {
    return sendStudentError(res, error, 'create')
  }
}

export async function changeSchoolStudentAccountStatus(req, res) {
  const schoolId = validateSchoolId(req, res)
  if (!schoolId) return

  const studentValidation = studentIdSchema.safeParse(req.params.studentId)
  const bodyValidation = accountStatusSchema.safeParse(req.body)

  if (!studentValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid student ID and account status.',
    })
  }

  try {
    const profile = await setStudentAccountStatus(
      studentValidation.data,
      bodyValidation.data.accountStatus,
      schoolId
    )

    return res.status(200).json({
      success: true,
      message: `Student account ${bodyValidation.data.accountStatus} successfully.`,
      data: profile,
    })
  } catch (error) {
    return sendStudentError(res, error, 'update')
  }
}
