
import api from './api'

// ======================================================
// SCHOOL SERVICE
// ======================================================

const schoolService = {
  // ====================================================
  // SCHOOL DASHBOARD
  // ====================================================

  async getDashboard(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/dashboard`
    )

    return response.data
  },

  // ====================================================
  // DEPARTMENTS
  // ====================================================

  // Retrieve all departments belonging to one school.
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

  // Update a department.
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
      {
        is_active: isActive,
      }
    )

    return response.data
  },

  // ====================================================
  // STUDENTS
  // ====================================================

  // Retrieve students belonging to one school.
  async getStudents(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/students`
    )

    return response.data
  },
}

export default schoolService
