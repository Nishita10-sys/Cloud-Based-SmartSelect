
import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  GraduationCap,
  Users,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  X,
  ArrowLeft,
  Info,
  LockKeyhole,
} from 'lucide-react'

import api from '../../services/api'
import './StudentElectives.css'

function StudentElectives() {
  const [electives, setElectives] = useState([])
  const [selection, setSelection] = useState(null)
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [activeOffering, setActiveOffering] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const loadElectives = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const [availableResponse, selectionResponse] = await Promise.all([
        api.get('/student/electives'),
        api.get('/student/electives/selection'),
      ])

      if (!availableResponse.data?.success) {
        throw new Error(
          availableResponse.data?.message ||
          'Unable to load available electives.'
        )
      }

      if (!selectionResponse.data?.success) {
        throw new Error(
          selectionResponse.data?.message ||
          'Unable to load your elective selection.'
        )
      }

      setElectives(
        availableResponse.data?.data?.electives || []
      )

      setSelection(
        selectionResponse.data?.data?.selection || null
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load electives.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadElectives()
  }, [loadElectives])

  const openDetails = async (offeringId) => {
    try {
      setIsLoadingDetails(true)
      setError('')
      setSuccess('')
      setActiveOffering(null)
      setSelectedDetails(null)

      const response = await api.get(
        `/student/electives/${offeringId}`
      )

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
          'Unable to load elective details.'
        )
      }

      setSelectedDetails(response.data.data.offering)
      setActiveOffering(offeringId)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load elective details.'
      )
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const confirmSelection = async () => {
    if (!activeOffering) return

    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')

      const response = await api.post(
        '/student/electives/select',
        { offeringId: activeOffering }
      )

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
          'Unable to complete elective selection.'
        )
      }

      setShowConfirmation(false)
      setActiveOffering(null)
      setSelectedDetails(null)

      setSuccess(
        'Your permanent elective selection has been confirmed successfully.'
      )

      await loadElectives()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to complete elective selection.'
      )
      setShowConfirmation(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const permanentOffering = selection?.offering
  const permanentElective = permanentOffering?.electives
  const permanentTerm = permanentOffering?.academic_terms

  const renderFaculty = faculty => {
    if (!faculty || faculty.length === 0) {
      return (
        <p className="se-empty-faculty">
          Faculty assignment has not been announced yet.
        </p>
      )
    }

    return faculty.map(item => {
      const member = item.faculty_details
      const memberProfile = member?.profiles

      return (
        <div className="se-faculty-item" key={item.id}>
          <div className="se-faculty-avatar">
            <Users size={17} />
          </div>
          <div>
            <strong>
              {memberProfile?.full_name || 'Faculty member'}
            </strong>
            <span>
              {member?.designation || item.assignment_role || 'Faculty'}
            </span>
            {memberProfile?.email && (
              <small>{memberProfile.email}</small>
            )}
          </div>
        </div>
      )
    })
  }

  if (isLoading) {
    return (
      <div className="se-loading">
        <RefreshCw size={30} className="se-spin" />
        <h2>Loading electives</h2>
        <p>Retrieving your eligible elective options.</p>
      </div>
    )
  }

  return (
    <div className="student-electives">
      <div className="student-page-heading">
        <span className="student-eyebrow">ACADEMIC SERVICES</span>
        <h1>Electives</h1>
        <p>
          Explore eligible electives and manage your permanent elective selection.
        </p>
      </div>

      {error && (
        <div className="se-alert se-alert-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="se-alert se-alert-success">
          <CheckCircle2 size={19} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} aria-label="Dismiss message">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="se-rule-banner">
        <div className="se-rule-icon">
          <ShieldCheck size={24} />
        </div>
        <div>
          <strong>One permanent elective selection</strong>
          <p>
            You can select one elective only. Once confirmed, the same elective
            remains assigned throughout all eight semesters and cannot be changed.
          </p>
        </div>
      </section>

      {selection ? (
        <section className="se-selection-card">
          <div className="se-selection-heading">
            <div className="se-selection-icon">
              <CheckCircle2 size={25} />
            </div>
            <div>
              <span className="se-eyebrow">PERMANENT SELECTION</span>
              <h2>My Selected Elective</h2>
              <p>Your elective selection has been confirmed.</p>
            </div>
            <span className="se-confirmed-label">
              <CheckCircle2 size={15} />
              Confirmed
            </span>
          </div>

          <div className="se-permanent-course">
            <div className="se-course-icon">
              <BookOpen size={27} />
            </div>
            <div>
              <span>{permanentElective?.elective_code || 'Elective'}</span>
              <h3>
                {permanentElective?.name || 'Selected elective'}
              </h3>
              <p>
                {permanentOffering?.offering_code
                  ? `Offering ${permanentOffering.offering_code}`
                  : 'Permanent elective'}
              </p>
            </div>
          </div>

          <div className="se-detail-grid">
            <div>
              <span>Credits</span>
              <strong>{permanentElective?.credits ?? 'Not available'}</strong>
            </div>
            <div>
              <span>Initial selection semester</span>
              <strong>
                {permanentTerm?.name || 'Not available'}
              </strong>
            </div>
            <div>
              <span>Selection date</span>
              <strong>
                {selection.selected_at
                  ? new Date(selection.selected_at).toLocaleDateString('en-IN')
                  : 'Not available'}
              </strong>
            </div>
            <div>
              <span>Selection type</span>
              <strong>Permanent — all 8 semesters</strong>
            </div>
          </div>

          <div className="se-locked-note">
            <LockKeyhole size={19} />
            <p>
              This selection is permanent. You cannot change or cancel it.
              Contact your university administration if you need assistance.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="se-section-heading">
            <div>
              <h2>Available Electives</h2>
              <p>
                Electives matching your current academic eligibility.
              </p>
            </div>
            <button
              className="se-refresh-button"
              onClick={loadElectives}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {electives.length === 0 ? (
            <section className="se-empty-state">
              <div className="se-empty-icon">
                <BookOpen size={32} />
              </div>
              <h3>No eligible electives available</h3>
              <p>
                There are currently no open electives matching your academic
                placement. Please check again later or contact your school.
              </p>
            </section>
          ) : (
            <div className="se-elective-grid">
              {electives.map(offering => {
                const elective = offering.electives
                const term = offering.academic_terms

                return (
                  <article className="se-elective-card" key={offering.id}>
                    <div className="se-card-top">
                      <span className="se-course-code">
                        {elective?.elective_code}
                      </span>
                      <span className="se-open-label">Open</span>
                    </div>

                    <div className="se-card-icon">
                      <BookOpen size={25} />
                    </div>

                    <h3>{elective?.name}</h3>
                    <p className="se-course-description">
                      {elective?.description ||
                        'Course description has not been provided yet.'}
                    </p>

                    <div className="se-card-meta">
                      <span>
                        <GraduationCap size={16} />
                        {elective?.credits} Credits
                      </span>
                      <span>
                        <CalendarDays size={16} />
                        {term?.name || 'Current semester'}
                      </span>
                    </div>

                    <div className="se-seat-info">
                      <span>Available seats</span>
                      <strong>
                        {offering.available_seats} / {offering.total_seats}
                      </strong>
                    </div>

                    <button
                      className="se-details-button"
                      onClick={() => openDetails(offering.id)}
                    >
                      View Details
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeOffering && selectedDetails && (
        <div className="se-modal-backdrop">
          <section className="se-modal" role="dialog" aria-modal="true">
            <div className="se-modal-header">
              <div>
                <span className="se-eyebrow">ELECTIVE INFORMATION</span>
                <h2>{selectedDetails.electives?.name}</h2>
                <p>
                  {selectedDetails.electives?.elective_code}
                  {' · '}
                  {selectedDetails.electives?.credits} credits
                </p>
              </div>
              <button
                className="se-modal-close"
                onClick={() => {
                  setActiveOffering(null)
                  setSelectedDetails(null)
                }}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="se-modal-body">
              <div className="se-description-block">
                <h3>Course Description</h3>
                <p>
                  {selectedDetails.electives?.description ||
                    'Course description has not been provided yet.'}
                </p>
              </div>

              <div className="se-detail-grid">
                <div>
                  <span>Semester</span>
                  <strong>
                    {selectedDetails.academic_terms?.name}
                  </strong>
                </div>
                <div>
                  <span>Offering</span>
                  <strong>{selectedDetails.offering_code}</strong>
                </div>
                <div>
                  <span>Available Seats</span>
                  <strong>{selectedDetails.available_seats}</strong>
                </div>
                <div>
                  <span>Total Seats</span>
                  <strong>{selectedDetails.total_seats}</strong>
                </div>
              </div>

              <div className="se-faculty-section">
                <h3>Assigned Faculty</h3>
                {renderFaculty(selectedDetails.faculty)}
              </div>

              <div className="se-info-note">
                <Info size={18} />
                <p>
                  Prerequisite information has not yet been provided in the
                  available elective details.
                </p>
              </div>

              <div className="se-permanent-warning">
                <LockKeyhole size={19} />
                <p>
                  Confirming this elective creates your permanent selection
                  for all eight semesters. It cannot be changed or cancelled.
                </p>
              </div>
            </div>

            <div className="se-modal-actions">
              <button
                className="se-secondary-button"
                onClick={() => {
                  setActiveOffering(null)
                  setSelectedDetails(null)
                }}
              >
                <ArrowLeft size={17} />
                Back to Electives
              </button>

              <button
                className="se-primary-button"
                disabled={
                  selectedDetails.status !== 'open' ||
                  selectedDetails.available_seats <= 0
                }
                onClick={() => setShowConfirmation(true)}
              >
                Select This Elective
              </button>
            </div>
          </section>
        </div>
      )}

      {isLoadingDetails && (
        <div className="se-modal-backdrop">
          <div className="se-loading se-modal-loading">
            <RefreshCw size={28} className="se-spin" />
            <p>Loading elective details...</p>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="se-modal-backdrop se-confirmation-backdrop">
          <section className="se-confirmation-modal" role="alertdialog" aria-modal="true">
            <div className="se-confirmation-icon">
              <LockKeyhole size={29} />
            </div>

            <h2>Confirm Permanent Selection?</h2>
            <p>
              You are about to permanently select
              {' '}
              <strong>{selectedDetails?.electives?.name}</strong>.
            </p>
            <p>
              This elective will remain your selected elective throughout all
              eight semesters. You cannot change or cancel this selection later.
            </p>

            <div className="se-confirmation-actions">
              <button
                className="se-secondary-button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmation(false)}
              >
                Go Back
              </button>

              <button
                className="se-primary-button"
                disabled={isSubmitting}
                onClick={confirmSelection}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Permanent Selection'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default StudentElectives
