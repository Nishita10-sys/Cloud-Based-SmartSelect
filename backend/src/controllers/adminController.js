
import { z } from 'zod'
import {
  getSchoolsWithStats,
  createSchool,
  updateSchool,
  setSchoolStatus,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  setAcademicYearStatus,
  setCurrentAcademicYear,
  getAcademicTerms,
  createAcademicTerm,
  updateAcademicTerm,
  setAcademicTermStatus,
} from '../services/adminService.js'

// ======================================================
// VALIDATION SCHEMAS
// ======================================================

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

const academicYearIdSchema = z.string().uuid()

const academicYearSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Academic year code contains invalid characters.'
    ),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
}).refine(
  data => data.endDate > data.startDate,
  {
    message: 'End date must be after start date.',
    path: ['endDate'],
  }
)

const academicYearStatusSchema = z.object({
  isActive: z.boolean(),
})


const academicTermIdSchema = z.string().uuid()

const academicTermSchema = z.object({
  semesterNumber: z.number().int().min(1).max(8),
  name: z.string().trim().min(1).max(255),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
}).refine(
  data => data.endDate > data.startDate,
  {
    message: 'Semester end date must be after its start date.',
    path: ['endDate'],
  }
)

const academicTermStatusSchema = z.object({
  isActive: z.boolean(),
})

// ======================================================
// ERROR HANDLING
// ======================================================

function sendDatabaseError(res, error, operation, entity = 'school') {
  console.error(`Admin ${operation} ${entity} error:`, error.message)

  if (error.message.includes('duplicate key')) {
    return res.status(409).json({
      success: false,
      message: entity === 'academic year'
        ? 'An academic year with this name or code already exists.'
        : 'A school with this code already exists.',
    })
  }

  if (error.message.includes('Academic year does not exist or is inactive')) {
    return res.status(400).json({
      success: false,
      message: 'The selected academic year does not exist or is inactive.',
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
    message: `Unable to ${operation} ${entity} data.`,
  })
}

// ======================================================
// UNIVERSITY DASHBOARD
// ======================================================

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

// ======================================================
// SCHOOL MANAGEMENT
// ======================================================

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

// ======================================================
// ACADEMIC YEAR MANAGEMENT
// ======================================================

// GET ALL ACADEMIC YEARS
export async function getAllAcademicYears(req, res) {
  try {
    const years = await getAcademicYears()

    return res.status(200).json({
      success: true,
      message: 'Academic years retrieved successfully.',
      data: years,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'retrieve', 'academic year')
  }
}

// CREATE ACADEMIC YEAR
export async function addAcademicYear(req, res) {
  const validation = academicYearSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid academic year details.',
      errors: validation.error.issues,
    })
  }

  try {
    const year = await createAcademicYear(validation.data)

    return res.status(201).json({
      success: true,
      message: 'Academic year created successfully.',
      data: year,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'create', 'academic year')
  }
}

// EDIT ACADEMIC YEAR
export async function editAcademicYear(req, res) {
  const idValidation = academicYearIdSchema.safeParse(req.params.yearId)
  const bodyValidation = academicYearSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid academic year ID and details.',
    })
  }

  try {
    const year = await updateAcademicYear(
      idValidation.data,
      bodyValidation.data
    )

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Academic year updated successfully.',
      data: year,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'update', 'academic year')
  }
}

// ACTIVATE OR DEACTIVATE ACADEMIC YEAR

// ACTIVATE OR DEACTIVATE ACADEMIC YEAR
export async function changeAcademicYearStatus(req, res) {
  const idValidation = academicYearIdSchema.safeParse(req.params.yearId)
  const bodyValidation = academicYearStatusSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid academic year ID and status.',
    })
  }

  try {
    const year = await setAcademicYearStatus(
      idValidation.data,
      bodyValidation.data.isActive
    )

    return res.status(200).json({
      success: true,
      message: bodyValidation.data.isActive
        ? 'Academic year activated successfully.'
        : 'Academic year deactivated successfully.',
      data: year,
    })
  } catch (error) {
    if (error.message.includes('cannot be deactivated')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      })
    }

    if (error.message.includes('Academic year not found')) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found.',
      })
    }

    return sendDatabaseError(res, error, 'update', 'academic year')
  }
}


