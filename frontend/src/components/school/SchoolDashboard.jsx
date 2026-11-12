
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Layers3,
  LayoutDashboard,
  UserRound,
  ClipboardList,
  BarChart3,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Pencil,
  Power,
  X,
  Save,
} from 'lucide-react'

import schoolService from '../../services/schoolService'
import './SchoolDashboard.css'

function SchoolDashboard({ school, onBack }) {
  const [dashboard, setDashboard] = useState(null)
  const [departments, setDepartments] = useState([])

  // Student directory states.
  const [students, setStudents] = useState([])
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)
  const [studentError, setStudentError] = useState('')
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  const [currentView, setCurrentView] = useState('overview')

  const [isLoading, setIsLoading] = useState(true)
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false)
  const [error, setError] = useState('')
  const [departmentError, setDepartmentError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
  })

  // Load school dashboard.
  const fetchDashboard = async () => {
    if (!school?.id) {
      setError('No school has been selected.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await schoolService.getDashboard(school.id)

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Unable to load school dashboard.')
      }

      setDashboard(result.data)
      setDepartments(result.data.departments || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load school information.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Load departments for the selected school.
  const fetchDepartments = async () => {
    if (!school?.id) return

    setIsDepartmentsLoading(true)
    setDepartmentError('')

    try {
      const result = await schoolService.getDepartments(school.id)

      if (!result.success) {
        throw new Error(result.message || 'Unable to load departments.')
      }

      setDepartments(result.data || [])
    } catch (err) {
      setDepartmentError(
        err.response?.data?.message ||
        err.message ||
        'Unable to retrieve departments.'
      )
    } finally {
      setIsDepartmentsLoading(false)
    }
  }

  // Load students for the selected school.
  const fetchStudents = async () => {
    if (!school?.id) return

    setIsStudentsLoading(true)
    setStudentError('')

    try {
      const result = await schoolService.getStudents(school.id)

      if (!result.success) {
        throw new Error(result.message || 'Unable to load students.')
      }

      setStudents(result.data || [])
    } catch (err) {
      setStudentError(
        err.response?.data?.message ||
        err.message ||
        'Unable to retrieve students.'
      )
    } finally {
      setIsStudentsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [school?.id])

  useEffect(() => {
    if (currentView === 'departments') {
      fetchDepartments()
    }
  }, [currentView, school?.id])

  useEffect(() => {
    if (currentView === 'students') {
      fetchStudents()
    }
  }, [currentView, school?.id])

  // Open Add Department modal.
  const handleAddDepartment = () => {
    setEditingDepartment(null)
    setFormData({ name: '', code: '' })
    setDepartmentError('')
    setShowModal(true)
  }

  // Open Edit Department modal.
  const handleEditDepartment = (department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name,
      code: department.code || '',
    })
    setDepartmentError('')
    setShowModal(true)
  }

  // Save department.
  const handleSaveDepartment = async (event) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.code.trim()) {
      setDepartmentError('Please enter both department name and code.')
      return
    }

    setIsSaving(true)
    setDepartmentError('')
    setSuccessMessage('')

    try {
      if (editingDepartment) {
        await schoolService.updateDepartment(
          school.id,
          editingDepartment.id,
          formData
        )

        setSuccessMessage('Department updated successfully.')
      } else {
        await schoolService.createDepartment(school.id, formData)

        setSuccessMessage('Department created successfully.')
      }

      setShowModal(false)
      setEditingDepartment(null)
      setFormData({ name: '', code: '' })

      await fetchDepartments()
      await fetchDashboard()
    } catch (err) {
      setDepartmentError(
        err.response?.data?.message ||
        err.message ||
        'Unable to save department.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Activate or deactivate department.
  const handleToggleStatus = async (department) => {
    const nextStatus = !department.is_active

    const confirmed = window.confirm(
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} ${department.name}?`
    )

    if (!confirmed) return

    setDepartmentError('')
    setSuccessMessage('')

    try {
      await schoolService.updateDepartmentStatus(
        school.id,
        department.id,
        nextStatus
      )

      setSuccessMessage(
        `Department ${nextStatus ? 'activated' : 'deactivated'} successfully.`
      )

      await fetchDepartments()
      await fetchDashboard()
    } catch (err) {
      setDepartmentError(
        err.response?.data?.message ||
        err.message ||
        'Unable to update department status.'
      )
    }
  }

  const stats = dashboard?.stats

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: Users,
      description: 'Active academic records',
    },
    {
      label: 'Total Faculty',
      value: stats?.total_faculty ?? 0,
      icon: GraduationCap,
      description: 'Assigned faculty members',
    },
    {
      label: 'Departments',
      value: stats?.total_departments ?? 0,
      icon: Building2,
      description: 'School departments',
    },
    {
      label: 'Specializations',
      value: stats?.total_specializations ?? 0,
      icon: Layers3,
      description: 'Active specializations',
    },
    {
      label: 'Active Electives',
      value: stats?.total_electives ?? 0,
      icon: BookOpen,
      description: 'Available elective offerings',
    },
  ]

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard, view: 'overview' },
    { label: 'Students', icon: Users, view: 'students' },
    { label: 'Faculty', icon: UserRound },
    { label: 'Departments', icon: Building2, view: 'departments' },
    { label: 'Electives', icon: BookOpen },
    { label: 'Reports', icon: BarChart3 },
    { label: 'Settings', icon: Settings },
  ]

  // Search departments.
  const filteredDepartments = departments.filter((department) => {
    const search = searchTerm.toLowerCase()

    return (
      (department.name || '').toLowerCase().includes(search) ||
      (department.code || '').toLowerCase().includes(search)
    )
  })

  // Search students.
  const filteredStudents = students.filter((student) => {
    const search = studentSearchTerm.toLowerCase()

    return (
      (student.full_name || '').toLowerCase().includes(search) ||
      (student.enrollment_number || '').toLowerCase().includes(search) ||
      (student.email || '').toLowerCase().includes(search) ||
      (student.department?.name || '').toLowerCase().includes(search) ||
      (student.specialization?.name || '').toLowerCase().includes(search)
    )
  })

  return (
    <div className="school-dashboard">

      <aside className="school-sidebar">
        <div className="school-brand">
          <div className="school-brand-icon">
            <GraduationCap size={25} />
          </div>

          <div>
            <h2>SmartSelect</h2>
            <span>MIT ADT UNIVERSITY</span>
          </div>
        </div>

        <div className="school-sidebar-label">
          SCHOOL MANAGEMENT
        </div>

        <nav className="school-navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = item.view === currentView

            return (
              <button
                key={item.label}
                type="button"
                className={`school-nav-item ${
                  isActive ? 'active' : !item.view ? 'disabled' : ''
                }`}
                onClick={() => {
                  if (item.view) {
                    setCurrentView(item.view)
                    setSuccessMessage('')
                    setDepartmentError('')
                    setStudentError('')
                  }
                }}
                disabled={!item.view}
                title={!item.view ? 'Available in a later step' : item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {!item.view && <small>Later</small>}
              </button>
            )
          })}
        </nav>

        <div className="school-sidebar-footer">
          <ShieldIcon />
          <div>
            <strong>Secure Workspace</strong>
            <span>University administration</span>
          </div>
        </div>
      </aside>

      <main className="school-main">

        <header className="school-topbar">
          <div className="school-breadcrumb">
            <button
              type="button"
              className="school-back-button"
              onClick={onBack}
            >
              <ArrowLeft size={17} />
              University Dashboard
            </button>

            <span className="school-breadcrumb-divider">/</span>

            <span>
              {currentView === 'overview'
                ? 'School Overview'
                : currentView === 'departments'
                  ? 'Departments'
                  : 'Students'}
            </span>
          </div>

          <div className="school-admin-label">
            <div className="school-admin-avatar">A</div>
            <div>
              <strong>University Admin</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="school-content">

          <section className="school-welcome">
            <div>
              <span className="school-eyebrow">
                SCHOOL MANAGEMENT
              </span>

              <h1>
                {dashboard?.school?.name || school?.name || 'School Dashboard'}
              </h1>

              <p>
                Monitor academic information and manage this school's
                resources from one workspace.
              </p>

              <div className="school-meta">
                <span>
                  School Code: {dashboard?.school?.code || school?.code || '—'}
                </span>

                <span
                  className={
                    dashboard?.school?.is_active
                      ? 'school-status active'
                      : 'school-status inactive'
                  }
                >
                  {dashboard?.school?.is_active ? (
                    <CheckCircle2 size={14} />
                  ) : null}
                  {dashboard?.school?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="school-welcome-icon">
              <GraduationCap size={55} />
            </div>
          </section>

          {isLoading ? (
            <section className="school-state-card">
              <RefreshCw className="school-loading-icon" size={28} />
              <h3>Loading school information</h3>
              <p>Please wait while we retrieve the latest data.</p>
            </section>
          ) : error ? (
            <section className="school-state-card school-error-card">
              <AlertCircle size={30} />
              <h3>Unable to load dashboard</h3>
              <p>{error}</p>

              <button
                type="button"
                className="school-retry-button"
                onClick={fetchDashboard}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </section>
          ) : (
            <>
              {/* SCHOOL OVERVIEW */}
              {currentView === 'overview' && (
                <>
                  <section className="school-section-heading">
                    <div>
                      <h2>School Overview</h2>
                      <p>Key academic statistics for this school.</p>
                    </div>

                    <span className="school-live-label">
                      <span />
                      Live database data
                    </span>
                  </section>

                  <section className="school-stats-grid">
                    {statCards.map((item) => {
                      const Icon = item.icon

                      return (
                        <article className="school-stat-card" key={item.label}>
                          <div className="school-stat-top">
                            <span>{item.label}</span>

                            <div className="school-stat-icon">
                              <Icon size={21} />
                            </div>
                          </div>

                          <strong>{item.value.toLocaleString('en-IN')}</strong>
                          <p>{item.description}</p>
                        </article>
                      )
                    })}
                  </section>

                  <section className="school-departments-card">
                    <div className="school-card-heading">
                      <div>
                        <h2>Departments</h2>
                        <p>Departments registered under this school.</p>
                      </div>

                      <button
                        type="button"
                        className="school-primary-button"
                        onClick={() => setCurrentView('departments')}
                      >
                        Manage Departments
                      </button>
                    </div>

                    {dashboard?.departments?.length > 0 ? (
                      <div className="school-table-wrapper">
                        <table className="school-table">
                          <thead>
                            <tr>
                              <th>Department Name</th>
                              <th>Department Code</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {dashboard.departments.map((department) => (
                              <tr key={department.id}>
                                <td>
                                  <div className="school-department-name">
                                    <div><Building2 size={18} /></div>
                                    <strong>{department.name}</strong>
                                  </div>
                                </td>
                                <td>{department.code || '—'}</td>
                                <td>
                                  <span className={`school-department-status ${
                                    department.is_active ? 'active' : 'inactive'
                                  }`}>
                                    {department.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="school-empty-state">
                        <ClipboardList size={30} />
                        <strong>No departments found</strong>
                        <span>
                          Add departments to this school to get started.
                        </span>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* STUDENTS DIRECTORY */}
              {currentView === 'students' && (
                <>
                  <section className="school-section-heading school-department-page-heading">
                    <div>
                      <h2>Student Directory</h2>
                      <p>
                        View students assigned to{' '}
                        {dashboard?.school?.name || school?.name}.
                      </p>
                    </div>

                    <span className="school-live-label">
                      <span />
                      {students.length} students registered
                    </span>
                  </section>

                  {studentError && students.length > 0 && (
                    <div className="school-error-message">
                      <AlertCircle size={17} />
                      {studentError}
                    </div>
                  )}

                  <section className="school-departments-card school-management-card">
                    <div className="school-department-toolbar">
                      <div>
                        <h3>All Students</h3>
                        <p>
                          {students.length} active student records
                        </p>
                      </div>

                      <div className="school-search-box">
                        <Search size={17} />
                        <input
                          type="text"
                          placeholder="Search name, enrollment, email..."
                          value={studentSearchTerm}
                          onChange={(event) =>
                            setStudentSearchTerm(event.target.value)
                          }
                        />
                      </div>
                    </div>

                    {isStudentsLoading ? (
                      <div className="school-state-card">
                        <RefreshCw
                          className="school-loading-icon"
                          size={26}
                        />
                        <h3>Loading students</h3>
                        <p>Please wait...</p>
                      </div>
                    ) : studentError && students.length === 0 ? (
                      <div className="school-empty-state">
                        <AlertCircle size={30} />
                        <strong>Unable to load students</strong>
                        <span>{studentError}</span>

                        <button
                          type="button"
                          className="school-retry-button"
                          onClick={fetchStudents}
                        >
                          <RefreshCw size={15} />
                          Try Again
                        </button>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div className="school-table-wrapper">
                        <table className="school-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Enrollment Number</th>
                              <th>Department</th>
                              <th>Specialization</th>
                              <th>Year / Division</th>
                              <th>Email</th>
                              <th>Account Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredStudents.map((student) => (
                              <tr key={student.student_id}>
                                <td>
                                  <div className="school-department-name">
                                    <div>
                                      <Users size={18} />
                                    </div>
                                    <strong>
                                      {student.full_name || 'Unnamed Student'}
                                    </strong>
                                  </div>
                                </td>

                                <td>{student.enrollment_number || '—'}</td>

                                <td>
                                  {student.department?.name || '—'}
                                </td>

                                <td>
                                  {student.specialization?.name || '—'}
                                </td>

                                <td>
                                  {student.academic_year_level || '—'}
                                  {student.division
                                    ? ` / ${student.division}`
                                    : ''}
                                </td>

                                <td>{student.email || '—'}</td>

                                <td>
                                  <span
                                    className={`school-department-status ${
                                      student.account_status === 'active'
                                        ? 'active'
                                        : 'inactive'
                                    }`}
                                  >
                                    {student.account_status || 'Unknown'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="school-empty-state">
                        <Users size={32} />

                        <strong>
                          {studentSearchTerm
                            ? 'No matching students'
                            : 'No students assigned yet'}
                        </strong>

                        <span>
                          {studentSearchTerm
                            ? 'Try a different name, enrollment number or email.'
                            : 'Students will appear here after their academic records are assigned to this school.'}
                        </span>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* DEPARTMENT MANAGEMENT */}
              {currentView === 'departments' && (
                <>
                  <section className="school-section-heading school-department-page-heading">
                    <div>
                      <h2>Department Management</h2>
                      <p>
                        Add, update and manage departments under{' '}
                        {dashboard?.school?.name || school?.name}.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="school-primary-button"
                      onClick={handleAddDepartment}
                    >
                      <Plus size={17} />
                      Add Department
                    </button>
                  </section>

                  {successMessage && (
                    <div className="school-success-message">
                      <CheckCircle2 size={17} />
                      {successMessage}
                    </div>
                  )}

                  {departmentError && (
                    <div className="school-error-message">
                      <AlertCircle size={17} />
                      {departmentError}
                    </div>
                  )}

                  <section className="school-departments-card school-management-card">
                    <div className="school-department-toolbar">
                      <div>
                        <h3>All Departments</h3>
                        <p>
                          {departments.length} departments registered
                        </p>
                      </div>

                      <div className="school-search-box">
                        <Search size={17} />
                        <input
                          type="text"
                          placeholder="Search departments..."
                          value={searchTerm}
                          onChange={(event) =>
                            setSearchTerm(event.target.value)
                          }
                        />
                      </div>
                    </div>

                    {isDepartmentsLoading ? (
                      <div className="school-state-card">
                        <RefreshCw
                          className="school-loading-icon"
                          size={26}
                        />
                        <h3>Loading departments</h3>
                        <p>Please wait...</p>
                      </div>
                    ) : departmentError && departments.length === 0 ? (
                      <div className="school-empty-state">
                        <AlertCircle size={30} />
                        <strong>Unable to load departments</strong>

                        <button
                          type="button"
                          className="school-retry-button"
                          onClick={fetchDepartments}
                        >
                          <RefreshCw size={15} />
                          Try Again
                        </button>
                      </div>
                    ) : filteredDepartments.length > 0 ? (
                      <div className="school-table-wrapper">
                        <table className="school-table">
                          <thead>
                            <tr>
                              <th>Department Name</th>
                              <th>Department Code</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredDepartments.map((department) => (
                              <tr key={department.id}>
                                <td>
                                  <div className="school-department-name">
                                    <div>
                                      <Building2 size={18} />
                                    </div>
                                    <strong>{department.name}</strong>
                                  </div>
                                </td>

                                <td>{department.code || '—'}</td>

                                <td>
                                  <span className={`school-department-status ${
                                    department.is_active ? 'active' : 'inactive'
                                  }`}>
                                    {department.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>

                                <td>
                                  <div className="school-department-actions">
                                    <button
                                      type="button"
                                      title="Edit department"
                                      onClick={() =>
                                        handleEditDepartment(department)
                                      }
                                    >
                                      <Pencil size={16} />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className={
                                        department.is_active
                                          ? 'deactivate'
                                          : 'activate'
                                      }
                                      title={
                                        department.is_active
                                          ? 'Deactivate department'
                                          : 'Activate department'
                                      }
                                      onClick={() =>
                                        handleToggleStatus(department)
                                      }
                                    >
                                      <Power size={16} />
                                      {department.is_active
                                        ? 'Deactivate'
                                        : 'Activate'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="school-empty-state">
                        <ClipboardList size={32} />

                        <strong>
                          {searchTerm
                            ? 'No matching departments'
                            : 'No departments added yet'}
                        </strong>

                        <span>
                          {searchTerm
                            ? 'Try a different department name or code.'
                            : 'Use the Add Department button to create your first department.'}
                        </span>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}

          <footer className="school-page-footer">
            SmartSelect · MIT ADT University
          </footer>

        </div>
      </main>

      {/* ADD / EDIT DEPARTMENT MODAL */}
      {showModal && (
        <div
          className="school-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setShowModal(false)
            }
          }}
        >
          <section
            className="school-department-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-department-modal-title"
          >
            <div className="school-modal-heading">
              <div>
                <span>DEPARTMENT MANAGEMENT</span>
                <h2 id="school-department-modal-title">
                  {editingDepartment ? 'Edit Department' : 'Add Department'}
                </h2>
                <p>
                  {editingDepartment
                    ? 'Update the department information below.'
                    : 'Enter the details to register a new department.'}
                </p>
              </div>

              <button
                type="button"
                className="school-modal-close"
                disabled={isSaving}
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment}>
              {departmentError && (
                <div className="school-error-message">
                  <AlertCircle size={16} />
                  {departmentError}
                </div>
              )}

              <label htmlFor="department-name">Department Name</label>
              <input
                id="department-name"
                type="text"
                placeholder="e.g. Computer Science and Engineering"
                value={formData.name}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    name: event.target.value,
                  })
                }
                maxLength={100}
                required
              />

              <label htmlFor="department-code">Department Code</label>
              <input
                id="department-code"
                type="text"
                placeholder="e.g. CSE"
                value={formData.code}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    code: event.target.value.toUpperCase(),
                  })
                }
                maxLength={20}
                required
              />

              <div className="school-modal-actions">
                <button
                  type="button"
                  className="school-secondary-button"
                  disabled={isSaving}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="school-primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw
                      size={16}
                      className="school-loading-icon"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {isSaving
                    ? 'Saving...'
                    : editingDepartment
                      ? 'Save Changes'
                      : 'Create Department'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

    </div>
  )
}

function ShieldIcon() {
  return (
    <div className="school-secure-icon">
      <CheckCircle2 size={19} />
    </div>
  )
}

export default SchoolDashboard
