
import { Router } from 'express'

import { authenticateUser } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

import {
  getAdminDashboard,
  getAllSchools,
  addSchool,
  editSchool,
  changeSchoolStatus,
  getAllAcademicYears,
  addAcademicYear,
  editAcademicYear,
  changeAcademicYearStatus,
  changeCurrentAcademicYear,
  getAcademicTermsForYear,
  addAcademicTerm,
  editAcademicTerm,
  changeAcademicTermStatus,
} from '../controllers/adminController.js'

const router = Router()

// All admin routes require authentication and admin authorization.
router.use(authenticateUser)
router.use(authorizeRoles('admin'))

// ======================================================
// UNIVERSITY DASHBOARD
// ======================================================

router.get('/dashboard', getAdminDashboard)

// ======================================================
// SCHOOL MANAGEMENT
// ======================================================

router.get('/schools', getAllSchools)
router.post('/schools', addSchool)
router.patch('/schools/:schoolId', editSchool)
router.patch('/schools/:schoolId/status', changeSchoolStatus)

// ======================================================
// ACADEMIC YEAR MANAGEMENT
// ======================================================

router.get('/academic-years', getAllAcademicYears)
router.post('/academic-years', addAcademicYear)
router.patch('/academic-years/:yearId', editAcademicYear)
router.patch('/academic-years/:yearId/status', changeAcademicYearStatus)
router.patch('/academic-years/:yearId/current', changeCurrentAcademicYear)

// ======================================================
// SEMESTER MANAGEMENT
// ======================================================

router.get(
  '/academic-years/:yearId/semesters',
  getAcademicTermsForYear
)

router.post(
  '/academic-years/:yearId/semesters',
  addAcademicTerm
)

router.patch(
  '/academic-years/:yearId/semesters/:termId',
  editAcademicTerm
)

router.patch(
  '/semesters/:termId/status',
  changeAcademicTermStatus
)

export default router
