
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Pencil,
  Power,
  Download,
  Upload,
  FileSpreadsheet,
  Eye,
} from 'lucide-react'
import Papa from 'papaparse'

import schoolService from '../../services/schoolService'
import './FacultyManagement.css'

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  employee_id: '',
  department_id: '',
  designation: '',
  joining_date: '',
}

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback

const unwrapData = (result) => result?.data ?? result

function FacultyManagement({ schoolId }) {
  const [faculty, setFaculty] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [showBulk, setShowBulk] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const fileInputRef = useRef(null)

  const fetchFaculty = async () => {
    if (!schoolId) return

    setLoading(true)
    setError('')

    try {
      const result = await schoolService.getFaculty(schoolId, {
        search,
        departmentId: departmentFilter,
        accountStatus: statusFilter,
      })

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load faculty.')
      }

      const data = unwrapData(result)
      setFaculty(Array.isArray(data) ? data : data?.faculty || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load faculty directory.'))
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    if (!schoolId) return

    try {
      const result = await schoolService.getFacultyOptions(schoolId)

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load faculty options.')
      }

      const data = unwrapData(result)
      setDepartments(
        Array.isArray(data) ? data : data?.departments || []
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load department options.'))
    }
  }

  useEffect(() => {
    fetchOptions()
  }, [schoolId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchFaculty()
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [schoolId, search, departmentFilter, statusFilter])

  const openAddModal = () => {
    setEditingFaculty(null)
    setForm(emptyForm)
    setError('')
    setMessage('')
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingFaculty(item)

    setForm({
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      employee_id: item.employee_id || '',
      department_id: item.department_id || '',
      designation: item.designation || '',
      joining_date: item.joining_date
        ? String(item.joining_date).slice(0, 10)
        : '',
    })

    setError('')
    setMessage('')
    setShowModal(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.department_id) {
      setError('Please select a department.')
      return
    }

    setSaving(true)

    try {
      if (editingFaculty) {
        await schoolService.updateFaculty(
          schoolId,
          editingFaculty.faculty_id || editingFaculty.id,
          form
        )

        setMessage('Faculty details updated successfully.')
      } else {
        await schoolService.createFaculty(schoolId, form)
        setMessage('Faculty registered successfully. Account is pending activation.')
      }

      setShowModal(false)
      setForm(emptyForm)
      setEditingFaculty(null)
      await fetchFaculty()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save faculty details.'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (item) => {
    const facultyId = item.faculty_id || item.id
    const currentStatus = item.account_status
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'

    if (currentStatus === 'pending') {
      setError('This faculty member must complete account activation before being activated.')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${nextStatus === 'active' ? 'activate' : 'suspend'} ${item.full_name}?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await schoolService.updateFacultyStatus(
        schoolId,
        facultyId,
        nextStatus
      )

      setMessage(`Faculty account ${nextStatus === 'active' ? 'activated' : 'suspended'} successfully.`)
      await fetchFaculty()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update faculty status.'))
    }
  }

  const handleViewDetails = async (item) => {
    setSelectedFaculty(item)
    setDetailsLoading(true)
    setError('')

    try {
      const result = await schoolService.getFacultyDetails(
        schoolId,
        item.faculty_id || item.id
      )

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load faculty details.')
      }

      setSelectedFaculty(unwrapData(result))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load faculty details.'))
    } finally {
      setDetailsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'employee_id',
      'full_name',
      'email',
      'phone',
      'department_code',
      'designation',
      'joining_date',
    ]

    const csv = Papa.unparse({
      fields: headers,
      data: [],
    })

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'SmartSelect_Faculty_Template.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  const validateCsvRows = (rows) => {
    const errors = []
    const seenEmployeeIds = new Set()
    const seenEmails = new Set()

    const normalizedRows = rows.map((row, index) => {
      const rowNumber = index + 2

      const employeeId = String(row.employee_id || '').trim()
      const fullName = String(row.full_name || '').trim()
      const email = String(row.email || '').trim().toLowerCase()
      const phone = String(row.phone || '').trim()
      const departmentCode = String(row.department_code || '').trim().toLowerCase()
      const designation = String(row.designation || '').trim()
      const joiningDate = String(row.joining_date || '').trim()

      const rowErrors = []

      if (!employeeId) rowErrors.push('Employee ID is required.')
      if (!fullName) rowErrors.push('Full name is required.')
      if (!email) rowErrors.push('Email is required.')
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push('Invalid email address.')
      }

      if (!phone) rowErrors.push('Phone number is required.')
      if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ''))) {
        rowErrors.push('Invalid phone number.')
      }

      const department = departments.find(
        (item) => String(item.code || '').trim().toLowerCase() === departmentCode
      )

      if (!departmentCode) {
        rowErrors.push('Department code is required.')
      } else if (!department) {
        rowErrors.push(`Department code "${departmentCode}" was not found in this school.`)
      }

      if (employeeId && seenEmployeeIds.has(employeeId.toLowerCase())) {
        rowErrors.push('Duplicate employee ID in this CSV.')
      }

      if (email && seenEmails.has(email)) {
        rowErrors.push('Duplicate email address in this CSV.')
      }

      if (employeeId) seenEmployeeIds.add(employeeId.toLowerCase())
      if (email) seenEmails.add(email)

      if (joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) {
        rowErrors.push('Joining date must use YYYY-MM-DD format.')
      }

      if (rowErrors.length) {
        errors.push({
          row: rowNumber,
          employeeId,
          errors: rowErrors,
        })
      }

      return {
        employee_id: employeeId,
        full_name: fullName,
        email,
        phone: phone.startsWith('+') ? phone : `+${phone}`,
        department_id: department?.id || '',
        designation,
        joining_date: joiningDate || null,
        _rowNumber: rowNumber,
        _errors: rowErrors,
      }
    })

    setCsvErrors(errors)
    setCsvRows(normalizedRows)
  }

  const handleCsvFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBulkResult(null)
    setCsvRows([])
    setCsvErrors([])
    setError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data || []

        const requiredHeaders = [
          'employee_id',
          'full_name',
          'email',
          'phone',
          'department_code',
        ]

        const headers = results.meta.fields || []
        const missingHeaders = requiredHeaders.filter(
          (header) => !headers.includes(header)
        )

        if (missingHeaders.length) {
          setError(`CSV is missing required columns: ${missingHeaders.join(', ')}`)
          return
        }

        if (!rows.length) {
          setError('The selected CSV file contains no faculty records.')
          return
        }

        validateCsvRows(rows)
      },
      error: () => setError('Unable to read the selected CSV file.'),
    })

    event.target.value = ''
  }

  const handleBulkUpload = async () => {
    if (!csvRows.length) return

    if (csvErrors.length) {
      setError('Please correct all CSV errors before uploading.')
      return
    }

    const confirmed = window.confirm(
      `Upload ${csvRows.length} faculty records to this school?`
    )

    if (!confirmed) return

    setBulkLoading(true)
    setError('')
    setBulkResult(null)

    try {
      const payload = csvRows.map(
        ({ _rowNumber, _errors, ...row }) => row
      )

      const result = await schoolService.bulkCreateFaculty(
        schoolId,
        payload
      )

      if (result.success === false) {
        throw new Error(result.message || 'Bulk upload failed.')
      }

      const data = unwrapData(result)
      setBulkResult(data)
      setMessage('Bulk faculty upload completed.')
      await fetchFaculty()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to upload faculty CSV.'))
    } finally {
      setBulkLoading(false)
    }
  }

  const displayedFaculty = useMemo(() => faculty, [faculty])

  const successCount =
    bulkResult?.successCount ??
    bulkResult?.created?.length ??
    bulkResult?.success?.length ??
    0

  const failureCount =
    bulkResult?.failureCount ??
    bulkResult?.failed?.length ??
    bulkResult?.errors?.length ??
    0

  return (
    <section className="faculty-management">
      <div className="faculty-page-heading">
        <div>
          <h2>Faculty Management</h2>
          <p>Register and manage faculty members assigned to this school.</p>
        </div>

        <div className="faculty-heading-actions">
          <button
            type="button"
            className="faculty-secondary-button"
            onClick={() => {
              setShowBulk(true)
              setCsvRows([])
              setCsvErrors([])
              setBulkResult(null)
              setError('')
            }}
          >
            <Upload size={16} />
            Bulk CSV Upload
          </button>

          <button
            type="button"
            className="faculty-primary-button"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Faculty
          </button>
        </div>
      </div>

      {message && (
        <div className="faculty-message success">
          <CheckCircle2 size={17} />
          {message}
          <button type="button" onClick={() => setMessage('')}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="faculty-message error">
          <AlertCircle size={17} />
          {error}
          <button type="button" onClick={() => setError('')}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="faculty-summary-card">
        <div className="faculty-summary-icon">
          <Users size={23} />
        </div>
        <div>
          <span>Total faculty records</span>
          <strong>{faculty.length}</strong>
        </div>
      </div>

      <div className="faculty-directory-card">
        <div className="faculty-toolbar">
          <div>
            <h3>Faculty Directory</h3>
            <p>Search, view and manage faculty accounts.</p>
          </div>

          <div className="faculty-filters">
            <label className="faculty-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or employee ID"
              />
            </label>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="faculty-state">
            <RefreshCw className="faculty-spin" size={25} />
            <strong>Loading faculty directory...</strong>
          </div>
        ) : error && !faculty.length ? (
          <div className="faculty-state">
            <AlertCircle size={26} />
            <strong>Unable to load faculty</strong>
            <button type="button" onClick={fetchFaculty}>
              Try Again
            </button>
          </div>
        ) : displayedFaculty.length ? (
          <div className="faculty-table-wrapper">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedFaculty.map((item) => {
                  const id = item.faculty_id || item.id

                  return (
                    <tr key={id}>
                      <td>
                        <div className="faculty-person">
                          <div className="faculty-avatar">
                            {(item.full_name || 'F').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{item.full_name || 'Unnamed faculty'}</strong>
                            <span>{item.email || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td>{item.employee_id || '—'}</td>
                      <td>{item.department_name || item.department?.name || '—'}</td>
                      <td>{item.designation || '—'}</td>

                      <td>
                        <span className={`faculty-status ${item.account_status || 'pending'}`}>
                          {item.account_status || 'pending'}
                        </span>
                      </td>

                      <td>
                        <div className="faculty-row-actions">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => handleViewDetails(item)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            title="Edit faculty"
                            onClick={() => openEditModal(item)}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            title="Change account status"
                            onClick={() => handleStatusChange(item)}
                            disabled={item.account_status === 'pending' || item.account_status === 'disabled'}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="faculty-state">
            <Users size={30} />
            <strong>No faculty records found</strong>
            <span>Add a faculty member or change your search filters.</span>
          </div>
        )}
      </div>

      {/* MANUAL FACULTY FORM */}
      {showModal && (
        <div className="faculty-modal-overlay">
          <section className="faculty-modal" role="dialog" aria-modal="true">
            <div className="faculty-modal-heading">
              <div>
                <span>FACULTY MANAGEMENT</span>
                <h2>{editingFaculty ? 'Edit Faculty' : 'Register Faculty'}</h2>
                <p>Enter the faculty member's official details.</p>
              </div>
              <button
                type="button"
                className="faculty-close"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {error && <div className="faculty-message error">{error}</div>}

              <div className="faculty-form-grid">
                <label>
                  Full Name *
                  <input
                    required
                    value={form.full_name}
                    onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                    placeholder="Faculty full name"
                  />
                </label>

                <label>
                  Employee ID *
                  <input
                    required
                    value={form.employee_id}
                    onChange={(event) => setForm({ ...form, employee_id: event.target.value })}
                    placeholder="e.g. MIT-FAC-001"
                    disabled={Boolean(editingFaculty)}
                  />
                </label>

                <label>
                  Official Email *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="faculty@university.edu"
                  />
                </label>

                <label>
                  Phone Number *
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+919876543210"
                  />
                </label>

                <label>
                  Department *
                  <select
                    required
                    value={form.department_id}
                    onChange={(event) => setForm({ ...form, department_id: event.target.value })}
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Designation
                  <input
                    value={form.designation}
                    onChange={(event) => setForm({ ...form, designation: event.target.value })}
                    placeholder="e.g. Assistant Professor"
                  />
                </label>

                <label>
                  Joining Date
                  <input
                    type="date"
                    value={form.joining_date}
                    onChange={(event) => setForm({ ...form, joining_date: event.target.value })}
                  />
                </label>
              </div>

              <div className="faculty-form-note">
                New faculty accounts are created with pending activation status.
              </div>

              <div className="faculty-modal-actions">
                <button
                  type="button"
                  className="faculty-secondary-button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" className="faculty-primary-button" disabled={saving}>
                  {saving ? <RefreshCw size={16} className="faculty-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : editingFaculty ? 'Save Changes' : 'Register Faculty'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* BULK CSV UPLOAD */}
      {showBulk && (
        <div className="faculty-modal-overlay">
          <section className="faculty-modal faculty-bulk-modal" role="dialog" aria-modal="true">
            <div className="faculty-modal-heading">
              <div>
                <span>BULK REGISTRATION</span>
                <h2>Upload Faculty CSV</h2>
                <p>Import multiple faculty members into this school.</p>
              </div>
              <button
                type="button"
                className="faculty-close"
                onClick={() => !bulkLoading && setShowBulk(false)}
                disabled={bulkLoading}
              >
                <X size={19} />
              </button>
            </div>

            <div className="faculty-template-box">
              <FileSpreadsheet size={25} />
              <div>
                <strong>Use the SmartSelect CSV template</strong>
                <span>Required columns: employee_id, full_name, email, phone and department_code.</span>
              </div>
              <button type="button" onClick={downloadTemplate}>
                <Download size={15} />
                Download
              </button>
            </div>

            <div className="faculty-upload-area">
              <Upload size={27} />
              <strong>Select faculty CSV file</strong>
              <span>Upload a .csv file using the provided template.</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFile}
              />
            </div>

            {csvRows.length > 0 && (
              <div className="faculty-preview">
                <div className="faculty-preview-heading">
                  <strong>Import Preview</strong>
                  <span>{csvRows.length} rows · {csvErrors.length} rows with errors</span>
                </div>

                <div className="faculty-preview-table">
                  <table className="faculty-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row) => (
                        <tr key={row._rowNumber}>
                          <td>{row._rowNumber}</td>
                          <td>{row.employee_id || '—'}</td>
                          <td>{row.full_name || '—'}</td>
                          <td>{row.email || '—'}</td>
                          <td>
                            {row._errors.length ? (
                              <span className="faculty-status disabled">
                                {row._errors.length} error(s)
                              </span>
                            ) : (
                              <span className="faculty-status active">Valid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {csvErrors.length > 0 && (
                  <div className="faculty-csv-errors">
                    {csvErrors.map((item) => (
                      <div key={item.row}>
                        <strong>Row {item.row} ({item.employeeId || 'No employee ID'}):</strong>
                        <span>{item.errors.join(' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {bulkResult && (
              <div className="faculty-bulk-result">
                <strong>Upload completed</strong>
                <span>{successCount} successful · {failureCount} failed</span>
              </div>
            )}

            <div className="faculty-modal-actions">
              <button
                type="button"
                className="faculty-secondary-button"
                onClick={() => setShowBulk(false)}
                disabled={bulkLoading}
              >
                Close
              </button>

              <button
                type="button"
                className="faculty-primary-button"
                onClick={handleBulkUpload}
                disabled={!csvRows.length || csvErrors.length > 0 || bulkLoading}
              >
                {bulkLoading ? <RefreshCw size={16} className="faculty-spin" /> : <Upload size={16} />}
                {bulkLoading ? 'Uploading...' : 'Import Faculty'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* FACULTY DETAILS */}
      {selectedFaculty && (
        <div className="faculty-modal-overlay">
          <section className="faculty-modal faculty-details-modal" role="dialog" aria-modal="true">
            <div className="faculty-modal-heading">
              <div>
                <span>FACULTY PROFILE</span>
                <h2>Faculty Details</h2>
              </div>
              <button
                type="button"
                className="faculty-close"
                onClick={() => setSelectedFaculty(null)}
              >
                <X size={19} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="faculty-state">
                <RefreshCw size={24} className="faculty-spin" />
                <strong>Loading details...</strong>
              </div>
            ) : (
              <div className="faculty-details-grid">
                <div><span>Full Name</span><strong>{selectedFaculty.full_name || '—'}</strong></div>
                <div><span>Employee ID</span><strong>{selectedFaculty.employee_id || '—'}</strong></div>
                <div><span>Email</span><strong>{selectedFaculty.email || '—'}</strong></div>
                <div><span>Phone</span><strong>{selectedFaculty.phone || '—'}</strong></div>
                <div><span>Department</span><strong>{selectedFaculty.department_name || selectedFaculty.department?.name || '—'}</strong></div>
                <div><span>Designation</span><strong>{selectedFaculty.designation || '—'}</strong></div>
                <div><span>Joining Date</span><strong>{selectedFaculty.joining_date || '—'}</strong></div>
                <div>
                  <span>Account Status</span>
                  <strong>{selectedFaculty.account_status || 'pending'}</strong>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

export default FacultyManagement
