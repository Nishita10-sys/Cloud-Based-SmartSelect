
import { z } from 'zod'

import {
  getStudentNotifications,
  getStudentUnreadCount,
  markStudentNotificationAsRead,
  markAllStudentNotificationsAsRead,
} from '../services/studentNotificationService.js'

const notificationIdSchema = z.string().uuid()

const notificationFilterSchema = z.object({
  type: z.enum([
    'general',
    'enrollment',
    'academic',
    'result',
    'system',
    'security',
  ]).optional(),
})

function handleError(res, error, fallbackMessage) {
  console.error('Student notification error:', error.message)

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode
      ? error.message
      : fallbackMessage,
  })
}

// GET /api/student/notifications
export async function getNotifications(req, res) {
  try {
    const validation = notificationFilterSchema.safeParse(req.query)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification filter.',
      })
    }

    const notifications = await getStudentNotifications(
      req.user.id,
      validation.data.type || ''
    )

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: {
        notifications,
      },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to retrieve notifications.'
    )
  }
}

// GET /api/student/notifications/unread-count
export async function getUnreadNotificationCount(req, res) {
  try {
    const count = await getStudentUnreadCount(req.user.id)

    return res.status(200).json({
      success: true,
      message: 'Unread notification count retrieved successfully.',
      data: {
        unreadCount: count,
      },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to retrieve unread notification count.'
    )
  }
}

// PATCH /api/student/notifications/read-all
export async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await markAllStudentNotificationsAsRead(req.user.id)

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: result,
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to mark notifications as read.'
    )
  }
}

// PATCH /api/student/notifications/:notificationId/read
export async function markNotificationAsRead(req, res) {
  try {
    const validation = notificationIdSchema.safeParse(
      req.params.notificationId
    )

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID.',
      })
    }

    const notification = await markStudentNotificationAsRead(
      req.user.id,
      validation.data
    )

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification,
      },
    })
  } catch (error) {
    return handleError(
      res,
      error,
      'Unable to mark notification as read.'
    )
  }
}
