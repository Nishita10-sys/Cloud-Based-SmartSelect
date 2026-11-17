
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  Plus,
  RefreshCw,
  Users,
  Eye,
  X,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import schoolService from '../../services/schoolService'
import './StudentManagement.css'

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  enrollmentNumber: '',
  admissionDate: '',
  admissionBatch: '',
}

function getProfile(student) {
  return student?.profile || student?.profiles || student || {}
}

function getDetails(student) {
  return student?.studentDetails || student?.student_details || student || {}
}

function getStudentName(student) {
  const profile = getProfile(student)

  return (
    profile.full_name ||
    profile.fullName ||
    student?.fullName ||
    'Unnamed student'
  )
}

function getStudentEmail(student) {
  const profile = getProfile(student)

  return profile.email || student?.email || '—'
}

function getStudentPhone(student) {
  const profile = getProfile(student)

  return profile.phone || student?.phone || '—'
}

function getEnrollment(student) {
  const details = getDetails(student)

  return (
    details.enrollment_number ||
    details.enrollmentNumber ||
    student?.enrollmentNumber ||
    '—'
  )
}

function getAccountStatus(student) {
  const profile = getProfile(student)

  return (
    profile.account_status ||
    profile.accountStatus ||
    student?.accountStatus ||
    'pending'
  )
}

function getAcademicRecord(student) {
  return (
    student?.academicRecord ||
    student?.academic_record ||
    student?.activeAcademicRecord ||
    student?.active_academic_record ||
    null
  )
}

function formatStatus(status) {
  return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
}

