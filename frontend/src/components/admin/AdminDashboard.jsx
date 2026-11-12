
import './AdminDashboard.css'
import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap,
  Users,
  UserRound,
  BookOpen,
  School,
  Search,
  RefreshCw,
  LogOut,
  ArrowRight,
  Building2,
  AlertCircle,
  Plus,
  MoreVertical,
  Pencil,
  Power,
  CalendarDays,
} from 'lucide-react'

import adminService from '../../services/adminService'
import SchoolFormModal from './SchoolFormModal'
import AcademicYearManagement from './AcademicYearManagement'

function AdminDashboard({ profile, onLogout, onOpenSchool }) {
  const [dashboard, setDashboard] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [modalMode, setModalMode] = useState('add')
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [savingSchool, setSavingSchool] = useState(false)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [savingSchoolId, setSavingSchoolId] = useState(null)

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.getDashboard()

      if (!result.success || !result.data) {
        throw new Error('Unable to load university dashboard.')
      }

      setDashboard(result.data)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Something went wrong while loading the dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const filteredSchools = useMemo(() => {
    const schools = dashboard?.schools || []
    const search = searchTerm.trim().toLowerCase()

    if (!search) return schools

    return schools.filter(school =>
      school.name.toLowerCase().includes(search) ||
      school.code.toLowerCase().includes(search)
    )
  }, [dashboard, searchTerm])

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleNavigationKeyDown = (event, sectionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      scrollToSection(sectionId)
    }
  }

  const handleAddSchool = () => {
    setSelectedSchool(null)
    setModalMode('add')
    setOpenMenuId(null)
    setError('')
    setFeedback('')
    setModalOpen(true)
  }

  const handleEditSchool = (school) => {
    setSelectedSchool(school)
    setModalMode('edit')
    setOpenMenuId(null)
    setError('')
    setFeedback('')
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (savingSchool) return
    setModalOpen(false)
    setSelectedSchool(null)
  }

  const handleSchoolSubmit = async (schoolData) => {
    setSavingSchool(true)
    setError('')
    setFeedback('')

    try {
      if (modalMode === 'edit' && selectedSchool) {
        await adminService.updateSchool(selectedSchool.id, schoolData)
        setFeedback('School details updated successfully.')
      } else {
        await adminService.createSchool(schoolData)
        setFeedback('New school created successfully.')
      }

      setModalOpen(false)
      setSelectedSchool(null)
      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to save school details.'
      )
    } finally {
      setSavingSchool(false)
    }
  }

  const handleSchoolStatus = async (school) => {
    const action = school.is_active ? 'deactivate' : 'activate'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${school.name}?`
    )

    if (!confirmed) {
      setOpenMenuId(null)
      return
    }

    setOpenMenuId(null)
    setSavingSchoolId(school.id)
    setError('')
    setFeedback('')

    try {
      await adminService.updateSchoolStatus(
        school.id,
        !school.is_active
      )

      setFeedback(
        school.is_active
          ? `${school.name} has been deactivated.`
          : `${school.name} has been activated.`
      )

      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to update school status.'
      )
    } finally {
      setSavingSchoolId(null)
    }
  }

  const stats = dashboard?.stats

  const statCards = [
    {
      title: 'Total Schools',
      value: stats?.total_schools ?? 0,
      icon: School,
      color: 'blue',
    },
    {
      title: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: Users,
      color: 'green',
    },
    {
      title: 'Total Faculty',
      value: stats?.total_faculty ?? 0,
      icon: UserRound,
      color: 'purple',
    },
    {
      title: 'Total Electives',
      value: stats?.total_electives ?? 0,
      icon: BookOpen,
      color: 'orange',
    },
  ]

  return (
    <main className="admin-page">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="admin-brand">
          <div className="admin-brand-icon">
            <GraduationCap size={27} />
          </div>

          <div>
            <h2>SmartSelect</h2>
            <span>MIT ADT UNIVERSITY</span>
          </div>
        </div>

        <div className="admin-navigation">

          <span className="admin-nav-heading">
            UNIVERSITY ADMINISTRATION
          </span>

          <div
            className="admin-nav-item active"
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection('university-overview')}
            onKeyDown={(event) =>
              handleNavigationKeyDown(event, 'university-overview')
            }
          >
            <Building2 size={19} />
            <span>University Overview</span>
          </div>

          <div
            className="admin-nav-item"
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection('school-management')}
            onKeyDown={(event) =>
              handleNavigationKeyDown(event, 'school-management')
            }
          >
            <School size={19} />
            <span>School Management</span>
          </div>

          <div
            className="admin-nav-item"
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection('academic-year-management')}
            onKeyDown={(event) =>
              handleNavigationKeyDown(event, 'academic-year-management')
            }
          >
            <CalendarDays size={19} />
            <span>Academic Year Management</span>
          </div>

        </div>

        <div className="admin-sidebar-footer">

          <div className="admin-user">
            <div className="admin-avatar">
              {(profile?.name || 'A').charAt(0).toUpperCase()}
            </div>

            <div className="admin-user-info">
              <strong>{profile?.name || 'Administrator'}</strong>
              <span>University Admin</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Sign out
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="admin-main">

        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">
              SmartSelect / Administration
            </span>
            <h1>University Dashboard</h1>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-role-badge">
              University Admin
            </span>
          </div>
        </header>

        <div className="admin-content">

          {/* WELCOME */}
          <section
            className="admin-welcome"
            id="university-overview"
          >
            <div>
              <span>UNIVERSITY OVERVIEW</span>
              <h2>
                Welcome, {profile?.name || 'Administrator'}
              </h2>
              <p>
                Manage university schools, academic years and monitor
                overall academic activity from one place.
              </p>
            </div>

            <div className="admin-welcome-icon">
              <GraduationCap size={48} />
            </div>
          </section>

          {/* FEEDBACK */}
          {feedback && (
            <div className="admin-success">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback('')}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="admin-error">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button type="button" onClick={loadDashboard}>
                Retry
              </button>
            </div>
          )}

          {/* UNIVERSITY STATISTICS */}
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>University Statistics</h2>
                <p>
                  Overall university registration and elective overview.
                </p>
              </div>

              <button
                type="button"
                className="admin-refresh-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={loading ? 'admin-spinning' : ''}
                />
                Refresh
              </button>
            </div>

            <div className="admin-stats-grid">
              {statCards.map((stat) => {
                const Icon = stat.icon

                return (
                  <article
                    className={`admin-stat-card ${stat.color}`}
                    key={stat.title}
                  >
                    <div className="admin-stat-top">
                      <span>{stat.title}</span>
                      <div className="admin-stat-icon">
                        <Icon size={21} />
                      </div>
                    </div>

                    <strong>
                      {loading
                        ? '—'
                        : stat.value.toLocaleString('en-IN')}
                    </strong>

                    <span className="admin-stat-caption">
                      University-wide count
                    </span>
                  </article>
                )
              })}
            </div>
          </section>

          {/* SCHOOL MANAGEMENT */}
          <section
            className="admin-section"
            id="school-management"
          >
            <div className="admin-section-heading">
              <div>
                <h2>School Management</h2>
                <p>
                  View, register and manage university schools.
                </p>
              </div>

              <button
                type="button"
                className="admin-add-school-button"
                onClick={handleAddSchool}
              >
                <Plus size={17} />
                Add School
              </button>
            </div>

            <div className="admin-school-toolbar">
              <div className="admin-search-box">
                <Search size={19} />
                <input
                  type="search"
                  placeholder="Search by school name or code..."
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                />
              </div>

              <span className="admin-school-count">
                {dashboard?.schools?.length ?? 0} Schools
              </span>
            </div>

            {loading && !dashboard && (
              <div className="admin-loading">
                <RefreshCw
                  size={25}
                  className="admin-spinning"
                />
                <p>Loading university data...</p>
              </div>
            )}

            {!loading && dashboard && (
              <div className="admin-school-grid">
                {filteredSchools.map(school => (
                  <article
                    className="admin-school-card"
                    key={school.id}
                  >
                    <div className="admin-school-card-top">
                      <div className="admin-school-icon">
                        <School size={23} />
                      </div>

                      <div className="admin-school-card-actions">
                        <span
                          className={`admin-status ${
                            school.is_active ? 'active' : 'inactive'
                          }`}
                        >
                          {school.is_active ? 'Active' : 'Inactive'}
                        </span>

                        <div className="admin-school-menu-wrapper">
                          <button
                            type="button"
                            className="admin-school-menu-button"
                            aria-label={`Manage ${school.name}`}
                            aria-expanded={openMenuId === school.id}
                            onClick={() => {
                              setOpenMenuId(
                                openMenuId === school.id
                                  ? null
                                  : school.id
                              )
                            }}
                          >
                            <MoreVertical size={20} />
                          </button>

                          {openMenuId === school.id && (
                            <div className="admin-school-dropdown">
                              <button
                                type="button"
                                onClick={() => handleEditSchool(school)}
                              >
                                <Pencil size={15} />
                                Edit School
                              </button>

                              <button
                                type="button"
                                className={
                                  school.is_active
                                    ? 'admin-deactivate-action'
                                    : 'admin-activate-action'
                                }
                                disabled={savingSchoolId === school.id}
                                onClick={() => handleSchoolStatus(school)}
                              >
                                <Power size={15} />
                                {savingSchoolId === school.id
                                  ? 'Updating...'
                                  : school.is_active
                                    ? 'Deactivate School'
                                    : 'Activate School'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="admin-school-info">
                      <span className="admin-school-code">
                        {school.code}
                      </span>
                      <h3>{school.name}</h3>
                    </div>

                    <div className="admin-school-stats">
                      <div>
                        <Users size={16} />
                        <strong>{school.student_count}</strong>
                        <span>Students</span>
                      </div>

                      <div>
                        <UserRound size={16} />
                        <strong>{school.faculty_count}</strong>
                        <span>Faculty</span>
                      </div>

                      <div>
                        <BookOpen size={16} />
                        <strong>{school.elective_count}</strong>
                        <span>Electives</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-open-school"
                      disabled={!school.is_active || !onOpenSchool}
                      onClick={() => onOpenSchool?.(school)}
                    >
                      Open Dashboard
                      <ArrowRight size={17} />
                    </button>
                  </article>
                ))}

                {filteredSchools.length === 0 && (
                  <div className="admin-empty-state">
                    <Search size={30} />
                    <h3>No schools found</h3>
                    <p>
                      Try searching with another name or school code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ACADEMIC YEAR MANAGEMENT */}
          <section
            className="admin-section"
            id="academic-year-management"
          >
            <AcademicYearManagement />
          </section>

        </div>

        <footer className="admin-footer">
          SmartSelect · MIT ADT University
          <span>University Administration Portal</span>
        </footer>
      </section>

      {/* ADD / EDIT SCHOOL MODAL */}
      {modalOpen && (
        <SchoolFormModal
          mode={modalMode}
          school={selectedSchool}
          saving={savingSchool}
          onClose={handleCloseModal}
          onSubmit={handleSchoolSubmit}
        />
      )}

    </main>
  )
}

export default AdminDashboard