// SET CURRENT ACADEMIC YEAR
export async function changeCurrentAcademicYear(req, res) {
  const idValidation = academicYearIdSchema.safeParse(req.params.yearId)

  if (!idValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid academic year ID.',
    })
  }

  try {
    const year = await setCurrentAcademicYear(idValidation.data)

    return res.status(200).json({
      success: true,
      message: 'Current academic year changed successfully.',
      data: year,
    })
  } catch (error) {
    return sendDatabaseError(res, error, 'change current', 'academic year')
  }
}

// ======================================================
// SEMESTER MANAGEMENT
// ======================================================

// GET SEMESTERS FOR AN ACADEMIC YEAR
export async function getAcademicTermsForYear(req, res) {
  const idValidation = academicYearIdSchema.safeParse(req.params.yearId)

  if (!idValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid academic year ID.',
    })
  }

  try {
    const terms = await getAcademicTerms(idValidation.data)

    return res.status(200).json({
      success: true,
      message: 'Semesters retrieved successfully.',
      data: terms,
    })
  } catch (error) {
    return sendSemesterError(res, error, 'retrieve')
  }
}

// CREATE SEMESTER
export async function addAcademicTerm(req, res) {
  const idValidation = academicYearIdSchema.safeParse(req.params.yearId)
  const bodyValidation = academicTermSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid semester details.',
      errors: bodyValidation.success ? undefined : bodyValidation.error.issues,
    })
  }

  try {
    const term = await createAcademicTerm({
      academicYearId: idValidation.data,
      ...bodyValidation.data,
    })

    return res.status(201).json({
      success: true,
      message: 'Semester created successfully.',
      data: term,
    })
  } catch (error) {
    return sendSemesterError(res, error, 'create')
  }
}

// EDIT SEMESTER
export async function editAcademicTerm(req, res) {
  const yearValidation = academicYearIdSchema.safeParse(req.params.yearId)
  const termValidation = academicTermIdSchema.safeParse(req.params.termId)
  const bodyValidation = academicTermSchema.safeParse(req.body)

  if (
    !yearValidation.success ||
    !termValidation.success ||
    !bodyValidation.success
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid semester details.',
      errors: bodyValidation.success ? undefined : bodyValidation.error.issues,
    })
  }

  try {
    const term = await updateAcademicTerm(
      termValidation.data,
      {
        academicYearId: yearValidation.data,
        ...bodyValidation.data,
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Semester updated successfully.',
      data: term,
    })
  } catch (error) {
    return sendSemesterError(res, error, 'update')
  }
}

// ACTIVATE OR DEACTIVATE SEMESTER
export async function changeAcademicTermStatus(req, res) {
  const idValidation = academicTermIdSchema.safeParse(req.params.termId)
  const bodyValidation = academicTermStatusSchema.safeParse(req.body)

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid semester ID and status.',
    })
  }

  try {
    const term = await setAcademicTermStatus(
      idValidation.data,
      bodyValidation.data.isActive
    )

    return res.status(200).json({
      success: true,
      message: bodyValidation.data.isActive
        ? 'Semester activated successfully.'
        : 'Semester deactivated successfully.',
      data: term,
    })
  } catch (error) {
    return sendSemesterError(res, error, 'update')
  }
}

// SEMESTER ERROR HANDLING
function sendSemesterError(res, error, operation) {
  console.error(`Admin ${operation} semester error:`, error.message)

  if (error.message.includes('already exists') ||
      error.message.includes('duplicate key')) {
    return res.status(409).json({
      success: false,
      message: error.message,
    })
  }

  if (error.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      message: error.message,
    })
  }

  if (
    error.message.includes('must be') ||
    error.message.includes('Semester number')
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  return res.status(500).json({
    success: false,
    message: `Unable to ${operation} semester.`,
  })
}
