
import { useCallback, useEffect, useRef, useState } from 'react'
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
  GraduationCap,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react'

import Papa from 'papaparse'
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

const emptyAcademicForm = {
  academicYearId: '',
  academicTermId: '',
  departmentId: '',
  specializationId: '',
  academicYearLevel: '',
  division: '',
  rollNumber: '',
}

const studentCsvHeaders = [
  'full_name',
  'email',
  'phone',
  'enrollment_number',
  'admission_date',
  'admission_batch',
  'academic_year_code',
  'semester_number',
  'department_code',
  'specialization_code',
  'academic_year_level',
  'division',
  'roll_number',
]

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

function getAcademicHistory(student) {
  return student?.academicHistory || student?.academic_history || []
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
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

  // BULK STUDENT CSV UPLOAD
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)
  const fileInputRef = useRef(null)

  const [selectedStudent, setSelectedStudent] = useState(null)

  const [showAcademicModal, setShowAcademicModal] = useState(false)
  const [academicStudent, setAcademicStudent] = useState(null)
  const [academicSaving, setAcademicSaving] = useState(false)
  const [academicLoading, setAcademicLoading] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [academicForm, setAcademicForm] = useState(emptyAcademicForm)

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
  // STUDENT CSV TEMPLATE
  // ====================================================

  function downloadStudentTemplate() {
    const csv = Papa.unparse({
      fields: studentCsvHeaders,
      data: [],
    })

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'SmartSelect_Student_Template.csv'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  // ====================================================
  // VALIDATE STUDENT CSV ROWS
  // ====================================================

  function validateStudentCsvRows(rows) {
    const seenEmails = new Set()
    const seenEnrollments = new Set()

    return rows.map((row, index) => {
      const errors = []

      const email = String(row.email || '').trim().toLowerCase()
      const enrollmentNumber = String(
        row.enrollment_number || ''
      ).trim()

      const fullName = String(row.full_name || '').trim()
      const phone = String(row.phone || '').trim()

      const admissionDate = String(
        row.admission_date || ''
      ).trim()

      if (fullName.length < 2 || fullName.length > 255) {
        errors.push('Full name must contain 2–255 characters.')
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Enter a valid email address.')
      }

      if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) {
        errors.push(
          'Phone must include country code, e.g. +919876543210.'
        )
      }

      if (!enrollmentNumber || enrollmentNumber.length > 100) {
        errors.push('Enrollment number is required and must not exceed 100 characters.')
      }

      if (admissionDate && !isValidDate(admissionDate)) {
        errors.push('Admission date must be a valid date in YYYY-MM-DD format.')
      }

      if (email) {
        if (seenEmails.has(email)) {
          errors.push('Duplicate email address in this CSV.')
        }

        seenEmails.add(email)
      }

      const normalizedEnrollment = enrollmentNumber.toLowerCase()

      if (normalizedEnrollment) {
        if (seenEnrollments.has(normalizedEnrollment)) {
          errors.push('Duplicate enrollment number in this CSV.')
        }

        seenEnrollments.add(normalizedEnrollment)
      }

      const academicFields = [
        row.academic_year_code,
        row.semester_number,
        row.department_code,
        row.specialization_code,
        row.academic_year_level,
        row.division,
        row.roll_number,
      ]

      const hasAcademicDetails = academicFields.some(
        (value) => String(value || '').trim() !== ''
      )

      if (hasAcademicDetails) {
        if (!String(row.academic_year_code || '').trim()) {
          errors.push('Academic year code is required when academic details are supplied.')
        }

        if (!/^[1-8]$/.test(String(row.semester_number || '').trim())) {
          errors.push('Semester number must be between 1 and 8.')
        }

        if (!String(row.department_code || '').trim()) {
          errors.push('Department code is required when academic details are supplied.')
        }

        if (!['FY', 'SY', 'TY', 'LY'].includes(
          String(row.academic_year_level || '').trim().toUpperCase()
        )) {
          errors.push('Academic year level must be FY, SY, TY or LY.')
        }
      }

      return {
        ...row,
        full_name: fullName,
        email,
        phone,
        enrollment_number: enrollmentNumber,
        _rowNumber: index + 2,
        _errors: errors,
      }
    })
  }

  // ====================================================
  // HANDLE CSV FILE SELECTION
  // ====================================================

  function handleStudentCsvFile(event) {
    const file = event.target.files?.[0]

    if (!file) return

    setCsvRows([])
    setCsvErrors([])
    setBulkResult(null)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvErrors(['Please select a CSV file.'])
      event.target.value = ''
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),

      complete: (results) => {
        if (results.errors?.length > 0) {
          setCsvErrors(
            results.errors.map(
              (error) =>
                `CSV parsing error: ${error.message}`
            )
          )
          return
        }

        const headers = results.meta.fields || []

        const missingHeaders = studentCsvHeaders.filter(
          (header) =>
            !headers.includes(header) &&
            [
              'full_name',
              'email',
              'phone',
              'enrollment_number',
            ].includes(header)
        )

        if (missingHeaders.length > 0) {
          setCsvErrors([
            `Missing required columns: ${missingHeaders.join(', ')}`,
          ])
          return
        }

        if (results.data.length === 0) {
          setCsvErrors(['The CSV file contains no student records.'])
          return
        }

        if (results.data.length > 200) {
          setCsvErrors([
            `Maximum 200 students per upload. Your file contains ${results.data.length} records.`,
          ])
          return
        }

        const validatedRows = validateStudentCsvRows(results.data)

        const allErrors = validatedRows.flatMap((row) =>
          row._errors.map((error) => ({
            row: row._rowNumber,
            message: error,
          }))
        )

        setCsvRows(validatedRows)
        setCsvErrors(allErrors)
      },

      error: (error) => {
        setCsvErrors([
          error.message || 'Unable to read the CSV file.',
        ])
      },
    })
  }

  // ====================================================
  // CLOSE CSV MODAL
  // ====================================================

  function closeBulkModal() {
    if (bulkLoading) return

    setShowBulkModal(false)
    setCsvRows([])
    setCsvErrors([])
    setBulkResult(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ====================================================
  // BULK STUDENT REGISTRATION
  // ====================================================

  async function handleStudentBulkUpload() {
    if (!schoolId) return

    if (csvRows.length === 0) {
      setCsvErrors([
        'Please select a CSV file containing student records.',
      ])
      return
    }

    if (csvErrors.length > 0) {
      return
    }

    const confirmed = window.confirm(
      `You are about to register ${csvRows.length} students. Continue?`
    )

    if (!confirmed) return

    setBulkLoading(true)
    setBulkResult(null)

    try {
      const studentRows = csvRows.map((row) => {
        const {
          _rowNumber,
          _errors,
          ...student
        } = row

        return student
      })

      const response = await schoolService.bulkCreateStudents(
        schoolId,
        studentRows
      )

      const result = response?.data || response

      setBulkResult(result)

      await loadStudents()

      setMessage({
        type:
          result.failed > 0
            ? 'error'
            : 'success',
        text:
          result.failed > 0
            ? `Bulk registration completed: ${result.successful} successful and ${result.failed} failed.`
            : `${result.successful} students registered successfully.`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to process the student CSV upload.',
      })
    } finally {
      setBulkLoading(false)
    }
  }

  // ====================================================
  // FORM HANDLING
  // ====================================================

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateAcademicForm(field, value) {
    setAcademicForm((current) => ({
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
  // OPEN ACADEMIC PLACEMENT FORM
  // ====================================================

  async function handleOpenAcademicPlacement(student) {
    const details = getDetails(student)

    const studentId =
      details.id ||
      student?.studentId ||
      student?.student_id

    if (!studentId) {
      setMessage({
        type: 'error',
        text: 'Student ID is missing. Unable to assign academic record.',
      })
      return
    }

    setAcademicLoading(true)
    setAcademicStudent(null)
    setAcademicForm(emptyAcademicForm)
    setShowAcademicModal(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await schoolService.getStudentDetails(
        schoolId,
        studentId
      )

      const fullStudent = response?.data

      if (!fullStudent) {
        throw new Error('Student details were not returned by the server.')
      }

      setAcademicStudent(fullStudent)

      const history = getAcademicHistory(fullStudent)
      const latestRecord = history[0] || null

      if (latestRecord) {
        const term = latestRecord.academic_term || {}

        setAcademicForm({
          academicYearId: term.academic_year_id || '',
          academicTermId: latestRecord.academic_term_id || '',
          departmentId: latestRecord.department_id || '',
          specializationId: latestRecord.specialization_id || '',
          academicYearLevel: latestRecord.academic_year_level || '',
          division: latestRecord.division || '',
          rollNumber: latestRecord.roll_number || '',
        })
      } else {
        const currentYear = options.academicYears.find(
          (year) => year.is_current
        )

        setAcademicForm({
          ...emptyAcademicForm,
          academicYearId: currentYear?.id || '',
        })
      }
    } catch (error) {
      setShowAcademicModal(false)

      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          error.message ||
          'Unable to load the student academic details.',
      })
    } finally {
      setAcademicLoading(false)
    }
  }

  // ====================================================
  // SAVE ACADEMIC PLACEMENT
  // ====================================================

  async function handleSaveAcademicPlacement(event) {
    event.preventDefault()

    if (!academicStudent) return

    if (!academicForm.academicYearId || !academicForm.academicTermId) {
      setMessage({
        type: 'error',
        text: 'Please select an academic year and semester.',
      })
      return
    }

    if (
      !academicForm.departmentId ||
      !academicForm.academicYearLevel
    ) {
      setMessage({
        type: 'error',
        text: 'Please complete the department and year level.',
      })
      return
    }

    setAcademicSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        academicTermId: academicForm.academicTermId,
        schoolId,
        departmentId: academicForm.departmentId,
        specializationId: academicForm.specializationId || null,
        academicYearLevel: academicForm.academicYearLevel,
        division: academicForm.division.trim() || null,
        rollNumber: academicForm.rollNumber.trim() || null,
      }

      const response = await schoolService.assignStudentAcademicRecord(
        schoolId,
        academicStudent.id,
        payload
      )

      setShowAcademicModal(false)
      setAcademicStudent(null)
      setAcademicForm(emptyAcademicForm)

      setMessage({
        type: 'success',
        text:
          response?.message ||
          'Student academic record saved successfully.',
      })

      await loadStudents()
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.message ||
          'Unable to save the academic record. Please check the selected details.',
      })
    } finally {
      setAcademicSaving(false)
    }
  }

  // ====================================================
  // FILTERED ACADEMIC OPTIONS
  // ====================================================

  const filteredSemesters = options.semesters.filter(
    (semester) =>
      semester.academic_year_id === academicForm.academicYearId
  )

  const filteredSpecializations = options.specializations.filter(
    (specialization) =>
      specialization.department_id === academicForm.departmentId
  )

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
            className="student-btn student-btn-secondary"
            onClick={() => {
              setCsvRows([])
              setCsvErrors([])
              setBulkResult(null)
              setShowBulkModal(true)
            }}
          >
            <Upload size={16} />
            Bulk CSV Upload
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

                          <button
                            className="student-icon-btn"
                            title="Assign or update academic record"
                            onClick={() =>
                              handleOpenAcademicPlacement(student)
                            }
                          >
                            <GraduationCap size={17} />
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

      {/* BULK STUDENT CSV MODAL */}

      {showBulkModal && (
        <div className="student-modal-overlay">
          <div className="student-modal student-bulk-modal">

            <div className="student-modal-header">
              <div>
                <span className="student-management-eyebrow">
                  STUDENT IMPORT
                </span>

                <h3>Bulk CSV Upload</h3>

                <p>
                  Register multiple students for this school.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkModal}
                aria-label="Close"
                disabled={bulkLoading}
              >
                <X size={21} />
              </button>
            </div>

            <div className="student-csv-template">
              <div>
                <FileSpreadsheet size={22} />

                <div>
                  <strong>Student CSV Template</strong>
                  <span>
                    Download the required format before preparing your file.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="student-btn student-btn-secondary"
                onClick={downloadStudentTemplate}
              >
                <Download size={16} />
                Download Template
              </button>
            </div>

            <div className="student-csv-instructions">
              <strong>Important instructions</strong>

              <ul>
                <li>Maximum 200 students per upload.</li>
                <li>Full name, email, phone and enrollment number are required.</li>
                <li>Phone numbers must include the country code, e.g. +919876543210.</li>
                <li>Admission date must use YYYY-MM-DD format.</li>
                <li>Academic details are optional. If supplied, academic year code, semester number, department code and year level are required.</li>
                <li>Use the exact academic year, department and specialization codes configured in SmartSelect.</li>
                <li>New student accounts will be created with pending activation status.</li>
              </ul>
            </div>

            <div className="student-csv-upload-area">
              <Upload size={27} />

              <strong>Select Student CSV File</strong>

              <span>
                Choose a prepared .csv file from your computer.
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleStudentCsvFile}
                disabled={bulkLoading}
              />
            </div>

            {csvRows.length > 0 && (
              <div className="student-csv-preview">
                <div className="student-csv-preview-heading">
                  <div>
                    <strong>CSV Preview</strong>
                    <span>
                      {csvRows.length} student record(s) detected
                    </span>
                  </div>

                  <span
                    className={
                      csvErrors.length > 0
                        ? 'student-csv-invalid'
                        : 'student-csv-valid'
                    }
                  >
                    {csvErrors.length > 0
                      ? `${csvErrors.length} validation issue(s)`
                      : 'Validation passed'}
                  </span>
                </div>

                <div className="student-csv-table-wrapper">
                  <table className="student-csv-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Enrollment No.</th>
                        <th>Phone</th>
                        <th>Academic Year</th>
                      </tr>
                    </thead>

                    <tbody>
                      {csvRows.slice(0, 10).map((row) => (
                        <tr key={row._rowNumber}>
                          <td>{row._rowNumber}</td>
                          <td>{row.full_name}</td>
                          <td>{row.email}</td>
                          <td>{row.enrollment_number}</td>
                          <td>{row.phone}</td>
                          <td>
                            {row.academic_year_level || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {csvRows.length > 10 && (
                  <p className="student-csv-more">
                    Showing the first 10 of {csvRows.length} records.
                  </p>
                )}
              </div>
            )}

            {csvErrors.length > 0 && (
              <div className="student-csv-errors">
                <strong>
                  Please correct the following issues:
                </strong>

                <div>
                  {csvErrors.slice(0, 50).map((error, index) => (
                    <p key={`${error.row || 'file'}-${index}`}>
                      {error.row
                        ? `CSV Row ${error.row}: `
                        : ''}
                      {error.message || error}
                    </p>
                  ))}

                  {csvErrors.length > 50 && (
                    <p>
                      And {csvErrors.length - 50} more issue(s).
                    </p>
                  )}
                </div>
              </div>
            )}

            {bulkResult && (
              <div className="student-bulk-result">
                <strong>Import Results</strong>

                <div className="student-bulk-result-stats">
                  <div>
                    <span>Total</span>
                    <strong>{bulkResult.total}</strong>
                  </div>

                  <div>
                    <span>Successful</span>
                    <strong>{bulkResult.successful}</strong>
                  </div>

                  <div>
                    <span>Failed</span>
                    <strong>{bulkResult.failed}</strong>
                  </div>
                </div>

                {bulkResult.errors?.length > 0 && (
                  <div className="student-bulk-result-errors">
                    <strong>Failed Records</strong>

                    {bulkResult.errors.map((error, index) => (
                      <p key={`${error.row}-${index}`}>
                        Row {Number(error.row) + 1}
                        {' — '}
                        {error.email || error.enrollment_number || 'Student'}
                        : {error.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="student-modal-actions">
              <button
                type="button"
                className="student-btn student-btn-secondary"
                onClick={closeBulkModal}
                disabled={bulkLoading}
              >
                {bulkResult ? 'Close' : 'Cancel'}
              </button>

              {!bulkResult && (
                <button
                  type="button"
                  className="student-btn student-btn-primary"
                  onClick={handleStudentBulkUpload}
                  disabled={
                    bulkLoading ||
                    csvRows.length === 0 ||
                    csvErrors.length > 0
                  }
                >
                  <Upload size={17} />

                  {bulkLoading
                    ? 'Registering Students...'
                    : `Import ${csvRows.length || ''} Students`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* ACADEMIC PLACEMENT MODAL */}

      {showAcademicModal && (
        <div className="student-modal-overlay">
          <div className="student-modal student-academic-modal">

            <div className="student-modal-header">
              <div>
                <span className="student-management-eyebrow">
                  ACADEMIC MANAGEMENT
                </span>

                <h3>Assign Academic Record</h3>

                <p>
                  {academicStudent
                    ? `${getStudentName(academicStudent)} · ${getEnrollment(academicStudent)}`
                    : 'Loading student details...'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAcademicModal(false)
                  setAcademicStudent(null)
                }}
                aria-label="Close"
                disabled={academicSaving}
              >
                <X size={21} />
              </button>
            </div>

            {academicLoading ? (
              <div className="student-academic-loading">
                Loading student academic history...
              </div>
            ) : (
              <form onSubmit={handleSaveAcademicPlacement}>
                <div className="student-form-grid">

                  <label>
                    Academic Year *
                    <select
                      required
                      value={academicForm.academicYearId}
                      onChange={(event) => {
                        const academicYearId = event.target.value

                        updateAcademicForm('academicYearId', academicYearId)
                        updateAcademicForm('academicTermId', '')
                      }}
                    >
                      <option value="">Select academic year</option>

                      {options.academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                          {year.is_current ? ' (Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Semester *
                    <select
                      required
                      value={academicForm.academicTermId}
                      onChange={(event) =>
                        updateAcademicForm('academicTermId', event.target.value)
                      }
                      disabled={!academicForm.academicYearId}
                    >
                      <option value="">Select semester</option>

                      {filteredSemesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Department *
                    <select
                      required
                      value={academicForm.departmentId}
                      onChange={(event) => {
                        updateAcademicForm('departmentId', event.target.value)
                        updateAcademicForm('specializationId', '')
                      }}
                    >
                      <option value="">Select department</option>

                      {options.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Specialization (Optional)
                    <select
                      value={academicForm.specializationId}
                      onChange={(event) =>
                        updateAcademicForm(
                          'specializationId',
                          event.target.value
                        )
                      }
                      disabled={!academicForm.departmentId}
                    >
                      <option value="">
                        {academicForm.departmentId
                          ? filteredSpecializations.length > 0
                            ? 'No specialization (optional)'
                            : 'No specializations available'
                          : 'Select a department first'}
                      </option>

                      {filteredSpecializations.map((specialization) => (
                        <option
                          key={specialization.id}
                          value={specialization.id}
                        >
                          {specialization.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Year Level *
                    <select
                      required
                      value={academicForm.academicYearLevel}
                      onChange={(event) =>
                        updateAcademicForm(
                          'academicYearLevel',
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select year level</option>
                      <option value="FY">First Year (FY)</option>
                      <option value="SY">Second Year (SY)</option>
                      <option value="TY">Third Year (TY)</option>
                      <option value="LY">Last Year (LY)</option>
                    </select>
                  </label>

                  <label>
                    Division
                    <input
                      value={academicForm.division}
                      onChange={(event) =>
                        updateAcademicForm('division', event.target.value)
                      }
                      placeholder="e.g. A"
                    />
                  </label>

                  <label>
                    Roll Number
                    <input
                      value={academicForm.rollNumber}
                      onChange={(event) =>
                        updateAcademicForm('rollNumber', event.target.value)
                      }
                      placeholder="Enter roll number"
                    />
                  </label>

                </div>

                <div className="student-form-note">
                  <GraduationCap size={18} />

                  <p>
                    Select the semester for this academic record. Saving
                    against an existing semester updates that record.
                    Selecting another semester creates a separate entry
                    in the student's academic history.
                  </p>
                </div>

                <div className="student-modal-actions">
                  <button
                    type="button"
                    className="student-btn student-btn-secondary"
                    onClick={() => {
                      setShowAcademicModal(false)
                      setAcademicStudent(null)
                    }}
                    disabled={academicSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="student-btn student-btn-primary"
                    disabled={academicSaving}
                  >
                    <GraduationCap size={17} />
                    {academicSaving ? 'Saving...' : 'Save Academic Record'}
                  </button>
                </div>
              </form>
            )}
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
                  {getAcademicHistory(selectedStudent).length} record(s)
                </strong>
              </div>
            </div>

            <h4 className="student-history-title">
              Academic History
            </h4>

            <div className="student-history-list">
              {getAcademicHistory(selectedStudent).length === 0 ? (
                <p>
                  No academic placement has been assigned yet.
                </p>
              ) : (
                getAcademicHistory(selectedStudent).map((record) => (
                  <div
                    className="student-history-item"
                    key={record.id}
                  >
                    <strong>
                      {record.academic_year_level ||
                        record.academicYearLevel ||
                        'Year not specified'}
                      {' · '}
                      {record.academic_term?.name || 'Semester not specified'}
                    </strong>

                    <span>
                      {record.academic_term?.academic_year?.name ||
                        'Academic year not specified'}
                      {' · '}
                      {record.school?.name ||
                        record.school_name ||
                        'School not specified'}
                      {' · '}
                      {record.department?.name ||
                        record.department_name ||
                        'Department not specified'}
                    </span>

                    <small>
                      {record.specialization?.name ||
                        record.specialization_name ||
                        'Specialization not specified'}
                      {record.division ? ` · Division ${record.division}` : ''}
                      {record.roll_number ? ` · Roll No. ${record.roll_number}` : ''}
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
