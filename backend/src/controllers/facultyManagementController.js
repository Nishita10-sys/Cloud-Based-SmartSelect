
import { z } from 'zod'

import {
  getSchoolFaculty,
  getSchoolFacultyOptions,
  getSchoolFacultyDetails,
  createSchoolFaculty,
  updateSchoolFaculty,
  setSchoolFacultyStatus,
  bulkCreateSchoolFaculty,
} from '../services/facultyManagementService.js'

// ======================================================
// VALIDATION
// ======================================================

const facultySchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required.'),
  employee_id: z.string().trim().min(1, 'Employee ID is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().regex(
    /^\+[1-9][0-9]{7,14}$/,
    'Enter a valid international phone number.'
  ),
  department_id: z.string().uuid('Select a valid department.'),
  designation: z.string().optional().nullable(),
  joining_date: z.string().optional().nullable(),
})

const statusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'disabled']),
})

// ======================================================
// ERROR HANDLING
// ======================================================

function sendFacultyError(res, error) {
  const message = error.message || 'Faculty operation failed.'

  const status =
    message.includes('already exists') ||
    message.includes('already registered')
      ? 409
      : message.includes('not found') ||
          message.includes('does not belong') ||
          message.includes('inactive')
        ? 404
        : message.includes('required') ||
            message.includes('valid') ||
            message.includes('Invalid') ||
            message.includes('Maximum') ||
            message.includes('complete account activation')
          ? 400
          : 500

  return res.status(status).json({
    success: false,
    message,
  })
}

function validateSchoolId(req, res) {
  const result = z.string().uuid().safeParse(req.params.schoolId)

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid school ID.',
    })
    return null
  }

  return result.data
}

// ======================================================
// GET FACULTY DIRECTORY
// ======================================================

export async function getSchoolFacultyData(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const result = await getSchoolFaculty(schoolId, {
      search: req.query.search,
      departmentId: req.query.departmentId,
      accountStatus: req.query.accountStatus,
    })

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// GET FORM OPTIONS
// ======================================================

export async function getSchoolFacultyOptionsData(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const result = await getSchoolFacultyOptions(schoolId)

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// GET FACULTY DETAILS
// ======================================================

export async function getSchoolFacultyDetailsData(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const facultyId = z.string().uuid().safeParse(req.params.facultyId)

    if (!facultyId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty ID.',
      })
    }

    const result = await getSchoolFacultyDetails(
      schoolId,
      facultyId.data
    )

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found.',
      })
    }

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// CREATE FACULTY
// ======================================================

export async function addSchoolFaculty(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const validation = facultySchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the faculty information.',
        errors: validation.error.flatten(),
      })
    }

    const result = await createSchoolFaculty(
      schoolId,
      validation.data
    )

    return res.status(201).json({
      success: true,
      message: 'Faculty member registered successfully. Account is pending activation.',
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// UPDATE FACULTY
// ======================================================

export async function editSchoolFaculty(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const facultyId = z.string().uuid().safeParse(req.params.facultyId)

    if (!facultyId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty ID.',
      })
    }

    const validation = facultySchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the faculty information.',
        errors: validation.error.flatten(),
      })
    }

    const result = await updateSchoolFaculty(
      schoolId,
      facultyId.data,
      validation.data
    )

    return res.json({
      success: true,
      message: 'Faculty details updated successfully.',
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// UPDATE ACCOUNT STATUS
// ======================================================

export async function changeSchoolFacultyAccountStatus(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const facultyId = z.string().uuid().safeParse(req.params.facultyId)

    if (!facultyId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty ID.',
      })
    }

    const validation = statusSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status.',
      })
    }

    const result = await setSchoolFacultyStatus(
      schoolId,
      facultyId.data,
      validation.data.accountStatus
    )

    return res.json({
      success: true,
      message: 'Faculty account status updated successfully.',
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}

// ======================================================
// BULK FACULTY REGISTRATION
// ======================================================

export async function bulkAddSchoolFaculty(req, res) {
  try {
    const schoolId = validateSchoolId(req, res)
    if (!schoolId) return

    const rowsSchema = z.object({
      faculty: z.array(facultySchema).min(1).max(500),
    })

    const validation = rowsSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the uploaded faculty data.',
        errors: validation.error.flatten(),
      })
    }

    const result = await bulkCreateSchoolFaculty(
      schoolId,
      validation.data.faculty
    )

    return res.status(200).json({
      success: true,
      message: 'Bulk faculty registration processed.',
      data: result,
    })
  } catch (error) {
    return sendFacultyError(res, error)
  }
}
