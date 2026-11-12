
import { Router } from 'express'

import { authenticateUser } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

import {
  getSchoolDashboardData,
  getDepartments,
  createDepartmentData,
  updateDepartmentData,
  updateDepartmentStatus,
} from '../controllers/schoolController.js'

const router = Router()

// Only authenticated University Admins can access school routes.
router.use(authenticateUser)
router.use(authorizeRoles('admin'))

// School dashboard.
router.get('/:schoolId/dashboard', getSchoolDashboardData)

// Department management.
router.get('/:schoolId/departments', getDepartments)
router.post('/:schoolId/departments', createDepartmentData)
router.put('/:schoolId/departments/:departmentId', updateDepartmentData)
router.patch(
  '/:schoolId/departments/:departmentId/status',
  updateDepartmentStatus
)

export default router
