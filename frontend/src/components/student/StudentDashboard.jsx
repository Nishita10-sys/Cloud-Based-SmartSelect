
import { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  UserRound,
  GraduationCap,
  BookOpen,
  Bell,
  LogOut,
  Menu,
  X,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Building2,
  ChevronRight,
  Mail,
  Phone,
  Hash,
  ShieldCheck,
} from 'lucide-react'

import api from '../../services/api'
import './StudentDashboard.css'
import StudentElectives from './StudentElectives'

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'academics', label: 'Academic Details', icon: GraduationCap },
  { id: 'electives', label: 'Electives', icon: BookOpen },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const yearLabels = {
  FY: 'First Year',
  SY: 'Second Year',
  TY: 'Third Year',
  LY: 'Final Year',
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getValue(value) {
  return value || 'Not available'
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="student-detail-item">
      <div className="student-detail-icon">
        <Icon size={18} />
      </div>

      <div className="student-detail-text">
        <span>{label}</span>
        <strong>{getValue(value)}</strong>
      </div>
    </div>
  )
}

function StudentDashboard({ profile, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [student, setStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await api.get('/student/dashboard')

      if (!response.data?.success || !response.data?.data?.student) {
        throw new Error(
          response.data?.message || 'Unable to load student information.'
        )
      }

      setStudent(response.data.data.student)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load your dashboard.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const academicHistory = student?.academic_history || []

  const currentAcademicRecord =
    academicHistory.find(record => record.record_status === 'active') ||
    academicHistory[0] ||
    null

  const studentProfile = student?.profile || {}

  const studentName =
    studentProfile.full_name ||
    profile?.name ||
    'Student'

  const schoolName = currentAcademicRecord?.school?.name
  const departmentName = currentAcademicRecord?.department?.name
  const specializationName =
    currentAcademicRecord?.specialization?.name

  const academicYearLevel = currentAcademicRecord?.academic_year_level
  const academicYear = currentAcademicRecord?.academic_term?.academic_year
  const academicTerm = currentAcademicRecord?.academic_term

  const academicYearName =
    academicYear?.name ||
    academicYear?.year_name ||
    'Not assigned'

  const semesterName =
    academicTerm?.name ||
    (academicTerm?.semester_number
      ? `Semester ${academicTerm.semester_number}`
      : 'Not assigned')

  const closeSidebar = () => setSidebarOpen(false)

  const handleNavigation = section => {
    setActiveSection(section)
    closeSidebar()
  }

  const renderOverview = () => (
    <>
      <div className="student-welcome">
        <div>
          <span className="student-eyebrow">STUDENT PORTAL</span>
          <h1>Welcome back, {studentName.split(' ')[0]}!</h1>
          <p>
            Here's an overview of your student account and academic information.
          </p>
        </div>

        <div className="student-welcome-icon">
          <GraduationCap size={38} />
        </div>
      </div>

      <div className="student-stat-grid">
        <div className="student-stat-card">
          <div className="student-stat-heading">
            <span>Enrollment Number</span>
            <Hash size={20} />
          </div>
          <strong className="student-stat-value">
            {getValue(student?.enrollment_number)}
          </strong>
          <span className="student-stat-caption">University identification</span>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-heading">
            <span>Academic Year</span>
            <CalendarDays size={20} />
          </div>
          <strong className="student-stat-value">
            {academicYearName}
          </strong>
          <span className="student-stat-caption">Current academic placement</span>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-heading">
            <span>Year of Study</span>
            <GraduationCap size={20} />
          </div>
          <strong className="student-stat-value">
            {yearLabels[academicYearLevel] || getValue(academicYearLevel)}
          </strong>
          <span className="student-stat-caption">Academic level</span>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-heading">
            <span>Account Status</span>
            <ShieldCheck size={20} />
          </div>
          <strong className="student-stat-value student-status-active">
            {getValue(studentProfile.account_status)}
          </strong>
          <span className="student-stat-caption">Student account</span>
        </div>
      </div>

      <div className="student-overview-grid">
        <section className="student-panel">
          <div className="student-panel-heading">
            <div>
              <h2>Academic Information</h2>
              <p>Your latest academic placement</p>
            </div>
            <GraduationCap size={22} />
          </div>

          <div className="student-information-list">
            <DetailItem
              icon={Building2}
              label="School"
              value={schoolName}
            />
            <DetailItem
              icon={BookOpen}
              label="Department"
              value={departmentName}
            />
            <DetailItem
              icon={GraduationCap}
              label="Specialization"
              value={specializationName}
            />
            <DetailItem
              icon={CalendarDays}
              label="Semester"
              value={semesterName}
            />
          </div>

          <button
            className="student-text-link"
            onClick={() => handleNavigation('academics')}
          >
            View academic details
            <ChevronRight size={17} />
          </button>
        </section>

        <section className="student-panel">
          <div className="student-panel-heading">
            <div>
              <h2>Personal Information</h2>
              <p>Your registered contact details</p>
            </div>
            <UserRound size={22} />
          </div>

          <div className="student-information-list">
            <DetailItem
              icon={UserRound}
              label="Full Name"
              value={studentProfile.full_name}
            />
            <DetailItem
              icon={Mail}
              label="Email Address"
              value={studentProfile.email}
            />
            <DetailItem
              icon={Phone}
              label="Phone Number"
              value={studentProfile.phone}
            />
          </div>

          <button
            className="student-text-link"
            onClick={() => handleNavigation('profile')}
          >
            View my profile
            <ChevronRight size={17} />
          </button>
        </section>
      </div>

      <section className="student-panel student-quick-access">
        <div className="student-panel-heading">
          <div>
            <h2>Quick Access</h2>
            <p>Explore your student portal</p>
          </div>
        </div>

        <div className="student-quick-grid">
          <button onClick={() => handleNavigation('profile')}>
            <UserRound size={23} />
            <span>My Profile</span>
            <ChevronRight size={17} />
          </button>

          <button onClick={() => handleNavigation('academics')}>
            <GraduationCap size={23} />
            <span>Academic Details</span>
            <ChevronRight size={17} />
          </button>

          <button onClick={() => handleNavigation('electives')}>
            <BookOpen size={23} />
            <span>Explore Electives</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </>
  )

  const renderProfile = () => (
    <>
      <div className="student-page-heading">
        <span className="student-eyebrow">ACCOUNT</span>
        <h1>My Profile</h1>
        <p>View your registered personal and contact information.</p>
      </div>

      <section className="student-panel">
        <div className="student-profile-header">
          <div className="student-avatar">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{studentName}</h2>
            <p>{getValue(student?.enrollment_number)}</p>
            <span className="student-profile-role">Student</span>
          </div>
        </div>

        <div className="student-profile-details">
          <DetailItem
            icon={UserRound}
            label="Full Name"
            value={studentProfile.full_name}
          />
          <DetailItem
            icon={Mail}
            label="Email Address"
            value={studentProfile.email}
          />
          <DetailItem
            icon={Phone}
            label="Phone Number"
            value={studentProfile.phone}
          />
          <DetailItem
            icon={Hash}
            label="Enrollment Number"
            value={student?.enrollment_number}
          />
          <DetailItem
            icon={CalendarDays}
            label="Admission Date"
            value={formatDate(student?.admission_date)}
          />
          <DetailItem
            icon={ShieldCheck}
            label="Account Status"
            value={studentProfile.account_status}
          />
        </div>

        <p className="student-readonly-note">
          <ShieldCheck size={17} />
          Your profile information is managed by your university.
          Contact your school administration if any details need correction.
        </p>
      </section>
    </>
  )

  const renderAcademics = () => (
    <>
      <div className="student-page-heading">
        <span className="student-eyebrow">ACADEMICS</span>
        <h1>Academic Details</h1>
        <p>View your current academic placement and academic history.</p>
      </div>

      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h2>Current Academic Placement</h2>
            <p>Your latest assigned academic record</p>
          </div>
          <GraduationCap size={22} />
        </div>

        {currentAcademicRecord ? (
          <div className="student-profile-details">
            <DetailItem
              icon={Building2}
              label="School"
              value={schoolName}
            />
            <DetailItem
              icon={BookOpen}
              label="Department"
              value={departmentName}
            />
            <DetailItem
              icon={GraduationCap}
              label="Specialization"
              value={specializationName}
            />
            <DetailItem
              icon={CalendarDays}
              label="Academic Year"
              value={academicYearName}
            />
            <DetailItem
              icon={BookOpen}
              label="Semester"
              value={semesterName}
            />
            <DetailItem
              icon={GraduationCap}
              label="Year of Study"
              value={yearLabels[academicYearLevel] || academicYearLevel}
            />
            <DetailItem
              icon={Hash}
              label="Roll Number"
              value={currentAcademicRecord.roll_number}
            />
            <DetailItem
              icon={Building2}
              label="Division"
              value={currentAcademicRecord.division}
            />
          </div>
        ) : (
          <div className="student-empty-state">
            <GraduationCap size={34} />
            <h3>Academic placement not assigned</h3>
            <p>
              Your school administration has not assigned your academic
              details yet. Please contact your school.
            </p>
          </div>
        )}
      </section>

      <section className="student-panel student-history-panel">
        <div className="student-panel-heading">
          <div>
            <h2>Academic History</h2>
            <p>Your available academic records</p>
          </div>
        </div>

        {academicHistory.length > 0 ? (
          <div className="student-history-list">
            {academicHistory.map((record, index) => (
              <div
                className="student-history-item"
                key={record.id || `${record.academic_term_id}-${index}`}
              >
                <div className="student-history-marker">
                  <GraduationCap size={19} />
                </div>
                <div>
                  <strong>
                    {record.academic_term?.name ||
                      `Academic Record ${index + 1}`}
                  </strong>
                  <span>
                    {record.school?.name || 'School not available'}
                    {' · '}
                    {record.department?.name || 'Department not available'}
                  </span>
                  <small>
                    {record.academic_year_level
                      ? yearLabels[record.academic_year_level] ||
                        record.academic_year_level
                      : 'Year not assigned'}
                    {' · '}
                    {record.record_status || 'Status unavailable'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="student-empty-state">
            <p>No academic history is available yet.</p>
          </div>
        )}
      </section>
    </>
  )

  const renderComingSoon = section => {
    const isElectives = section === 'electives'

    return (
      <>
        <div className="student-page-heading">
          <span className="student-eyebrow">STUDENT PORTAL</span>
          <h1>{isElectives ? 'Electives' : 'Notifications'}</h1>
          <p>
            {isElectives
              ? 'Explore and manage your elective course selections.'
              : 'Stay updated with important university announcements.'}
          </p>
        </div>

        <section className="student-panel student-feature-placeholder">
          {isElectives ? (
            <BookOpen size={42} />
          ) : (
            <Bell size={42} />
          )}

          <h2>
            {isElectives
              ? 'Elective selection is coming soon'
              : 'No notifications yet'}
          </h2>

          <p>
            {isElectives
              ? 'The elective selection module will be available when your university opens the selection period.'
              : 'University announcements and important updates will appear here.'}
          </p>
        </section>
      </>
    )
  }

  const sectionTitles = {
    overview: 'Overview',
    profile: 'My Profile',
    academics: 'Academic Details',
    electives: 'Electives',
    notifications: 'Notifications',
  }

  const renderContent = () => {
  if (activeSection === 'overview') return renderOverview()
  if (activeSection === 'profile') return renderProfile()
  if (activeSection === 'academics') return renderAcademics()
  if (activeSection === 'electives') return <StudentElectives />

  return renderComingSoon(activeSection)
}

  if (isLoading) {
    return (
      <div className="student-loading-screen">
        <RefreshCw size={32} className="student-loading-icon" />
        <h2>Loading your dashboard</h2>
        <p>Please wait while we retrieve your student information.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="student-loading-screen">
        <AlertCircle size={38} className="student-error-icon" />
        <h2>Unable to load your dashboard</h2>
        <p>{error}</p>
        <button
          className="student-primary-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={17} />
          Try Again
        </button>
        <button className="student-secondary-button" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="student-dashboard">
      {sidebarOpen && (
        <button
          className="student-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      <aside className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="student-brand">
          <div className="student-brand-icon">
            <GraduationCap size={25} />
          </div>
          <div>
            <strong>SmartSelect</strong>
            <span>MIT ADT UNIVERSITY</span>
          </div>
          <button
            className="student-mobile-close"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="student-sidebar-label">STUDENT MENU</div>

        <nav className="student-navigation">
          {navigationItems.map(item => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                className={
                  activeSection === item.id
                    ? 'student-nav-item active'
                    : 'student-nav-item'
                }
                onClick={() => handleNavigation(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {activeSection === item.id && (
                  <span className="student-nav-indicator" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="student-sidebar-bottom">
          <div className="student-sidebar-user">
            <div className="student-sidebar-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{studentName}</strong>
              <span>Student Account</span>
            </div>
          </div>

          <button
            className="student-logout-button"
            onClick={onLogout}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <div className="student-topbar-left">
            <button
              className="student-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <span>MIT ADT UNIVERSITY</span>
              <strong>{sectionTitles[activeSection]}</strong>
            </div>
          </div>

          <div className="student-topbar-right">
            <div className="student-topbar-profile">
              <div className="student-topbar-avatar">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{studentName}</strong>
                <span>Student</span>
              </div>
            </div>
          </div>
        </header>

        <div className="student-content">
          {renderContent()}
        </div>

        <footer className="student-footer">
          <span>© {new Date().getFullYear()} MIT ADT University</span>
          <span>SmartSelect Student Portal</span>
        </footer>
      </main>
    </div>
  )
}

export default StudentDashboard
