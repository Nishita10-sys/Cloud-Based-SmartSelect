
import api from './api'

const schoolService = {
  // Get school dashboard.
  async getDashboard(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/dashboard`
    )

    return response.data
  },

  // Get departments for a selected school.
  async getDepartments(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/departments`
    )

    return response.data
  },

  // Create a department.
  async createDepartment(schoolId, departmentData) {
    const response = await api.post(
      `/schools/${schoolId}/departments`,
      departmentData
    )

    return response.data
  },

  // Update department details.
  async updateDepartment(schoolId, departmentId, departmentData) {
    const response = await api.put(
      `/schools/${schoolId}/departments/${departmentId}`,
      departmentData
    )

    return response.data
  },

  // Activate or deactivate a department.
  async updateDepartmentStatus(schoolId, departmentId, isActive) {
    const response = await api.patch(
      `/schools/${schoolId}/departments/${departmentId}/status`,
      { is_active: isActive }
    )

    return response.data
  },
}

export default schoolService
