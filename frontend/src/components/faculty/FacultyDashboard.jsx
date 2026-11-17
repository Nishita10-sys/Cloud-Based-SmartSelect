
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  UserRound,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Mail,
  Phone,
  BriefcaseBusiness,
  CalendarDays,
  Building2,
  ClipboardList,
} from 'lucide-react'

import api from '../../services/api'
import './FacultyDashboard.css'

function FacultyDashboard({ profile, onLogout }) {
  const [activePage, setActivePage] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [electives, setElectives] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const faculty = dashboard?.faculty
  const stats = dashboard?.stats

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [dashboardResponse, electivesResponse, studentsResponse] =
        await Promise.all([
          api.get('/faculty/dashboard'),
          api.get('/faculty/electives'),
          api.get('/faculty/students'),
        ])

      setDashboard(dashboardResponse.data.data)
      setElectives(electivesResponse.data.data || [])
      setStudents(studentsResponse.data.data || [])
    } catch (err) {
      console.error('Faculty dashboard loading error:', err)

      setError(
        err.response?.data?.message ||
        'Unable to load faculty dashboard. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const navigation = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: UserRound,
    },
    {
      id: 'electives',
      label: 'My Electives',
      icon: BookOpen,
    },
    {
      id: 'students',
      label: 'Student Enrollments',
      icon: Users,
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings,
    },
  ]

  const fullName =
    faculty?.profile?.full_name ||
    profile?.full_name ||
    profile?.name ||
    'Faculty Member'

  const departmentName = faculty?.department?.name || 'Not assigned'

  const openPage = (page) => {
    setActivePage(page)
    setSidebarOpen(false)
  }

  const formatDate = (date) => {
    if (!date) return 'Not available'

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getYearLabel = (year) => {
    if (!year) return 'Not available'

    const labels = {
      FY: 'First Year',
      SY: 'Second Year',
      TY: 'Third Year',
      LY: 'Final Year',
    }

    return labels[year] || year
  }

  const getStudentName = (student) => {
    return student.profile?.full_name || 'Unknown Student'
  }

  const getElectiveName = (offering) => {
    return offering.electives?.name || 'Elective'
  }

  const renderOverview = () => (
    <>
      <div className="faculty-welcome">
        <div>
          <span className="faculty-eyebrow">FACULTY WORKSPACE</span>
          <h2>Welcome back, {fullName.split(' ')[0]}</h2>
          <p>
            Here's an overview of your academic responsibilities
            and assigned electives.
          </p>
        </div>

        <div className="faculty-welcome-icon">
          <GraduationCap size={35} />
        </div>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div>
            <span>Assigned Electives</span>
            <h3>{stats?.assigned_electives ?? 0}</h3>
          </div>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-icon green">
            <Users size={22} />
          </div>
          <div>
            <span>Selected Students</span>
            <h3>{stats?.total_students ?? 0}</h3>
          </div>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-icon purple">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Primary Assignments</span>
            <h3>{stats?.primary_assignments ?? 0}</h3>
          </div>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-icon orange">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <span>Assistant Assignments</span>
            <h3>{stats?.assistant_assignments ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="faculty-content-grid">
        <section className="faculty-panel">
          <div className="faculty-panel-heading">
            <div>
              <h3>My Assigned Electives</h3>
              <p>Electives assigned to your faculty account</p>
            </div>

            <button
              className="faculty-text-action"
              onClick={() => openPage('electives')}
            >
              View all <ChevronRight size={16} />
            </button>
          </div>

          {electives.length === 0 ? (
            <div className="faculty-empty-state">
              <BookOpen size={30} />
              <p>No electives have been assigned yet.</p>
            </div>
          ) : (
            <div className="faculty-recent-list">
              {electives.slice(0, 4).map((item) => (
                <div className="faculty-list-item" key={item.id}>
                  <div className="faculty-list-icon">
                    <BookOpen size={19} />
                  </div>

                  <div className="faculty-list-details">
                    <strong>{getElectiveName(item)}</strong>
                    <span>
                      {item.electives?.elective_code || 'No code'} ·{' '}
                      {item.academic_terms?.name || 'Academic term'}
                    </span>
                  </div>

                  <span className={`faculty-status ${item.status}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="faculty-panel">
          <div className="faculty-panel-heading">
            <div>
              <h3>Recent Student Selections</h3>
              <p>Students assigned through your electives</p>
            </div>

            <button
              className="faculty-text-action"
              onClick={() => openPage('students')}
            >
              View all <ChevronRight size={16} />
            </button>
          </div>

          {dashboard?.recent_students?.length === 0 ? (
            <div className="faculty-empty-state">
              <Users size={30} />
              <p>No student selections found yet.</p>
            </div>
          ) : (
            <div className="faculty-recent-list">
              {(dashboard?.recent_students || []).map((item) => (
                <div
                  className="faculty-list-item"
                  key={item.selection_id}
                >
                  <div className="faculty-avatar">
                    {getStudentName(item).charAt(0).toUpperCase()}
                  </div>

                  <div className="faculty-list-details">
                    <strong>{getStudentName(item)}</strong>
                    <span>
                      {item.academic_record?.roll_number || 'Roll number unavailable'}
                    </span>
                  </div>

                  <span className="faculty-date">
                    {formatDate(item.selected_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="faculty-panel faculty-profile-summary">
        <div className="faculty-panel-heading">
          <div>
            <h3>Faculty Information</h3>
            <p>Your university faculty details</p>
          </div>

          <button
            className="faculty-text-action"
            onClick={() => openPage('profile')}
          >
            View profile <ChevronRight size={16} />
          </button>
        </div>

        <div className="faculty-summary-grid">
          <div>
            <span>Employee ID</span>
            <strong>{faculty?.employee_id || 'Not available'}</strong>
          </div>

          <div>
            <span>Department</span>
            <strong>{departmentName}</strong>
          </div>

          <div>
            <span>Designation</span>
            <strong>{faculty?.designation || 'Not available'}</strong>
          </div>

          <div>
            <span>Joining Date</span>
            <strong>{formatDate(faculty?.joining_date)}</strong>
          </div>
        </div>
      </section>
    </>
  )

  const renderProfile = () => (
    <section className="faculty-panel">
      <div className="faculty-page-heading">
        <h2>My Profile</h2>
        <p>View your professional and university information.</p>
      </div>

      <div className="faculty-profile-header">
        <div className="faculty-large-avatar">
          {fullName.charAt(0).toUpperCase()}
        </div>

        <div>
          <h3>{fullName}</h3>
          <p>{faculty?.designation || 'Faculty Member'}</p>
          <span>{faculty?.employee_id || 'Employee ID unavailable'}</span>
        </div>
      </div>

      <div className="faculty-detail-grid">
        <div className="faculty-detail-item">
          <Mail size={19} />
          <div>
            <span>Email Address</span>
            <strong>{faculty?.profile?.email || profile?.email || 'Not available'}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <Phone size={19} />
          <div>
            <span>Contact Number</span>
            <strong>{faculty?.profile?.phone || 'Not available'}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <Building2 size={19} />
          <div>
            <span>Department</span>
            <strong>{departmentName}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <BriefcaseBusiness size={19} />
          <div>
            <span>Designation</span>
            <strong>{faculty?.designation || 'Not available'}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <CalendarDays size={19} />
          <div>
            <span>Joining Date</span>
            <strong>{formatDate(faculty?.joining_date)}</strong>
          </div>
        </div>
      </div>
    </section>
  )

  const renderElectives = () => (
    <section className="faculty-panel">
      <div className="faculty-page-heading">
        <h2>My Electives</h2>
        <p>All electives assigned to your faculty account.</p>
      </div>

      {electives.length === 0 ? (
        <div className="faculty-empty-state large">
          <BookOpen size={38} />
          <h3>No assigned electives</h3>
          <p>Your school administrator has not assigned any electives to you yet.</p>
        </div>
      ) : (
        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Elective</th>
                <th>Code</th>
                <th>Academic Term</th>
                <th>Credits</th>
                <th>Assignment</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {electives.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{getElectiveName(item)}</strong>
                    <span className="faculty-table-subtext">
                      {item.offering_code || 'Standard offering'}
                    </span>
                  </td>
                  <td>{item.electives?.elective_code || '—'}</td>
                  <td>{item.academic_terms?.name || '—'}</td>
                  <td>{item.electives?.credits ?? '—'}</td>
                  <td>
                    <span className="faculty-role-tag">
                      {item.assignment?.assignment_role || 'Assigned'}
                    </span>
                  </td>
                  <td>
                    <span className={`faculty-status ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const renderStudents = () => (
    <section className="faculty-panel">
      <div className="faculty-page-heading">
        <h2>Student Enrollments</h2>
        <p>
          Students who have permanently selected electives assigned to you.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="faculty-empty-state large">
          <Users size={38} />
          <h3>No student selections yet</h3>
          <p>
            Student records will appear here when students select your assigned electives.
          </p>
        </div>
      ) : (
        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Enrollment / Roll No.</th>
                <th>Year</th>
                <th>Elective</th>
                <th>Selection Date</th>
              </tr>
            </thead>

            <tbody>
              {students.map((item) => (
                <tr key={item.selection_id}>
                  <td>
                    <strong>{getStudentName(item)}</strong>
                    <span className="faculty-table-subtext">
                      {item.profile?.email || 'Email unavailable'}
                    </span>
                  </td>
                  <td>
                    {item.academic_record?.roll_number ||
                      item.academic_record?.student_id ||
                      '—'}
                  </td>
                  <td>
                    {getYearLabel(item.academic_record?.academic_year_level)}
                  </td>
                  <td>{getElectiveName(item.offering || {})}</td>
                  <td>{formatDate(item.selected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const renderAccount = () => (
    <section className="faculty-panel">
      <div className="faculty-page-heading">
        <h2>Account Settings</h2>
        <p>Review your account information and sign out securely.</p>
      </div>

      <div className="faculty-account-card">
        <div className="faculty-detail-item">
          <UserRound size={20} />
          <div>
            <span>Account Name</span>
            <strong>{fullName}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <Mail size={20} />
          <div>
            <span>Registered Email</span>
            <strong>{faculty?.profile?.email || profile?.email || 'Not available'}</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <BriefcaseBusiness size={20} />
          <div>
            <span>Account Role</span>
            <strong>Faculty</strong>
          </div>
        </div>

        <div className="faculty-detail-item">
          <Building2 size={20} />
          <div>
            <span>Department</span>
            <strong>{departmentName}</strong>
          </div>
        </div>
      </div>

      <button
        className="faculty-logout-button"
        onClick={onLogout}
      >
        <LogOut size={18} />
        Sign out of SmartSelect
      </button>
    </section>
  )

  const renderActivePage = () => {
    switch (activePage) {
      case 'profile':
        return renderProfile()
      case 'electives':
        return renderElectives()
      case 'students':
        return renderStudents()
      case 'account':
        return renderAccount()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="faculty-dashboard">
      {sidebarOpen && (
        <button
          className="faculty-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`faculty-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="faculty-brand">
          <div className="faculty-brand-icon">
            <GraduationCap size={25} />
          </div>
          <div>
            <strong>SmartSelect</strong>
            <span>MIT ADT UNIVERSITY</span>
          </div>

          <button
            className="faculty-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="faculty-sidebar-label">FACULTY WORKSPACE</div>

        <nav className="faculty-navigation">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                className={`faculty-nav-item ${
                  activePage === item.id ? 'active' : ''
                }`}
                onClick={() => openPage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {activePage === item.id && (
                  <ChevronRight size={16} className="faculty-nav-arrow" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="faculty-sidebar-bottom">
          <div className="faculty-sidebar-user">
            <div className="faculty-avatar">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{fullName}</strong>
              <span>Faculty Account</span>
            </div>
          </div>

          <button
            className="faculty-sidebar-logout"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="faculty-main">
        <header className="faculty-topbar">
          <div className="faculty-topbar-left">
            <button
              className="faculty-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <span>MIT ADT UNIVERSITY</span>
              <h1>
                {navigation.find(item => item.id === activePage)?.label}
              </h1>
            </div>
          </div>

          <div className="faculty-topbar-right">
            <div className="faculty-topbar-user">
              <div className="faculty-avatar">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{fullName}</strong>
                <span>{departmentName}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="faculty-page-content">
          {loading ? (
            <div className="faculty-loading">
              <RefreshCw size={27} className="faculty-spinner" />
              <p>Loading your faculty workspace...</p>
            </div>
          ) : error ? (
            <div className="faculty-error">
              <AlertCircle size={25} />
              <div>
                <strong>Unable to load dashboard</strong>
                <p>{error}</p>
                <button onClick={loadDashboard}>
                  Try again
                </button>
              </div>
            </div>
          ) : (
            renderActivePage()
          )}
        </div>

        <footer className="faculty-footer">
          <span>SmartSelect · MIT ADT University</span>
          <span>Faculty Workspace</span>
        </footer>
      </main>
    </div>
  )
}

export default FacultyDashboard
