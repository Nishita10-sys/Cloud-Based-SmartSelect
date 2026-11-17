import { z } from 'zod'

import {
  getFacultyDashboardData,
  getFacultyElectives,
  getFacultyStudents,
} from '../services/facultyDashboardService.js'

function sendError(res, error) {
  console.error('Faculty dashboard error:', error.message)

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Unable to process faculty dashboard request.',
  })
}

export async function getDashboard(req, res) {
  try {
    const data = await getFacultyDashboardData(req.user.id)

    return res.status(200).json({
      success: true,
      message: 'Faculty dashboard retrieved successfully.',
      data,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

export async function getMyElectives(req, res) {
  try {
    const data = await getFacultyElectives(req.user.id)

    return res.status(200).json({
      success: true,
      message: 'Assigned electives retrieved successfully.',
      data,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

export async function getMyStudents(req, res) {
  try {
    const data = await getFacultyStudents(req.user.id)

    return res.status(200).json({
      success: true,
      message: 'Assigned elective students retrieved successfully.',
      data,
    })
  } catch (error) {
    return sendError(res, error)
  }
}
