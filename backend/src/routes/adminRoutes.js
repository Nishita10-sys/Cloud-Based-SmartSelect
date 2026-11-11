
import { Router } from 'express'

import { authenticateUser } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

import {
  getAdminDashboard,
  getAllSchools,
  addSchool,
  editSchool,
  changeSchoolStatus,
} from '../controllers/adminController.js'

const router = Router()

// All Admin routes require an authenticated University Admin.
router.use(authenticateUser)
router.use(authorizeRoles('admin'))

// University dashboard
router.get('/dashboard', getAdminDashboard)

// School management
router.get('/schools', getAllSchools)
router.post('/schools', addSchool)
router.patch('/schools/:schoolId', editSchool)
router.patch('/schools/:schoolId/status', changeSchoolStatus)

export default router
