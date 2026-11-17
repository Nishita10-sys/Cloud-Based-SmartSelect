
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Pencil,
  Download,
  Upload,
  FileSpreadsheet,
  Eye,
  Users,
} from 'lucide-react'
import Papa from 'papaparse'

import schoolService from '../../services/schoolService'
import './ElectiveManagement.css'

const emptyForm = {
  electiveCode: '',
  name: '',
  description: '',
  credits: '',
  academicTermId: '',
  offeringCode: 'A',
  totalSeats: 60,
  reservedSeats: 0,
  status: 'draft',
  departmentId: '',
  specializationId: '',
  academicYearLevel: '',
  facultyIds: [],
}

const statuses = ['draft', 'published', 'open', 'closed', 'cancelled']

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback

const unwrapData = (result) => result?.data ?? result

function ElectiveManagement({ schoolId }) {
  const [electives, setElectives] = useState([])
  const [options, setOptions] = useState({
    departments: [],
    specializations: [],
    faculty: [],
    academic_years: [],
    semesters: [],
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingElective, setEditingElective] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [showBulk, setShowBulk] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  const [selectedOffering, setSelectedOffering] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  const fileInputRef = useRef(null)

  const fetchElectives = async () => {
    if (!schoolId) return

    setLoading(true)
    setError('')

    try {
      const result = await schoolService.getElectives(schoolId, {
        status: statusFilter,
        academicTermId: semesterFilter,
      })

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load electives.')
      }

      const data = unwrapData(result)
      setElectives(Array.isArray(data) ? data : data?.electives || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load elective directory.'))
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    if (!schoolId) return

    try {
      const result = await schoolService.getElectiveOptions(schoolId)

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load elective options.')
      }

      const data = unwrapData(result)

      setOptions({
        departments: data?.departments || [],
        specializations: data?.specializations || [],
        faculty: data?.faculty || [],
        academic_years: data?.academic_years || [],
        semesters: data?.semesters || [],
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load form options.'))
    }
  }

  useEffect(() => {
    fetchOptions()
  }, [schoolId])

  useEffect(() => {
    fetchElectives()
  }, [schoolId, statusFilter, semesterFilter])

  const filteredElectives = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return electives

    return electives.filter((item) => {
      const elective = item.electives || {}

      return (
        (elective.name || '').toLowerCase().includes(term) ||
        (elective.elective_code || '').toLowerCase().includes(term) ||
        (item.offering_code || '').toLowerCase().includes(term)
      )
    })
  }, [electives, search])

  const selectedDepartmentSpecializations = useMemo(() => {
    if (!form.departmentId) return []

    return options.specializations.filter(
      (item) => item.department_id === form.departmentId
    )
  }, [options.specializations, form.departmentId])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const openAddModal = () => {
    setEditingElective(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEditModal = async (offering) => {
    setError('')
    setSaving(false)

    try {
      const result = await schoolService.getElectiveDetails(
        schoolId,
        offering.id
      )

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load elective details.')
      }

      const data = unwrapData(result)
      const eligibility = (data.offering_eligibility || []).find(
        (item) => item.school_id === schoolId
      )

      setEditingElective(data)

      setForm({
        electiveCode: data.electives?.elective_code || '',
        name: data.electives?.name || '',
        description: data.electives?.description || '',
        credits: data.electives?.credits ?? '',
        academicTermId: data.academic_term_id || '',
        offeringCode: data.offering_code || 'A',
        totalSeats: data.total_seats || 1,
        reservedSeats: data.reserved_seats || 0,
        status: data.status || 'draft',
        departmentId: eligibility?.department_id || '',
        specializationId: eligibility?.specialization_id || '',
        academicYearLevel: eligibility?.academic_year_level || '',
        facultyIds: (data.faculty_assignments || []).map(
          (item) => item.faculty_id
        ),
      })

      setShowModal(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to open elective for editing.'))
    }
  }

  const validateForm = () => {
    if (!form.electiveCode.trim()) return 'Elective code is required.'
    if (!form.name.trim()) return 'Elective name is required.'
    if (!form.academicTermId) return 'Please select a semester.'
    if (!Number.isInteger(Number(form.totalSeats)) || Number(form.totalSeats) <= 0) {
      return 'Total seats must be a positive whole number.'
    }
    if (
      !Number.isInteger(Number(form.reservedSeats)) ||
      Number(form.reservedSeats) < 0 ||
      Number(form.reservedSeats) > Number(form.totalSeats)
    ) {
      return 'Reserved seats must be between zero and total seats.'
    }
    if (
      form.credits !== '' &&
      (!Number.isFinite(Number(form.credits)) || Number(form.credits) <= 0)
    ) {
      return 'Credits must be a positive number.'
    }
    if (form.specializationId && !form.departmentId) {
      return 'Select a department for the specialization.'
    }

    return ''
  }

  const buildPayload = () => ({
    electiveCode: form.electiveCode.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    credits: form.credits === '' ? null : Number(form.credits),
    academicTermId: form.academicTermId,
    offeringCode: form.offeringCode.trim().toUpperCase() || 'A',
    totalSeats: Number(form.totalSeats),
    reservedSeats: Number(form.reservedSeats),
    status: form.status,
    eligibility: [
      {
        departmentId: form.departmentId || null,
        specializationId: form.specializationId || null,
        academicYearLevel: form.academicYearLevel || null,
      },
    ],
    facultyIds: form.facultyIds,
  })

  const handleSave = async (event) => {
    event.preventDefault()

    const validationMessage = validateForm()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = buildPayload()

      const result = editingElective
        ? await schoolService.updateElective(
            schoolId,
            editingElective.id,
            payload
          )
        : await schoolService.createElective(schoolId, payload)

      if (result.success === false) {
        throw new Error(result.message || 'Unable to save elective.')
      }

      setMessage(
        editingElective
          ? 'Elective updated successfully.'
          : 'Elective created successfully.'
      )

      setShowModal(false)
      setEditingElective(null)
      setForm(emptyForm)

      await fetchElectives()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save elective.'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (offeringId, status) => {
    setError('')
    setMessage('')

    try {
      const result = await schoolService.updateElectiveStatus(
        schoolId,
        offeringId,
        status
      )

      if (result.success === false) {
        throw new Error(result.message || 'Unable to update status.')
      }

      setMessage('Elective status updated.')
      await fetchElectives()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update elective status.'))
    }
  }

  const openEnrollments = async (offering) => {
    setSelectedOffering(offering)
    setEnrollments([])
    setDetailsLoading(true)
    setError('')

    try {
      const result = await schoolService.getElectiveEnrollments(
        schoolId,
        offering.id
      )

      if (result.success === false) {
        throw new Error(result.message || 'Unable to load enrollments.')
      }

      const data = unwrapData(result)
      setEnrollments(Array.isArray(data) ? data : data?.enrollments || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load student enrollments.'))
    } finally {
      setDetailsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'electiveCode',
      'name',
      'description',
      'credits',
      'academicTermId',
      'offeringCode',
      'totalSeats',
      'reservedSeats',
      'status',
      'departmentId',
      'specializationId',
      'academicYearLevel',
      'facultyIds',
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
    link.download = 'smartselect_elective_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCsvFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvRows([])
    setCsvErrors([])
    setBulkResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const errors = [...(result.errors || []).map(
          (item) => `CSV row ${item.row + 2}: ${item.message}`
        )]

        const rows = (result.data || []).map((row, index) => {
          const facultyIds = (row.facultyIds || '')
            .split(';')
            .map((item) => item.trim())
            .filter(Boolean)

          const item = {
            electiveCode: (row.electiveCode || '').trim(),
            name: (row.name || '').trim(),
            description: (row.description || '').trim(),
            credits: row.credits ? Number(row.credits) : null,
            academicTermId: (row.academicTermId || '').trim(),
            offeringCode: (row.offeringCode || 'A').trim(),
            totalSeats: Number(row.totalSeats),
            reservedSeats: row.reservedSeats ? Number(row.reservedSeats) : 0,
            status: (row.status || 'draft').trim().toLowerCase(),
            eligibility: [
              {
                departmentId: (row.departmentId || '').trim() || null,
                specializationId: (row.specializationId || '').trim() || null,
                academicYearLevel: (row.academicYearLevel || '').trim() || null,
              },
            ],
            facultyIds,
          }

          if (!item.electiveCode || !item.name || !item.academicTermId) {
            errors.push(`CSV row ${index + 2}: Code, name and semester are required.`)
          }

          if (!Number.isInteger(item.totalSeats) || item.totalSeats <= 0) {
            errors.push(`CSV row ${index + 2}: Total seats must be a positive whole number.`)
          }

          if (
            !Number.isInteger(item.reservedSeats) ||
            item.reservedSeats < 0 ||
            item.reservedSeats > item.totalSeats
          ) {
            errors.push(`CSV row ${index + 2}: Reserved seats are invalid.`)
          }

          if (!statuses.includes(item.status)) {
            errors.push(`CSV row ${index + 2}: Invalid status.`)
          }

          return item
        })

        setCsvRows(rows)
        setCsvErrors(errors)
      },
      error: (parseError) => {
        setCsvErrors([parseError.message])
      },
    })

    event.target.value = ''
  }

  const handleBulkImport = async () => {
    if (!csvRows.length || csvErrors.length) return

    setBulkLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await schoolService.bulkCreateElectives(
        schoolId,
        csvRows
      )

      if (result.success === false) {
        throw new Error(result.message || 'Bulk import failed.')
      }

      setBulkResult(unwrapData(result))
      setMessage('Bulk elective import completed.')
      await fetchElectives()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to import electives.'))
    } finally {
      setBulkLoading(false)
    }
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingElective(null)
    setForm(emptyForm)
    setError('')
  }

  const getSemesterLabel = (offering) => {
    const term = offering.academic_terms
    const year = term?.academic_year

    return [
      year?.name,
      term?.name || (term?.semester_number ? `Semester ${term.semester_number}` : ''),
    ].filter(Boolean).join(' · ') || 'Semester not available'
  }

  const getFacultyNames = (offering) => {
    return (offering.faculty_assignments || [])
      .map((item) => item.faculty_details?.profiles?.full_name)
      .filter(Boolean)
      .join(', ') || 'Not assigned'
  }

  return (
    <div className="elective-management">

      <section className="elective-page-heading">
        <div>
          <span className="elective-eyebrow">SCHOOL MANAGEMENT</span>
          <h2>Elective Management</h2>
          <p>Create and manage elective offerings, faculty assignments and seat capacity.</p>
        </div>

        <div className="elective-heading-actions">
          <button
            type="button"
            className="elective-secondary-button"
            onClick={() => {
              setShowBulk(true)
              setBulkResult(null)
              setCsvRows([])
              setCsvErrors([])
            }}
          >
            <Upload size={17} />
            Bulk Upload
          </button>

          <button
            type="button"
            className="elective-primary-button"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Elective
          </button>
        </div>
      </section>

      {message && (
        <div className="elective-alert elective-alert-success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="elective-alert elective-alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      <section className="elective-summary-grid">
        <div className="elective-summary-card">
          <span>Total Offerings</span>
          <strong>{electives.length}</strong>
        </div>
        <div className="elective-summary-card">
          <span>Open Offerings</span>
          <strong>{electives.filter((item) => item.status === 'open').length}</strong>
        </div>
        <div className="elective-summary-card">
          <span>Published</span>
          <strong>{electives.filter((item) => item.status === 'published').length}</strong>
        </div>
        <div className="elective-summary-card">
          <span>Total Seat Capacity</span>
          <strong>
            {electives.reduce((total, item) => total + Number(item.total_seats || 0), 0)}
          </strong>
        </div>
      </section>

      <section className="elective-directory">
        <div className="elective-directory-heading">
          <div>
            <h3>All Electives</h3>
            <p>Elective offerings assigned to this school.</p>
          </div>

          <button
            type="button"
            className="elective-icon-button"
            title="Refresh"
            onClick={fetchElectives}
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="elective-filters">
          <div className="elective-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search elective code or name..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
          >
            <option value="">All semesters</option>
            {options.semesters.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academic_year?.name || ''} - {term.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="elective-empty-state">
            <RefreshCw size={24} className="elective-spin" />
            <span>Loading electives...</span>
          </div>
        ) : filteredElectives.length === 0 ? (
          <div className="elective-empty-state">
            <BookOpen size={32} />
            <strong>No electives found</strong>
            <span>Add an elective or adjust your filters.</span>
          </div>
        ) : (
          <div className="elective-table-wrap">
            <table className="elective-table">
              <thead>
                <tr>
                  <th>Elective</th>
                  <th>Semester</th>
                  <th>Faculty</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredElectives.map((offering) => (
                  <tr key={offering.id}>
                    <td>
                      <div className="elective-name-cell">
                        <strong>{offering.electives?.name || 'Unnamed elective'}</strong>
                        <span>
                          {offering.electives?.elective_code || '—'}
                          {' · Section '}
                          {offering.offering_code}
                        </span>
                      </div>
                    </td>
                    <td>{getSemesterLabel(offering)}</td>
                    <td>{getFacultyNames(offering)}</td>
                    <td>
                      <strong>{offering.total_seats}</strong>
                      <span className="elective-seat-subtext">
                        {' '}total · {offering.reserved_seats} reserved
                      </span>
                    </td>
                    <td>
                      <select
                        className={`elective-status-select status-${offering.status}`}
                        value={offering.status}
                        onChange={(event) =>
                          handleStatusChange(offering.id, event.target.value)
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="elective-row-actions">
                        <button
                          type="button"
                          title="View enrollments"
                          onClick={() => openEnrollments(offering)}
                        >
                          <Users size={17} />
                        </button>
                        <button
                          type="button"
                          title="Edit elective"
                          onClick={() => openEditModal(offering)}
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="elective-modal-backdrop" onMouseDown={closeModal}>
          <section
            className="elective-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="elective-modal-header">
              <div>
                <h3>{editingElective ? 'Edit Elective' : 'Add Elective'}</h3>
                <p>Enter elective and offering information.</p>
              </div>
              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="elective-form-grid">
                <label>
                  Elective Code *
                  <input
                    value={form.electiveCode}
                    onChange={(event) => updateForm('electiveCode', event.target.value)}
                    placeholder="e.g. CLOUD101"
                    required
                  />
                </label>

                <label>
                  Elective Name *
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder="Enter elective name"
                    required
                  />
                </label>

                <label className="elective-form-full">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    rows="3"
                    placeholder="Describe the elective"
                  />
                </label>

                <label>
                  Credits
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.credits}
                    onChange={(event) => updateForm('credits', event.target.value)}
                    placeholder="e.g. 3"
                  />
                </label>

                <label>
                  Academic Semester *
                  <select
                    value={form.academicTermId}
                    onChange={(event) => updateForm('academicTermId', event.target.value)}
                    required
                  >
                    <option value="">Select semester</option>
                    {options.semesters.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.academic_year?.name} - {term.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Offering / Section Code *
                  <input
                    value={form.offeringCode}
                    onChange={(event) => updateForm('offeringCode', event.target.value)}
                    required
                  />
                </label>

                <label>
                  Total Seats *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalSeats}
                    onChange={(event) => updateForm('totalSeats', event.target.value)}
                    required
                  />
                </label>

                <label>
                  Reserved Seats
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.reservedSeats}
                    onChange={(event) => updateForm('reservedSeats', event.target.value)}
                  />
                </label>

                <label>
                  Offering Status
                  <select
                    value={form.status}
                    onChange={(event) => updateForm('status', event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Department
                  <select
                    value={form.departmentId}
                    onChange={(event) => {
                      updateForm('departmentId', event.target.value)
                      updateForm('specializationId', '')
                    }}
                  >
                    <option value="">All departments</option>
                    {options.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Specialization
                  <select
                    value={form.specializationId}
                    onChange={(event) => updateForm('specializationId', event.target.value)}
                    disabled={!form.departmentId}
                  >
                    <option value="">All specializations</option>
                    {selectedDepartmentSpecializations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Student Year Level
                  <select
                    value={form.academicYearLevel}
                    onChange={(event) => updateForm('academicYearLevel', event.target.value)}
                  >
                    <option value="">All year levels</option>
                    {['FY', 'SY', 'TY', 'LY'].map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </label>

                <label className="elective-form-full">
                  Assign Active Faculty
                  <select
                    multiple
                    value={form.facultyIds}
                    onChange={(event) => updateForm(
                      'facultyIds',
                      Array.from(event.target.selectedOptions, (option) => option.value)
                    )}
                    size={Math.min(Math.max(options.faculty.length, 2), 5)}
                  >
                    {options.faculty.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name} ({person.employee_id}) - {person.department_name}
                      </option>
                    ))}
                  </select>
                  <span className="elective-field-hint">
                    Hold Ctrl while selecting multiple faculty members.
                  </span>
                </label>
              </div>

              {error && (
                <div className="elective-inline-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="elective-modal-actions">
                <button
                  type="button"
                  className="elective-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="elective-primary-button"
                  disabled={saving}
                >
                  <Save size={17} />
                  {saving ? 'Saving...' : editingElective ? 'Save Changes' : 'Create Elective'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showBulk && (
        <div className="elective-modal-backdrop" onMouseDown={() => setShowBulk(false)}>
          <section
            className="elective-modal elective-bulk-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="elective-modal-header">
              <div>
                <h3>Bulk Elective Upload</h3>
                <p>Import elective offerings using a CSV file.</p>
              </div>
              <button type="button" onClick={() => setShowBulk(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="elective-bulk-content">
              <button
                type="button"
                className="elective-secondary-button"
                onClick={downloadTemplate}
              >
                <Download size={17} />
                Download CSV Template
              </button>

              <button
                type="button"
                className="elective-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={30} />
                <strong>Select CSV File</strong>
                <span>Choose your completed elective template.</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={handleCsvFile}
              />

              {csvRows.length > 0 && (
                <p className="elective-preview-count">
                  {csvRows.length} rows loaded for preview.
                </p>
              )}

              {csvErrors.length > 0 && (
                <div className="elective-csv-errors">
                  <strong>Please fix these CSV errors:</strong>
                  {csvErrors.map((item, index) => (
                    <span key={index}>{item}</span>
                  ))}
                </div>
              )}

              {bulkResult && (
                <div className="elective-bulk-result">
                  <strong>Import results</strong>
                  <p>Successful: {bulkResult.successful}</p>
                  <p>Failed: {bulkResult.failed}</p>
                  {(bulkResult.results || [])
                    .filter((item) => !item.success)
                    .map((item) => (
                      <span key={item.row}>
                        Row {item.row}: {item.error}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="elective-modal-actions">
              <button
                type="button"
                className="elective-secondary-button"
                onClick={() => setShowBulk(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="elective-primary-button"
                disabled={!csvRows.length || csvErrors.length > 0 || bulkLoading}
                onClick={handleBulkImport}
              >
                <Upload size={17} />
                {bulkLoading ? 'Importing...' : 'Import Electives'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedOffering && (
        <div
          className="elective-modal-backdrop"
          onMouseDown={() => setSelectedOffering(null)}
        >
          <section
            className="elective-modal elective-enrollment-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="elective-modal-header">
              <div>
                <h3>Student Enrollments</h3>
                <p>{selectedOffering.electives?.name || 'Elective'}</p>
              </div>
              <button type="button" onClick={() => setSelectedOffering(null)}>
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="elective-empty-state">
                <RefreshCw size={22} className="elective-spin" />
                Loading enrollments...
              </div>
            ) : enrollments.length === 0 ? (
              <div className="elective-empty-state">
                <Users size={30} />
                <strong>No enrollments found</strong>
                <span>No student enrollment records are available for this offering.</span>
              </div>
            ) : (
              <div className="elective-table-wrap">
                <table className="elective-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Year</th>
                      <th>Division</th>
                      <th>Roll Number</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((item) => {
                      const student = item.student_academic_records || {}
                      const profile = student.profiles || {}

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="elective-name-cell">
                              <strong>{profile.full_name || 'Student'}</strong>
                              <span>{profile.email || '—'}</span>
                            </div>
                          </td>
                          <td>{student.academic_year_level || '—'}</td>
                          <td>{student.division || '—'}</td>
                          <td>{student.roll_number || '—'}</td>
                          <td>{item.status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default ElectiveManagement

