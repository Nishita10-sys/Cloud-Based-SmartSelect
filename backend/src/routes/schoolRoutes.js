
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

import {
  getSchoolStudents,
  getSchoolStudentDetails,
  getSchoolStudentOptions,
  addSchoolStudent,
  changeSchoolStudentAccountStatus,
} from '../controllers/studentManagementController.js'

const router = Router()

// Only authenticated University Admins can access school routes.
router.use(authenticateUser)
router.use(authorizeRoles('admin'))

// ======================================================
// SCHOOL DASHBOARD
// ======================================================

router.get('/:schoolId/dashboard', getSchoolDashboardData)

// ======================================================
// DEPARTMENT MANAGEMENT
// ======================================================

router.get('/:schoolId/departments', getDepartments)
router.post('/:schoolId/departments', createDepartmentData)
router.put('/:schoolId/departments/:departmentId', updateDepartmentData)

router.patch(
  '/:schoolId/departments/:departmentId/status',
  updateDepartmentStatus
)

// ======================================================
// SCHOOL STUDENT MANAGEMENT
// ======================================================

// Keep options before the studentId route.
router.get('/:schoolId/students/options', getSchoolStudentOptions)

// Student directory and filters.
router.get('/:schoolId/students', getSchoolStudents)

// Individual student details.
router.get(
  '/:schoolId/students/:studentId',
  getSchoolStudentDetails
)

// Create a student inside the selected school.
router.post('/:schoolId/students', addSchoolStudent)

// Update student account status within the selected school.
router.patch(
  '/:schoolId/students/:studentId/status',
  changeSchoolStudentAccountStatus
)

export default router
