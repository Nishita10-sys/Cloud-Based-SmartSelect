
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
  bulkAddSchoolStudents,
  changeSchoolStudentAccountStatus,
  assignSchoolStudentAcademicRecord,
} from '../controllers/studentManagementController.js'

import {
  getSchoolFacultyData,
  getSchoolFacultyOptionsData,
  getSchoolFacultyDetailsData,
  addSchoolFaculty,
  editSchoolFaculty,
  changeSchoolFacultyAccountStatus,
  bulkAddSchoolFaculty,
} from '../controllers/facultyManagementController.js'

import {
  getSchoolElectiveOptionsData,
  getSchoolElectivesData,
  getSchoolElectiveDetailsData,
  addSchoolElective,
  editSchoolElective,
  changeSchoolElectiveStatus,
  getSchoolElectiveEnrollmentsData,
  bulkAddSchoolElectives,
} from '../controllers/electiveManagementController.js'

const router = Router()

// Authentication and authorization
router.use(authenticateUser)
router.use(authorizeRoles('admin'))

// --------------------------------------------------
// SCHOOL DASHBOARD
// --------------------------------------------------

router.get('/:schoolId/dashboard', getSchoolDashboardData)

// --------------------------------------------------
// DEPARTMENT MANAGEMENT
// --------------------------------------------------

router.get('/:schoolId/departments', getDepartments)

router.post('/:schoolId/departments', createDepartmentData)

router.put('/:schoolId/departments/:departmentId', updateDepartmentData)

router.patch(
  '/:schoolId/departments/:departmentId/status',
  updateDepartmentStatus
)

// --------------------------------------------------
// STUDENT MANAGEMENT
// --------------------------------------------------

router.get('/:schoolId/students/options', getSchoolStudentOptions)

router.get('/:schoolId/students', getSchoolStudents)

router.get('/:schoolId/students/:studentId', getSchoolStudentDetails)

router.post('/:schoolId/students/bulk', bulkAddSchoolStudents)

router.post('/:schoolId/students', addSchoolStudent)

router.patch(
  '/:schoolId/students/:studentId/status',
  changeSchoolStudentAccountStatus
)

router.put(
  '/:schoolId/students/:studentId/academic-record',
  assignSchoolStudentAcademicRecord
)

// --------------------------------------------------
// FACULTY MANAGEMENT
// --------------------------------------------------

// Faculty form options
router.get('/:schoolId/faculty/options', getSchoolFacultyOptionsData)

// Faculty directory
router.get('/:schoolId/faculty', getSchoolFacultyData)

// Faculty details
router.get('/:schoolId/faculty/:facultyId', getSchoolFacultyDetailsData)

// Add one faculty member
router.post('/:schoolId/faculty', addSchoolFaculty)

// Bulk faculty CSV registration
router.post('/:schoolId/faculty/bulk', bulkAddSchoolFaculty)

// Edit faculty details
router.put('/:schoolId/faculty/:facultyId', editSchoolFaculty)

// Update faculty account status
router.patch(
  '/:schoolId/faculty/:facultyId/status',
  changeSchoolFacultyAccountStatus
)

// --------------------------------------------------
// ELECTIVE MANAGEMENT
// --------------------------------------------------

// Elective form options
router.get('/:schoolId/electives/options', getSchoolElectiveOptionsData)

// Elective directory
router.get('/:schoolId/electives', getSchoolElectivesData)

// Bulk elective CSV registration
router.post('/:schoolId/electives/bulk', bulkAddSchoolElectives)

// Add one elective
router.post('/:schoolId/electives', addSchoolElective)

// Elective details
router.get(
  '/:schoolId/electives/:offeringId',
  getSchoolElectiveDetailsData
)

// Edit elective
router.put(
  '/:schoolId/electives/:offeringId',
  editSchoolElective
)

// Update elective status
router.patch(
  '/:schoolId/electives/:offeringId/status',
  changeSchoolElectiveStatus
)

// View student enrollments
router.get(
  '/:schoolId/electives/:offeringId/enrollments',
  getSchoolElectiveEnrollmentsData
)

export default router
