import { Router } from 'express'

import { authenticateUser } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

import {
  getDashboard,
  getMyElectives,
  getMyStudents,
} from '../controllers/facultyDashboardController.js'

const router = Router()

// All faculty routes require an active faculty account.
router.use(authenticateUser, authorizeRoles('faculty'))

router.get('/dashboard', getDashboard)
router.get('/electives', getMyElectives)
router.get('/students', getMyStudents)

export default router
