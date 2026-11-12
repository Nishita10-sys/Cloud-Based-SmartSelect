
import api from './api'

const adminService = {
  // ======================================================
  // UNIVERSITY ADMIN DASHBOARD
  // ======================================================

  async getDashboard() {
    const response = await api.get('/admin/dashboard')
    return response.data
  },

  // ======================================================
  // SCHOOL MANAGEMENT
  // ======================================================

  async getSchools() {
    const response = await api.get('/admin/schools')
    return response.data
  },

  async createSchool(schoolData) {
    const response = await api.post('/admin/schools', schoolData)
    return response.data
  },

  async updateSchool(schoolId, schoolData) {
    const response = await api.patch(
      `/admin/schools/${schoolId}`,
      schoolData
    )
    return response.data
  },

  async updateSchoolStatus(schoolId, isActive) {
    const response = await api.patch(
      `/admin/schools/${schoolId}/status`,
      { isActive }
    )
    return response.data
  },

  // ======================================================
  // ACADEMIC YEAR MANAGEMENT
  // ======================================================

  async getAcademicYears() {
    const response = await api.get('/admin/academic-years')
    return response.data
  },

  async createAcademicYear(yearData) {
    const response = await api.post(
      '/admin/academic-years',
      yearData
    )
    return response.data
  },

  async updateAcademicYear(yearId, yearData) {
    const response = await api.patch(
      `/admin/academic-years/${yearId}`,
      yearData
    )
    return response.data
  },

  async updateAcademicYearStatus(yearId, isActive) {
    const response = await api.patch(
      `/admin/academic-years/${yearId}/status`,
      { isActive }
    )
    return response.data
  },

  async setCurrentAcademicYear(yearId) {
    const response = await api.patch(
      `/admin/academic-years/${yearId}/current`
    )
    return response.data
  },

  // ======================================================
  // SEMESTER MANAGEMENT
  // ======================================================

  async getAcademicTerms(yearId) {
    const response = await api.get(
      `/admin/academic-years/${yearId}/semesters`
    )
    return response.data
  },

  async createAcademicTerm(yearId, semesterData) {
    const response = await api.post(
      `/admin/academic-years/${yearId}/semesters`,
      semesterData
    )
    return response.data
  },

  async updateAcademicTerm(yearId, termId, semesterData) {
    const response = await api.patch(
      `/admin/academic-years/${yearId}/semesters/${termId}`,
      semesterData
    )
    return response.data
  },

  async updateAcademicTermStatus(termId, isActive) {
    const response = await api.patch(
      `/admin/semesters/${termId}/status`,
      { isActive }
    )
    return response.data
  },
}

export default adminService
