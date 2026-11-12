
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Plus,
  RefreshCw,
  Pencil,
  Power,
  CheckCircle2,
  Clock3,
  X,
  AlertCircle,
  Layers,
  BookOpen,
} from 'lucide-react'
import adminService from '../../services/adminService'
import './AcademicYearManagement.css'

const SEMESTER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]

const emptyYearForm = {
  name: '',
  code: '',
  startDate: '',
  endDate: '',
}

const emptyTermForm = {
  semesterNumber: '',
  name: '',
  startDate: '',
  endDate: '',
}

function getYearsFromResponse(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.academicYears)) return response.academicYears
  if (Array.isArray(response?.data?.academicYears)) {
    return response.data.academicYears
  }
  return []
}

function getTermsFromResponse(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.semesters)) return response.semesters
  return []
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

function isYearCurrent(year) {
  return Boolean(year.is_current ?? year.isCurrent)
}

function isYearActive(year) {
  return Boolean(year.is_active ?? year.isActive)
}

function isTermActive(term) {
  return Boolean(term.is_active ?? term.isActive)
}

function getTermNumber(term) {
  return Number(term.semester_number ?? term.semesterNumber)
}

export default function AcademicYearManagement() {
  const [academicYears, setAcademicYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [academicTerms, setAcademicTerms] = useState([])

  const [loading, setLoading] = useState(true)
  const [termsLoading, setTermsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showYearModal, setShowYearModal] = useState(false)
  const [showTermModal, setShowTermModal] = useState(false)

  const [editingYear, setEditingYear] = useState(null)
  const [editingTerm, setEditingTerm] = useState(null)

  const [yearForm, setYearForm] = useState(emptyYearForm)
  const [termForm, setTermForm] = useState(emptyTermForm)

  const currentYear = useMemo(
    () => academicYears.find(isYearCurrent),
    [academicYears]
  )

  const selectedYear = useMemo(
    () => academicYears.find((year) => year.id === selectedYearId),
    [academicYears, selectedYearId]
  )

  const activeCount = academicYears.filter(isYearActive).length

  const activeTermCount = academicTerms.filter(isTermActive).length

  const configuredTermCount = academicTerms.length

  const termsByNumber = useMemo(() => {
    const result = {}

    academicTerms.forEach((term) => {
      result[getTermNumber(term)] = term
    })

    return result
  }, [academicTerms])

  async function loadAcademicYears() {
    try {
      setLoading(true)
      setError('')

      const response = await adminService.getAcademicYears()
      const years = getYearsFromResponse(response)

      setAcademicYears(years)

      setSelectedYearId((previousId) => {
        if (previousId && years.some((year) => year.id === previousId)) {
          return previousId
        }

        const current = years.find(isYearCurrent)
        return current?.id || years[0]?.id || ''
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadAcademicTerms(yearId = selectedYearId) {
    if (!yearId) {
      setAcademicTerms([])
      return
    }

    try {
      setTermsLoading(true)
      setError('')

      const response = await adminService.getAcademicTerms(yearId)
      setAcademicTerms(getTermsFromResponse(response))
    } catch (err) {
      setError(getErrorMessage(err))
      setAcademicTerms([])
    } finally {
      setTermsLoading(false)
    }
  }

  useEffect(() => {
    loadAcademicYears()
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      loadAcademicTerms(selectedYearId)
    } else {
      setAcademicTerms([])
    }
  }, [selectedYearId])

  // ======================================================
  // ACADEMIC YEAR ACTIONS
  // ======================================================

  function openCreateYearModal() {
    setEditingYear(null)
    setYearForm(emptyYearForm)
    setError('')
    setSuccess('')
    setShowYearModal(true)
  }

  function openEditYearModal(year) {
    setEditingYear(year)

    setYearForm({
      name: year.name || '',
      code: year.code || '',
      startDate: year.start_date || year.startDate || '',
      endDate: year.end_date || year.endDate || '',
    })

    setError('')
    setSuccess('')
    setShowYearModal(true)
  }

  function closeYearModal() {
    if (saving) return

    setShowYearModal(false)
    setEditingYear(null)
    setYearForm(emptyYearForm)
  }

  function handleYearChange(event) {
    const { name, value } = event.target

    setYearForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleYearSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (yearForm.endDate <= yearForm.startDate) {
      setError('End date must be later than the start date.')
      return
    }

    try {
      setSaving(true)

      const yearData = {
        name: yearForm.name.trim(),
        code: yearForm.code.trim(),
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
      }

      if (editingYear) {
        await adminService.updateAcademicYear(editingYear.id, yearData)
        setSuccess('Academic year updated successfully.')
      } else {
        await adminService.createAcademicYear(yearData)
        setSuccess('Academic year created successfully.')
      }

      setShowYearModal(false)
      setEditingYear(null)
      setYearForm(emptyYearForm)

      await loadAcademicYears()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSetCurrent(year) {
    if (isYearCurrent(year)) return

    if (!window.confirm(`Set ${year.name} as the current academic year?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await adminService.setCurrentAcademicYear(year.id)

      setSuccess(`${year.name} is now the current academic year.`)
      await loadAcademicYears()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleYearStatusChange(year) {
    const active = isYearActive(year)

    if (isYearCurrent(year)) {
      setError(
        'Select another current academic year before deactivating this one.'
      )
      return
    }

    const action = active ? 'deactivate' : 'activate'

    if (!window.confirm(`Are you sure you want to ${action} ${year.name}?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await adminService.updateAcademicYearStatus(year.id, !active)

      setSuccess(`Academic year ${action}d successfully.`)
      await loadAcademicYears()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ======================================================
  // SEMESTER ACTIONS
  // ======================================================

  function openCreateTermModal(semesterNumber) {
    if (!selectedYear) return

    setEditingTerm(null)

    setTermForm({
      semesterNumber: String(semesterNumber),
      name: `Semester ${semesterNumber}`,
      startDate: '',
      endDate: '',
    })

    setError('')
    setSuccess('')
    setShowTermModal(true)
  }

  function openEditTermModal(term) {
    setEditingTerm(term)

    setTermForm({
      semesterNumber: String(getTermNumber(term)),
      name: term.name || '',
      startDate: term.start_date || term.startDate || '',
      endDate: term.end_date || term.endDate || '',
    })

    setError('')
    setSuccess('')
    setShowTermModal(true)
  }

  function closeTermModal() {
    if (saving) return

    setShowTermModal(false)
    setEditingTerm(null)
    setTermForm(emptyTermForm)
  }

  function handleTermChange(event) {
    const { name, value } = event.target

    setTermForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleTermSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedYear) {
      setError('Please select an academic year.')
      return
    }

    if (termForm.endDate <= termForm.startDate) {
      setError('Semester end date must be later than its start date.')
      return
    }

    const yearStart = selectedYear.start_date || selectedYear.startDate
    const yearEnd = selectedYear.end_date || selectedYear.endDate

    if (termForm.startDate < yearStart || termForm.endDate > yearEnd) {
      setError('Semester dates must fall within the selected academic year.')
      return
    }

    try {
      setSaving(true)

      const semesterData = {
        semesterNumber: Number(termForm.semesterNumber),
        name: termForm.name.trim(),
        startDate: termForm.startDate,
        endDate: termForm.endDate,
      }

      if (editingTerm) {
        await adminService.updateAcademicTerm(
          selectedYear.id,
          editingTerm.id,
          semesterData
        )

        setSuccess('Semester updated successfully.')
      } else {
        await adminService.createAcademicTerm(
          selectedYear.id,
          semesterData
        )

        setSuccess('Semester created successfully.')
      }

      setShowTermModal(false)
      setEditingTerm(null)
      setTermForm(emptyTermForm)

      await loadAcademicTerms(selectedYear.id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleTermStatusChange(term) {
    const active = isTermActive(term)
    const action = active ? 'deactivate' : 'activate'

    if (!window.confirm(`Are you sure you want to ${action} ${term.name}?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await adminService.updateAcademicTermStatus(term.id, !active)

      setSuccess(`${term.name} ${action}d successfully.`)
      await loadAcademicTerms(selectedYearId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ======================================================
  // COMMON HELPERS
  // ======================================================

  function formatDate(dateValue) {
    if (!dateValue) return '—'

    return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <section className="academic-years-section">
      <div className="academic-years-heading">
        <div>
          <span className="academic-years-eyebrow">
            ACADEMIC CONFIGURATION
          </span>

          <h2>Academic Year Management</h2>

          <p>
            Configure academic years and manage their semester schedules.
          </p>
        </div>

        <div className="academic-years-heading-actions">
          <button
            type="button"
            className="academic-year-refresh-btn"
            onClick={() => {
              loadAcademicYears()
              if (selectedYearId) loadAcademicTerms(selectedYearId)
            }}
            disabled={loading || termsLoading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="academic-year-add-btn"
            onClick={openCreateYearModal}
          >
            <Plus size={17} />
            Add Academic Year
          </button>
        </div>
      </div>

      {error && !showYearModal && !showTermModal && (
        <div className="academic-year-alert error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="academic-year-alert success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {/* ACADEMIC YEAR SUMMARY */}

      <div className="academic-year-summary-grid">
        <div className="academic-year-summary-card">
          <div className="academic-year-summary-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <span>Total Academic Years</span>
            <strong>{academicYears.length}</strong>
          </div>
        </div>

        <div className="academic-year-summary-card">
          <div className="academic-year-summary-icon active">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Active Academic Years</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="academic-year-summary-card">
          <div className="academic-year-summary-icon current">
            <Clock3 size={20} />
          </div>
          <div>
            <span>Current Academic Year</span>
            <strong>{currentYear?.name || 'Not set'}</strong>
          </div>
        </div>
      </div>

      {/* ACADEMIC YEAR LIST */}

      <div className="academic-year-list-card">
        <div className="academic-year-list-heading">
          <div>
            <h3>All Academic Years</h3>
            <p>Manage current, active and previous academic years.</p>
          </div>

          <span className="academic-year-count">
            {academicYears.length} Records
          </span>
        </div>

        {loading ? (
          <div className="academic-year-empty">
            <RefreshCw className="academic-year-loading-icon" size={22} />
            <span>Loading academic years...</span>
          </div>
        ) : academicYears.length === 0 ? (
          <div className="academic-year-empty">
            <CalendarDays size={30} />
            <strong>No academic years added yet</strong>
            <span>Create the first academic year to get started.</span>

            <button type="button" onClick={openCreateYearModal}>
              <Plus size={16} />
              Add Academic Year
            </button>
          </div>
        ) : (
          <div className="academic-year-table-wrap">
            <table className="academic-year-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Code</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {academicYears.map((year) => {
                  const isCurrent = isYearCurrent(year)
                  const isActive = isYearActive(year)

                  return (
                    <tr key={year.id}>
                      <td>
                        <div className="academic-year-name-cell">
                          <span className="academic-year-row-icon">
                            <CalendarDays size={17} />
                          </span>
                          <strong>{year.name}</strong>
                        </div>
                      </td>

                      <td>{year.code}</td>
                      <td>
                        {formatDate(year.start_date || year.startDate)}
                      </td>
                      <td>
                        {formatDate(year.end_date || year.endDate)}
                      </td>

                      <td>
                        <div className="academic-year-statuses">
                          {isCurrent && (
                            <span className="academic-year-status current">
                              Current
                            </span>
                          )}

                          <span
                            className={`academic-year-status ${
                              isActive ? 'active' : 'inactive'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="academic-year-actions">
                          <button
                            type="button"
                            className="academic-year-action-btn edit"
                            onClick={() => openEditYearModal(year)}
                            title="Edit academic year"
                          >
                            <Pencil size={15} />
                          </button>

                          {!isCurrent && isActive && (
                            <button
                              type="button"
                              className="academic-year-action-btn make-current"
                              onClick={() => handleSetCurrent(year)}
                              title="Set as current"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            className={`academic-year-action-btn ${
                              isActive ? 'deactivate' : 'activate'
                            }`}
                            onClick={() => handleYearStatusChange(year)}
                            disabled={isCurrent}
                            title={
                              isCurrent
                                ? 'The current year cannot be deactivated'
                                : isActive
                                  ? 'Deactivate'
                                  : 'Activate'
                            }
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEMESTER MANAGEMENT */}

      <div className="semester-management-card">
        <div className="semester-management-heading">
          <div className="semester-management-title">
            <span className="semester-management-icon">
              <Layers size={20} />
            </span>

            <div>
              <span className="academic-years-eyebrow">
                SEMESTER CONFIGURATION
              </span>
              <h3>Semester Management</h3>
              <p>
                Configure semester schedules separately for each academic year.
              </p>
            </div>
          </div>

          <div className="semester-year-selector">
            <label htmlFor="semester-academic-year">
              Select Academic Year
            </label>

            <select
              id="semester-academic-year"
              value={selectedYearId}
              onChange={(event) => {
                setSelectedYearId(event.target.value)
                setError('')
                setSuccess('')
              }}
              disabled={academicYears.length === 0}
            >
              {academicYears.length === 0 && (
                <option value="">No academic years available</option>
              )}

              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {isYearCurrent(year) ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedYear && (
          <>
            <div className="semester-summary-row">
              <div>
                <span>Selected Academic Year</span>
                <strong>{selectedYear.name}</strong>
              </div>

              <div>
                <span>Configured Semesters</span>
                <strong>{configuredTermCount} / 8</strong>
              </div>

              <div>
                <span>Active Semesters</span>
                <strong>{activeTermCount}</strong>
              </div>
            </div>

            {error && !showYearModal && !showTermModal && (
              <div className="academic-year-alert error">
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            {termsLoading ? (
              <div className="academic-year-empty">
                <RefreshCw
                  className="academic-year-loading-icon"
                  size={22}
                />
                <span>Loading semesters...</span>
              </div>
            ) : (
              <div className="semester-grid">
                {SEMESTER_NUMBERS.map((number) => {
                  const term = termsByNumber[number]

                  if (!term) {
                    return (
                      <div
                        className="semester-card semester-card-empty"
                        key={number}
                      >
                        <div className="semester-card-top">
                          <span className="semester-number">
                            {String(number).padStart(2, '0')}
                          </span>

                          <span className="semester-status pending">
                            Not Configured
                          </span>
                        </div>

                        <div className="semester-card-content">
                          <h4>Semester {number}</h4>
                          <p>
                            Add the official dates for this semester.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="semester-add-btn"
                          onClick={() => openCreateTermModal(number)}
                        >
                          <Plus size={15} />
                          Configure Semester
                        </button>
                      </div>
                    )
                  }

                  const active = isTermActive(term)

                  return (
                    <div className="semester-card" key={term.id}>
                      <div className="semester-card-top">
                        <span className="semester-number">
                          {String(number).padStart(2, '0')}
                        </span>

                        <span
                          className={`semester-status ${
                            active ? 'active' : 'inactive'
                          }`}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="semester-card-content">
                        <h4>{term.name}</h4>

                        <div className="semester-date-row">
                          <CalendarDays size={14} />
                          <span>
                            {formatDate(term.start_date || term.startDate)}
                          </span>
                        </div>

                        <div className="semester-date-row">
                          <Clock3 size={14} />
                          <span>
                            {formatDate(term.end_date || term.endDate)}
                          </span>
                        </div>
                      </div>

                      <div className="semester-card-actions">
                        <button
                          type="button"
                          className="semester-edit-btn"
                          onClick={() => openEditTermModal(term)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`semester-status-btn ${
                            active ? 'deactivate' : 'activate'
                          }`}
                          onClick={() => handleTermStatusChange(term)}
                          title={active ? 'Deactivate semester' : 'Activate semester'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="semester-information-note">
              <BookOpen size={17} />
              <p>
                FY uses Semesters 1–2, SY uses 3–4, TY uses 5–6 and LY uses
                7–8. All batches share the same university academic year.
                Enter only officially confirmed semester dates.
              </p>
            </div>
          </>
        )}

        {!selectedYear && !loading && (
          <div className="academic-year-empty">
            <CalendarDays size={30} />
            <strong>No academic year selected</strong>
            <span>Create an academic year before configuring semesters.</span>
          </div>
        )}
      </div>

      {/* ACADEMIC YEAR MODAL */}

      {showYearModal && (
        <div className="academic-year-modal-overlay">
          <div className="academic-year-modal">
            <div className="academic-year-modal-header">
              <div>
                <span>ACADEMIC CONFIGURATION</span>
                <h3>
                  {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeYearModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleYearSubmit}>
              {error && (
                <div className="academic-year-alert error">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              <div className="academic-year-form-group">
                <label htmlFor="academic-year-name">Academic Year Name</label>
                <input
                  id="academic-year-name"
                  name="name"
                  type="text"
                  placeholder="e.g. 2026-27"
                  value={yearForm.name}
                  onChange={handleYearChange}
                  required
                />
              </div>

              <div className="academic-year-form-group">
                <label htmlFor="academic-year-code">Academic Year Code</label>
                <input
                  id="academic-year-code"
                  name="code"
                  type="text"
                  placeholder="e.g. AY2026-27"
                  value={yearForm.code}
                  onChange={handleYearChange}
                  required
                />
              </div>

              <div className="academic-year-form-row">
                <div className="academic-year-form-group">
                  <label htmlFor="academic-year-start">Start Date</label>
                  <input
                    id="academic-year-start"
                    name="startDate"
                    type="date"
                    value={yearForm.startDate}
                    onChange={handleYearChange}
                    required
                  />
                </div>

                <div className="academic-year-form-group">
                  <label htmlFor="academic-year-end">End Date</label>
                  <input
                    id="academic-year-end"
                    name="endDate"
                    type="date"
                    value={yearForm.endDate}
                    onChange={handleYearChange}
                    min={yearForm.startDate || undefined}
                    required
                  />
                </div>
              </div>

              <p className="academic-year-form-note">
                Semester dates are configured separately. Changing academic
                year dates will not automatically change historical semester
                dates or student academic records.
              </p>

              <div className="academic-year-modal-actions">
                <button
                  type="button"
                  className="academic-year-cancel-btn"
                  onClick={closeYearModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="academic-year-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingYear
                      ? 'Save Changes'
                      : 'Create Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEMESTER MODAL */}

      {showTermModal && (
        <div className="academic-year-modal-overlay">
          <div className="academic-year-modal">
            <div className="academic-year-modal-header">
              <div>
                <span>SEMESTER CONFIGURATION</span>
                <h3>{editingTerm ? 'Edit Semester' : 'Configure Semester'}</h3>
              </div>

              <button
                type="button"
                onClick={closeTermModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTermSubmit}>
              {error && (
                <div className="academic-year-alert error">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              <div className="academic-year-form-group">
                <label htmlFor="semester-number">Semester Number</label>
                <select
                  id="semester-number"
                  name="semesterNumber"
                  value={termForm.semesterNumber}
                  onChange={handleTermChange}
                  required
                  disabled={Boolean(editingTerm)}
                >
                  {SEMESTER_NUMBERS.map((number) => (
                    <option key={number} value={number}>
                      Semester {number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="academic-year-form-group">
                <label htmlFor="semester-name">Semester Name</label>
                <input
                  id="semester-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Semester 1"
                  value={termForm.name}
                  onChange={handleTermChange}
                  required
                  maxLength={255}
                />
              </div>

              <div className="academic-year-form-row">
                <div className="academic-year-form-group">
                  <label htmlFor="semester-start">Start Date</label>
                  <input
                    id="semester-start"
                    name="startDate"
                    type="date"
                    value={termForm.startDate}
                    onChange={handleTermChange}
                    min={selectedYear?.start_date || selectedYear?.startDate}
                    max={selectedYear?.end_date || selectedYear?.endDate}
                    required
                  />
                </div>

                <div className="academic-year-form-group">
                  <label htmlFor="semester-end">End Date</label>
                  <input
                    id="semester-end"
                    name="endDate"
                    type="date"
                    value={termForm.endDate}
                    onChange={handleTermChange}
                    min={termForm.startDate || undefined}
                    max={selectedYear?.end_date || selectedYear?.endDate}
                    required
                  />
                </div>
              </div>

              <p className="academic-year-form-note">
                Semester dates must fall within {selectedYear?.name}. Use
                officially confirmed university dates. These dates are stored
                separately from the academic year dates.
              </p>

              <div className="academic-year-modal-actions">
                <button
                  type="button"
                  className="academic-year-cancel-btn"
                  onClick={closeTermModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="academic-year-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingTerm
                      ? 'Save Changes'
                      : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
