
import { z } from 'zod'

import {
  getSchoolElectiveOptions,
  getSchoolElectives,
  getSchoolElectiveDetails,
  createSchoolElective,
  updateSchoolElective,
  setSchoolElectiveStatus,
  getSchoolElectiveEnrollments,
  bulkCreateSchoolElectives,
} from '../services/electiveManagementService.js'

const uuidSchema = z.string().uuid()

const schoolParamsSchema = z.object({
  schoolId: uuidSchema,
})

const offeringParamsSchema = z.object({
  schoolId: uuidSchema,
  offeringId: uuidSchema,
})

const eligibilitySchema = z.array(
  z.object({
    departmentId: uuidSchema.nullable().optional(),
    specializationId: uuidSchema.nullable().optional(),
    academicYearLevel: z.enum(['FY', 'SY', 'TY', 'LY']).nullable().optional(),
  })
).min(1)

const electiveSchema = z.object({
  electiveCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  credits: z.union([z.number(), z.string(), z.null()]).optional(),
  academicTermId: uuidSchema,
  offeringCode: z.string().trim().min(1).max(40).default('A'),
  totalSeats: z.coerce.number().int().positive(),
  reservedSeats: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(['draft', 'published', 'open', 'closed', 'cancelled']).default('draft'),
  eligibility: eligibilitySchema,
  facultyIds: z.array(uuidSchema).default([]),
})

function sendError(res, error) {
  const message = error?.message || 'Something went wrong.'

  const status = /not found/i.test(message)
    ? 404
    : /already exists|duplicate|unique/i.test(message)
      ? 409
      : 400

  return res.status(status).json({
    success: false,
    message,
  })
}

export async function getSchoolElectiveOptionsData(req, res) {
  try {
    const params = schoolParamsSchema.parse(req.params)

    const data = await getSchoolElectiveOptions(params.schoolId)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid school ID.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function getSchoolElectivesData(req, res) {
  try {
    const params = schoolParamsSchema.parse(req.params)

    const filters = {
      status: req.query.status || undefined,
      academicTermId: req.query.academicTermId || undefined,
    }

    if (
      filters.status &&
      !['draft', 'published', 'open', 'closed', 'cancelled'].includes(filters.status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offering status filter.',
      })
    }

    if (filters.academicTermId) {
      uuidSchema.parse(filters.academicTermId)
    }

    const data = await getSchoolElectives(params.schoolId, filters)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function getSchoolElectiveDetailsData(req, res) {
  try {
    const params = offeringParamsSchema.parse(req.params)

    const data = await getSchoolElectiveDetails(
      params.schoolId,
      params.offeringId
    )

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function addSchoolElective(req, res) {
  try {
    const params = schoolParamsSchema.parse(req.params)
    const body = electiveSchema.parse(req.body)

    const data = await createSchoolElective({
      schoolId: params.schoolId,
      ...body,
      createdBy: req.user?.id,
    })

    return res.status(201).json({
      success: true,
      message: 'Elective created successfully.',
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Please check the elective details.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function editSchoolElective(req, res) {
  try {
    const params = offeringParamsSchema.parse(req.params)
    const body = electiveSchema.parse(req.body)

    const data = await updateSchoolElective({
      schoolId: params.schoolId,
      offeringId: params.offeringId,
      ...body,
      updatedBy: req.user?.id,
    })

    return res.status(200).json({
      success: true,
      message: 'Elective updated successfully.',
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Please check the elective details.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function changeSchoolElectiveStatus(req, res) {
  try {
    const params = offeringParamsSchema.parse(req.params)

    const body = z.object({
      status: z.enum(['draft', 'published', 'open', 'closed', 'cancelled']),
    }).parse(req.body)

    const data = await setSchoolElectiveStatus(
      params.schoolId,
      params.offeringId,
      body.status
    )

    return res.status(200).json({
      success: true,
      message: 'Elective status updated successfully.',
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status or request parameters.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function getSchoolElectiveEnrollmentsData(req, res) {
  try {
    const params = offeringParamsSchema.parse(req.params)

    const data = await getSchoolElectiveEnrollments(
      params.schoolId,
      params.offeringId
    )

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}

export async function bulkAddSchoolElectives(req, res) {
  try {
    const params = schoolParamsSchema.parse(req.params)

    const body = z.object({
      electives: z.array(electiveSchema).min(1).max(500),
    }).parse(req.body)

    const data = await bulkCreateSchoolElectives({
      schoolId: params.schoolId,
      rows: body.electives,
      createdBy: req.user?.id,
    })

    return res.status(200).json({
      success: true,
      message: 'Bulk elective import processed.',
      data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Please check the uploaded elective data.',
        errors: error.issues,
      })
    }

    return sendError(res, error)
  }
}
