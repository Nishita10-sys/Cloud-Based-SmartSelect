
import api from './api'

// ======================================================
// SCHOOL SERVICE
// ======================================================

const schoolService = {
  // ====================================================
  // SCHOOL DASHBOARD
  // ====================================================

  async getDashboard(schoolId) {
    const response = await api.get(`/schools/${schoolId}/dashboard`)
    return response.data
  },

  // ====================================================
  // DEPARTMENTS
  // ====================================================

  async getDepartments(schoolId) {
    const response = await api.get(`/schools/${schoolId}/departments`)
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
      { is_active: isActive }
    )
    return response.data
  },

  // ====================================================
  // STUDENT MANAGEMENT
  // ====================================================

  async getStudents(schoolId, filters = {}) {
    const response = await api.get(
      `/schools/${schoolId}/students`,
      { params: filters }
    )
    return response.data
  },

  async getStudentOptions(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/students/options`
    )
    return response.data
  },

  async getStudentDetails(schoolId, studentId) {
    const response = await api.get(
      `/schools/${schoolId}/students/${studentId}`
    )
    return response.data
  },

  async createStudent(schoolId, studentData) {
    const response = await api.post(
      `/schools/${schoolId}/students`,
      studentData
    )
    return response.data
  },

    async bulkCreateStudents(schoolId, studentRows) {
    const response = await api.post(
      `/schools/${schoolId}/students/bulk`,
      { students: studentRows }
    )
    return response.data
  },

  async updateStudentStatus(schoolId, studentId, accountStatus) {
    const response = await api.patch(
      `/schools/${schoolId}/students/${studentId}/status`,
      { accountStatus }
    )
    return response.data
  },

  async assignStudentAcademicRecord(schoolId, studentId, placement) {
    const response = await api.put(
      `/schools/${schoolId}/students/${studentId}/academic-record`,
      placement
    )
    return response.data
  },

  // ====================================================
  // FACULTY MANAGEMENT
  // ====================================================

  async getFaculty(schoolId, filters = {}) {
    const response = await api.get(
      `/schools/${schoolId}/faculty`,
      { params: filters }
    )
    return response.data
  },

  async getFacultyOptions(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/faculty/options`
    )
    return response.data
  },

  async getFacultyDetails(schoolId, facultyId) {
    const response = await api.get(
      `/schools/${schoolId}/faculty/${facultyId}`
    )
    return response.data
  },

  async createFaculty(schoolId, facultyData) {
    const response = await api.post(
      `/schools/${schoolId}/faculty`,
      facultyData
    )
    return response.data
  },

  async updateFaculty(schoolId, facultyId, facultyData) {
    const response = await api.put(
      `/schools/${schoolId}/faculty/${facultyId}`,
      facultyData
    )
    return response.data
  },

  async updateFacultyStatus(schoolId, facultyId, accountStatus) {
    const response = await api.patch(
      `/schools/${schoolId}/faculty/${facultyId}/status`,
      { accountStatus }
    )
    return response.data
  },

  async bulkCreateFaculty(schoolId, facultyRows) {
    const response = await api.post(
      `/schools/${schoolId}/faculty/bulk`,
      { faculty: facultyRows }
    )
    return response.data
  },

  // ====================================================
  // ELECTIVE MANAGEMENT
  // ====================================================

  async getElectiveOptions(schoolId) {
    const response = await api.get(
      `/schools/${schoolId}/electives/options`
    )
    return response.data
  },

  async getElectives(schoolId, filters = {}) {
    const response = await api.get(
      `/schools/${schoolId}/electives`,
      { params: filters }
    )
    return response.data
  },

  async getElectiveDetails(schoolId, offeringId) {
    const response = await api.get(
      `/schools/${schoolId}/electives/${offeringId}`
    )
    return response.data
  },

  async createElective(schoolId, electiveData) {
    const response = await api.post(
      `/schools/${schoolId}/electives`,
      electiveData
    )
    return response.data
  },

  async updateElective(schoolId, offeringId, electiveData) {
    const response = await api.put(
      `/schools/${schoolId}/electives/${offeringId}`,
      electiveData
    )
    return response.data
  },

  async updateElectiveStatus(schoolId, offeringId, status) {
    const response = await api.patch(
      `/schools/${schoolId}/electives/${offeringId}/status`,
      { status }
    )
    return response.data
  },

  async getElectiveEnrollments(schoolId, offeringId) {
    const response = await api.get(
      `/schools/${schoolId}/electives/${offeringId}/enrollments`
    )
    return response.data
  },

  async bulkCreateElectives(schoolId, electiveRows) {
    const response = await api.post(
      `/schools/${schoolId}/electives/bulk`,
      { electives: electiveRows }
    )
    return response.data
  },
}

export default schoolService
