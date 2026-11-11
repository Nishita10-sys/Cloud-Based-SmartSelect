
import api from './api'

const adminService = {
  // GET UNIVERSITY ADMIN DASHBOARD
  async getDashboard() {
    const response = await api.get('/admin/dashboard')
    return response.data
  },

  // GET ALL SCHOOLS
  async getSchools() {
    const response = await api.get('/admin/schools')
    return response.data
  },

  // CREATE SCHOOL
  async createSchool(schoolData) {
    const response = await api.post('/admin/schools', schoolData)
    return response.data
  },

  // UPDATE SCHOOL
  async updateSchool(schoolId, schoolData) {
    const response = await api.patch(
      `/admin/schools/${schoolId}`,
      schoolData
    )

    return response.data
  },

  // ACTIVATE OR DEACTIVATE SCHOOL
  async updateSchoolStatus(schoolId, isActive) {
    const response = await api.patch(
      `/admin/schools/${schoolId}/status`,
      { isActive }
    )

    return response.data
  },
}

export default adminService