export default function StudentManagement({ schoolId }) {
  const [students, setStudents] = useState([])

  const [options, setOptions] = useState({
    departments: [],
    specializations: [],
    academicYears: [],
    semesters: [],
  })

  const [search, setSearch] = useState('')
  const [accountStatus, setAccountStatus] = useState('')
  const [academicYearLevel, setAcademicYearLevel] = useState('')

  const [page, setPage] = useState(1)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [form, setForm] = useState(emptyForm)

  const [message, setMessage] = useState({
    type: '',
    text: '',
  })

  // ====================================================
  // LOAD SCHOOL-SPECIFIC FORM OPTIONS
  // ====================================================

  const loadOptions = useCallback(async () => {
    if (!schoolId) return

    try {
      const response = await schoolService.getStudentOptions(schoolId)
      const data = response?.data || {}

      setOptions({
        departments: data.departments || [],
        specializations: data.specializations || [],
        academicYears: data.academicYears || data.academic_years || [],
        semesters: data.semesters || data.terms || [],
      })
    } catch (error) {
      console.error('Unable to load student form options:', error)

      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to load student form options.',
      })
    }
  }, [schoolId])

  // ====================================================
  // LOAD SCHOOL STUDENTS
  // ====================================================

  const loadStudents = useCallback(async () => {
    if (!schoolId) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await schoolService.getStudents(schoolId, {
        search,
        accountStatus,
        academicYearLevel,
        page,
        limit: 25,
      })

      setStudents(response?.data || [])

      setPagination(
        response?.pagination || {
          page,
          limit: 25,
          total: response?.data?.length || 0,
          totalPages: 1,
        }
      )
    } catch (error) {
      console.error('Unable to load school students:', error)

      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to load students. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [schoolId, search, accountStatus, academicYearLevel, page])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  // ====================================================
  // FORM HANDLING
  // ====================================================

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // ====================================================
  // CREATE STUDENT
  // ====================================================

  async function handleCreateStudent(event) {
    event.preventDefault()

    if (!schoolId) {
      setMessage({
        type: 'error',
        text: 'School information is missing.',
      })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        enrollmentNumber: form.enrollmentNumber.trim(),
        admissionDate: form.admissionDate || null,
        admissionBatch: form.admissionBatch.trim() || null,
        academicPlacement: null,
      }

      const response = await schoolService.createStudent(
        schoolId,
        payload
      )

      setShowAddModal(false)
      setForm(emptyForm)

      setMessage({
        type: 'success',
        text:
          response?.message ||
          'Student created successfully. Account is pending activation.',
      })

      setPage(1)

      // Reload the directory after creation.
      const updatedResponse = await schoolService.getStudents(schoolId, {
        search,
        accountStatus,
        academicYearLevel,
        page: 1,
        limit: 25,
      })

      setStudents(updatedResponse?.data || [])
      setPagination(
        updatedResponse?.pagination || {
          page: 1,
          limit: 25,
          total: updatedResponse?.data?.length || 0,
          totalPages: 1,
        }
      )
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to create student. Please check the details.',
      })
    } finally {
      setSaving(false)
    }
  }

  // ====================================================
  // UPDATE STUDENT ACCOUNT STATUS
  // ====================================================

  async function handleStatusChange(student, nextStatus) {
    const details = getDetails(student)

    const studentId =
      details.id ||
      student?.studentId ||
      student?.student_id

    if (!studentId) {
      setMessage({
        type: 'error',
        text: 'Student ID is missing. Unable to update account status.',
      })
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${nextStatus} this student's account?`
    )

    if (!confirmed) return

    try {
      await schoolService.updateStudentStatus(
        schoolId,
        studentId,
        nextStatus
      )

      setMessage({
        type: 'success',
        text: `Student account ${nextStatus} successfully.`,
      })

      await loadStudents()
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to update student account status.',
      })
    }
  }

  // ====================================================
  // VIEW STUDENT DETAILS
  // ====================================================

  async function handleViewDetails(student) {
    const details = getDetails(student)

    const studentId =
      details.id ||
      student?.studentId ||
      student?.student_id

    if (!studentId) {
      setMessage({
        type: 'error',
        text: 'Student ID is missing.',
      })
      return
    }

    try {
      const response = await schoolService.getStudentDetails(
        schoolId,
        studentId
      )

      setSelectedStudent(response?.data || null)
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to retrieve student details.',
      })
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  if (!schoolId) {
    return (
      <section className="student-management">
        <div className="student-alert student-alert-error">
          School information is unavailable. Please reopen the School Dashboard.
        </div>
      </section>
    )
  }

  return (
    <section className="student-management">

      {/* HEADER */}

      <div className="student-management-header">
        <div>
          <span className="student-management-eyebrow">
            SCHOOL MANAGEMENT
          </span>

          <h2>Student Management</h2>

          <p>
            Manage student profiles, enrollment details and account access
            belonging to this school.
          </p>
        </div>

        <div className="student-management-header-actions">
          <button
            className="student-btn student-btn-secondary"
            onClick={() => {
              loadStudents()
              loadOptions()
            }}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="student-btn student-btn-primary"
            onClick={() => {
              setForm(emptyForm)
              setShowAddModal(true)
            }}
          >
            <Plus size={17} />
            Add Student
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="student-summary-card">
        <div className="student-summary-icon">
          <Users size={23} />
        </div>

        <div>
          <span>Total students</span>
          <strong>{pagination.total ?? students.length}</strong>
        </div>
      </div>

      {/* ALERT MESSAGE */}

      {message.text && (
        <div className={`student-alert student-alert-${message.type}`}>
          <span>{message.text}</span>

          <button
            onClick={() => setMessage({ type: '', text: '' })}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTERS */}

      <div className="student-filter-panel">
        <div className="student-search-box">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search by name, email or enrollment number..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>

        <select
          value={accountStatus}
          onChange={(event) => {
            setAccountStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All account statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>

        <select
          value={academicYearLevel}
          onChange={(event) => {
            setAcademicYearLevel(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All academic years</option>
          <option value="FY">First Year (FY)</option>
          <option value="SY">Second Year (SY)</option>
          <option value="TY">Third Year (TY)</option>
          <option value="LY">Last Year (LY)</option>
        </select>
      </div>

      {/* STUDENT DIRECTORY */}

      <div className="student-table-card">
        <div className="student-table-heading">
          <div>
            <h3>Student Directory</h3>
            <p>Student records belonging to this school</p>
          </div>

          <span>{pagination.total ?? students.length} records</span>
        </div>

        <div className="student-table-scroll">
          <table className="student-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Enrollment No.</th>
                <th>Contact</th>
                <th>Academic Year</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="student-table-empty">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="student-table-empty">
                    No students found. Try changing your search or filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const profile = getProfile(student)
                  const details = getDetails(student)
                  const academic = getAcademicRecord(student)
                  const status = getAccountStatus(student)

                  const studentId =
                    details.id ||
                    student?.studentId ||
                    student?.student_id ||
                    profile.id

                  return (
                    <tr key={studentId}>
                      <td>
                        <div className="student-name-cell">
                          <div className="student-avatar">
                            {getStudentName(student)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{getStudentName(student)}</strong>
                            <span>{getStudentEmail(student)}</span>
                          </div>
                        </div>
                      </td>

                      <td>{getEnrollment(student)}</td>

                      <td>{getStudentPhone(student)}</td>

                      <td>
                        {academic?.academic_year_level ||
                          academic?.academicYearLevel ||
                          'Not assigned'}
                      </td>

                      <td>
                        <span
                          className={`student-status student-status-${status}`}
                        >
                          {formatStatus(status)}
                        </span>
                      </td>

                      <td>
                        <div className="student-row-actions">
                          <button
                            className="student-icon-btn"
                            title="View student details"
                            onClick={() => handleViewDetails(student)}
                          >
                            <Eye size={17} />
                          </button>

                          {status === 'active' && (
                            <button
                              className="student-icon-btn student-action-warning"
                              title="Suspend account"
                              onClick={() =>
                                handleStatusChange(student, 'suspended')
                              }
                            >
                              <ShieldAlert size={17} />
                            </button>
                          )}

                          {(status === 'suspended' ||
                            status === 'disabled') && (
                            <button
                              className="student-icon-btn student-action-success"
                              title="Reactivate account"
                              onClick={() =>
                                handleStatusChange(student, 'active')
                              }
                            >
                              <ShieldCheck size={17} />
                            </button>
                          )}

                          {status === 'active' && (
                            <button
                              className="student-icon-btn student-action-danger"
                              title="Disable account"
                              onClick={() =>
                                handleStatusChange(student, 'disabled')
                              }
                            >
                              <X size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="student-pagination">
          <span>
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              disabled={
                page >= (pagination.totalPages || 1) || loading
              }
              onClick={() => setPage((current) => current + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}

      {showAddModal && (
        <div className="student-modal-overlay">
          <div className="student-modal">

            <div className="student-modal-header">
              <div>
                <span className="student-management-eyebrow">
                  NEW RECORD
                </span>

                <h3>Add Student</h3>

                <p>Create a student profile and login account.</p>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent}>
              <div className="student-form-grid">

                <label>
                  Full Name *
                  <input
                    required
                    minLength="2"
                    value={form.fullName}
                    onChange={(event) =>
                      updateForm('fullName', event.target.value)
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Enrollment Number *
                  <input
                    required
                    value={form.enrollmentNumber}
                    onChange={(event) =>
                      updateForm('enrollmentNumber', event.target.value)
                    }
                    placeholder="Enter enrollment number"
                  />
                </label>

                <label>
                  Email Address *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm('email', event.target.value)
                    }
                    placeholder="student@example.com"
                  />
                </label>

                <label>
                  Mobile Number *
                  <input
                    required
                    type="tel"
                    pattern="\+[1-9][0-9]{7,14}"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm('phone', event.target.value)
                    }
                    placeholder="+919876543210"
                  />

                  <small>Include country code, e.g. +91.</small>
                </label>

                <label>
                  Admission Date
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={(event) =>
                      updateForm('admissionDate', event.target.value)
                    }
                  />
                </label>

                <label>
                  Admission Batch
                  <input
                    value={form.admissionBatch}
                    onChange={(event) =>
                      updateForm('admissionBatch', event.target.value)
                    }
                    placeholder="e.g. 2026"
                  />
                </label>

              </div>

              <div className="student-form-note">
                <ShieldCheck size={18} />

                <p>
                  The initial login uses the enrollment number and
                  registered mobile number as the temporary password.
                  The student must verify the email OTP and set a new
                  password before account activation.
                </p>
              </div>

              <div className="student-modal-actions">
                <button
                  type="button"
                  className="student-btn student-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="student-btn student-btn-primary"
                  disabled={saving}
                >
                  <UserPlus size={17} />

                  {saving ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAILS MODAL */}

      {selectedStudent && (
        <div
          className="student-modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="student-modal student-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-header">
              <div>
                <span className="student-management-eyebrow">
                  STUDENT PROFILE
                </span>

                <h3>{getStudentName(selectedStudent)}</h3>

                <p>{getEnrollment(selectedStudent)}</p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <div className="student-details-grid">
              <div>
                <span>Email</span>
                <strong>{getStudentEmail(selectedStudent)}</strong>
              </div>

              <div>
                <span>Mobile</span>
                <strong>{getStudentPhone(selectedStudent)}</strong>
              </div>

              <div>
                <span>Account Status</span>
                <strong>
                  {formatStatus(getAccountStatus(selectedStudent))}
                </strong>
              </div>

              <div>
                <span>Academic History</span>
                <strong>
                  {(
                    selectedStudent.academicHistory ||
                    selectedStudent.academic_history ||
                    []
                  ).length} record(s)
                </strong>
              </div>
            </div>

            <h4 className="student-history-title">
              Academic History
            </h4>

            <div className="student-history-list">
              {(
                selectedStudent.academicHistory ||
                selectedStudent.academic_history ||
                []
              ).length === 0 ? (
                <p>
                  No academic placement has been assigned yet.
                </p>
              ) : (
                (
                  selectedStudent.academicHistory ||
                  selectedStudent.academic_history ||
                  []
                ).map((record) => (
                  <div
                    className="student-history-item"
                    key={record.id}
                  >
                    <strong>
                      {record.academic_year_level ||
                        record.academicYearLevel ||
                        'Year not specified'}
                    </strong>

                    <span>
                      {record.school?.name ||
                        record.school_name ||
                        'School not specified'}
                      {' · '}
                      {record.department?.name ||
                        record.department_name ||
                        'Department not specified'}
                    </span>

                    <small>
                      {record.record_status ||
                        record.recordStatus ||
                        'Status unavailable'}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
