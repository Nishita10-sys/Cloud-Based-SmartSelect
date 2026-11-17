
import { Router } from 'express'

import { authenticateUser } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

import {
  getStudentDashboard,
} from '../controllers/studentDashboardController.js'

import {
  getAvailableElectives,
  getElectiveDetails,
  getMyElectiveSelection,
  selectMyElective,
} from '../controllers/studentElectiveController.js'

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/studentNotificationController.js'

const router = Router()

// All student routes require an authenticated student account.
router.use(authenticateUser, authorizeRoles('student'))

// Student dashboard.
router.get('/dashboard', getStudentDashboard)

// Student elective selection.
router.get('/electives', getAvailableElectives)
router.get('/electives/selection', getMyElectiveSelection)
router.get('/electives/:offeringId', getElectiveDetails)
router.post('/electives/select', selectMyElective)

// Student notifications.
router.get('/notifications/unread-count', getUnreadNotificationCount)
router.get('/notifications', getNotifications)
router.patch('/notifications/read-all', markAllNotificationsAsRead)
router.patch('/notifications/:notificationId/read', markNotificationAsRead)

export default router
