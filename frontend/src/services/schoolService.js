
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

  async getDepartments(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/departments`
    )

    return response.data
  },

  async createDepartment(schoolId, departmentData) {
    const response = await api.post(
      `/schools/${schoolId}/departments`,
      departmentData
    )

    return response.data
  },

  async updateDepartment(schoolId, departmentId, departmentData) {
    const response = await api.put(
      `/schools/${schoolId}/departments/${departmentId}`,
      departmentData
    )

    return response.data
  },

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
  // STUDENT MANAGEMENT
  // ====================================================

  // Retrieve students belonging to the selected school.
  async getStudents(schoolId, filters = {}) {
    const response = await api.get(
      `/schools/${schoolId}/students`,
      {
        params: filters,
      }
    )

    return response.data
  },

  // Retrieve school-specific form options.
  async getStudentOptions(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/students/options`
    )

    return response.data
  },

  // Retrieve an individual student's details.
  async getStudentDetails(schoolId, studentId) {
    const response = await api.get(
      `/schools/${schoolId}/students/${studentId}`
    )

    return response.data
  },

  // Create a student in the selected school.
  async createStudent(schoolId, studentData) {
    const response = await api.post(
      `/schools/${schoolId}/students`,
      studentData
    )

    return response.data
  },

  // Update a student's account status.
  async updateStudentStatus(schoolId, studentId, accountStatus) {
    const response = await api.patch(
      `/schools/${schoolId}/students/${studentId}/status`,
      {
        accountStatus,
      }
    )

    return response.data
  },
}

export default schoolService
