
import { z } from 'zod'

import {
  getAvailableStudentElectives,
  getStudentElectiveDetails,
  getStudentPermanentElective,
  selectPermanentStudentElective,
} from '../services/studentElectiveService.js'

const offeringIdSchema = z.string().uuid()

const selectElectiveSchema = z.object({
  offeringId: z.string().uuid(),
})

function handleError(res, error, fallbackMessage) {
  console.error('Student elective error:', error.message)

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode
      ? error.message
      : fallbackMessage,
  })
}

export async function getAvailableElectives(req, res) {
  try {
    const result = await getAvailableStudentElectives(req.user.id)

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to retrieve available electives.'
    )
  }
}

export async function getElectiveDetails(req, res) {
  try {
    const validation = offeringIdSchema.safeParse(
      req.params.offeringId
    )

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid elective offering ID.',
      })
    }

    const offering = await getStudentElectiveDetails(
      req.user.id,
      validation.data
    )

    return res.status(200).json({
      success: true,
      message: 'Elective details retrieved successfully.',
      data: { offering },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to retrieve elective details.'
    )
  }
}

export async function getMyElectiveSelection(req, res) {
  try {
    const selection = await getStudentPermanentElective(
      req.user.id
    )

    return res.status(200).json({
      success: true,
      message: selection
        ? 'Your permanent elective selection was retrieved successfully.'
        : 'You have not selected an elective yet.',
      data: { selection },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to retrieve your elective selection.'
    )
  }
}

export async function selectMyElective(req, res) {
  try {
    const validation = selectElectiveSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid elective offering ID.',
      })
    }

    const selection = await selectPermanentStudentElective(
      req.user.id,
      validation.data.offeringId
    )

    return res.status(201).json({
      success: true,
      message:
        'Your permanent elective has been selected successfully. This selection cannot be changed.',
      data: { selection },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to complete your elective selection.'
    )
  }
}
