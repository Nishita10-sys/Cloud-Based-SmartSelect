
import { z } from 'zod'

import {
  getSchoolDashboard,
  getSchoolDepartments,
  createDepartment,
  updateDepartment,
  setDepartmentStatus,
} from '../services/schoolService.js'

const schoolIdSchema = z.string().uuid()
const departmentIdSchema = z.string().uuid()

const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must contain at least 2 characters.'),
  code: z.string().trim().min(2, 'Department code must contain at least 2 characters.'),
})

const statusSchema = z.object({
  is_active: z.boolean(),
})

// GET SCHOOL DASHBOARD
export async function getSchoolDashboardData(req, res) {
  const validation = schoolIdSchema.safeParse(req.params.schoolId)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid school ID.',
    })
  }

  try {
    const result = await getSchoolDashboard(validation.data)

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'School not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'School dashboard data retrieved successfully.',
      data: result,
    })
  } catch (error) {
    console.error('School dashboard error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve school dashboard data.',
    })
  }
}

// GET DEPARTMENTS
export async function getDepartments(req, res) {
  const validation = schoolIdSchema.safeParse(req.params.schoolId)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid school ID.',
    })
  }

  try {
    const departments = await getSchoolDepartments(validation.data)

    return res.status(200).json({
      success: true,
      data: departments,
    })
  } catch (error) {
    console.error('Get departments error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve departments.',
    })
  }
}

// CREATE DEPARTMENT
export async function createDepartmentData(req, res) {
  const schoolValidation = schoolIdSchema.safeParse(req.params.schoolId)
  const bodyValidation = departmentSchema.safeParse(req.body)

  if (!schoolValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid department details.',
      errors: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
    })
  }

  try {
    const department = await createDepartment(
      schoolValidation.data,
      bodyValidation.data
    )

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: department,
    })
  } catch (error) {
    console.error('Create department error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to create department.',
    })
  }
}

// UPDATE DEPARTMENT
export async function updateDepartmentData(req, res) {
  const schoolValidation = schoolIdSchema.safeParse(req.params.schoolId)
  const departmentValidation = departmentIdSchema.safeParse(req.params.departmentId)
  const bodyValidation = departmentSchema.safeParse(req.body)

  if (
    !schoolValidation.success ||
    !departmentValidation.success ||
    !bodyValidation.success
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid department details.',
    })
  }

  try {
    const department = await updateDepartment(
      schoolValidation.data,
      departmentValidation.data,
      bodyValidation.data
    )

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found in this school.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      data: department,
    })
  } catch (error) {
    console.error('Update department error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to update department.',
    })
  }
}

// ACTIVATE / DEACTIVATE DEPARTMENT
export async function updateDepartmentStatus(req, res) {
  const schoolValidation = schoolIdSchema.safeParse(req.params.schoolId)
  const departmentValidation = departmentIdSchema.safeParse(req.params.departmentId)
  const bodyValidation = statusSchema.safeParse(req.body)

  if (
    !schoolValidation.success ||
    !departmentValidation.success ||
    !bodyValidation.success
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid department status details.',
    })
  }

  try {
    const department = await setDepartmentStatus(
      schoolValidation.data,
      departmentValidation.data,
      bodyValidation.data.is_active
    )

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found in this school.',
      })
    }

    return res.status(200).json({
      success: true,
      message: `Department ${bodyValidation.data.is_active ? 'activated' : 'deactivated'} successfully.`,
      data: department,
    })
  } catch (error) {
    console.error('Department status error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to update department status.',
    })
  }
}
