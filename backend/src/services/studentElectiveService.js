
import { supabase } from '../config/supabase.js'

async function getStudentContext(profileId) {
  const { data: student, error: studentError } = await supabase
    .from('student_details')
    .select('id, profile_id, enrollment_number, school_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (studentError) throw new Error(studentError.message)

  if (!student) {
    const error = new Error('Student account information was not found.')
    error.statusCode = 404
    throw error
  }

  const { data: records, error: recordError } = await supabase
    .from('student_academic_records')
    .select(`
      id,
      student_id,
      academic_term_id,
      school_id,
      department_id,
      specialization_id,
      academic_year_level,
      record_status,
      created_at
    `)
    .eq('student_id', student.id)
    .eq('record_status', 'active')
    .order('created_at', { ascending: false })

  if (recordError) throw new Error(recordError.message)

  if (!records || records.length === 0) {
    const error = new Error('No active academic record was found.')
    error.statusCode = 409
    throw error
  }

  if (records.length > 1) {
    const error = new Error(
      'Multiple active academic records were found. Please contact the university administrator.'
    )
    error.statusCode = 409
    throw error
  }

  const academicRecord = records[0]

  const { data: term, error: termError } = await supabase
    .from('academic_terms')
    .select('id, name, semester_number, academic_year_id, is_active')
    .eq('id', academicRecord.academic_term_id)
    .maybeSingle()

  if (termError) throw new Error(termError.message)

  if (!term) {
    const error = new Error('The academic semester could not be found.')
    error.statusCode = 409
    throw error
  }

  const { data: academicYear, error: yearError } = await supabase
    .from('academic_years')
    .select('id, name, is_current, is_active')
    .eq('id', term.academic_year_id)
    .maybeSingle()

  if (yearError) throw new Error(yearError.message)

  return {
    student,
    academicRecord,
    term,
    academicYear,
  }
}

async function getEligibleOfferingIds(context) {
  const { student, academicRecord } = context

  const { data: eligibilityRows, error } = await supabase
    .from('offering_eligibility')
    .select(`
      offering_id,
      school_id,
      department_id,
      specialization_id,
      academic_year_level
    `)
    .eq('school_id', student.school_id || academicRecord.school_id)

  if (error) throw new Error(error.message)

  return (eligibilityRows || [])
    .filter((item) => {
      const departmentMatches =
        !item.department_id ||
        item.department_id === academicRecord.department_id

      const specializationMatches =
        item.specialization_id === null
          ? true
          : item.specialization_id === academicRecord.specialization_id

      const yearLevelMatches =
        !item.academic_year_level ||
        item.academic_year_level === academicRecord.academic_year_level

      return (
        departmentMatches &&
        specializationMatches &&
        yearLevelMatches
      )
    })
    .map((item) => item.offering_id)
}

async function getOfferingDetails(offeringId) {
  const { data, error } = await supabase
    .from('elective_offerings')
    .select(`
      id,
      elective_id,
      academic_term_id,
      offering_code,
      total_seats,
      reserved_seats,
      status,
      electives!inner (
        id,
        elective_code,
        name,
        description,
        credits,
        is_active
      ),
      academic_terms!inner (
        id,
        name,
        semester_number,
        academic_year_id,
        is_active
      )
    `)
    .eq('id', offeringId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data
}

async function getAvailableSeats(offering) {
  const { count, error } = await supabase
    .from('student_elective_selections')
    .select('id', { count: 'exact', head: true })
    .eq('selected_offering_id', offering.id)

  if (error) throw new Error(error.message)

  return Math.max(
    0,
    offering.total_seats -
      offering.reserved_seats -
      (count || 0)
  )
}

export async function getAvailableStudentElectives(profileId) {
  const context = await getStudentContext(profileId)

  if (
    !context.academicYear?.is_current ||
    !context.academicYear?.is_active ||
    !context.term.is_active
  ) {
    return {
      electives: [],
      selection: null,
      message: 'The current academic period is not active.',
    }
  }

  const { data: existingSelection, error: selectionError } =
    await supabase
      .from('student_elective_selections')
      .select('id, elective_id, selected_offering_id, selected_at')
      .eq('student_id', context.student.id)
      .maybeSingle()

  if (selectionError) throw new Error(selectionError.message)

  if (existingSelection) {
    return {
      electives: [],
      selection: existingSelection,
      message: 'You have already made your permanent elective selection.',
    }
  }

  const offeringIds = await getEligibleOfferingIds(context)

  if (offeringIds.length === 0) {
    return {
      electives: [],
      selection: null,
      message: 'No eligible electives are currently configured for your academic record.',
    }
  }

  const { data: offerings, error } = await supabase
    .from('elective_offerings')
    .select(`
      id,
      elective_id,
      academic_term_id,
      offering_code,
      total_seats,
      reserved_seats,
      status,
      electives!inner (
        id,
        elective_code,
        name,
        description,
        credits,
        is_active
      ),
      academic_terms!inner (
        id,
        name,
        semester_number,
        academic_year_id,
        is_active
      )
    `)
    .in('id', offeringIds)
    .eq('academic_term_id', context.academicRecord.academic_term_id)
    .eq('status', 'open')

  if (error) throw new Error(error.message)

  const electives = []

  for (const offering of offerings || []) {
    if (!offering.electives?.is_active) continue

    const availableSeats = await getAvailableSeats(offering)

    electives.push({
      ...offering,
      available_seats: availableSeats,
    })
  }

  return {
    electives,
    selection: null,
    message: electives.length
      ? 'Eligible electives retrieved successfully.'
      : 'No open eligible electives are currently available.',
  }
}

export async function getStudentElectiveDetails(profileId, offeringId) {
  const context = await getStudentContext(profileId)
  const eligibleIds = await getEligibleOfferingIds(context)

  if (!eligibleIds.includes(offeringId)) {
    const error = new Error('This elective is not available for your academic eligibility.')
    error.statusCode = 403
    throw error
  }

  const offering = await getOfferingDetails(offeringId)

  if (
    !offering ||
    offering.academic_term_id !== context.academicRecord.academic_term_id
  ) {
    const error = new Error('The requested elective offering was not found.')
    error.statusCode = 404
    throw error
  }

  const availableSeats = await getAvailableSeats(offering)

  const { data: assignments, error: assignmentError } = await supabase
    .from('faculty_assignments')
    .select(`
      id,
      assignment_role,
      faculty_details!inner (
        id,
        employee_id,
        designation,
        profiles!inner (
          full_name,
          email
        )
      )
    `)
    .eq('offering_id', offeringId)

  if (assignmentError) throw new Error(assignmentError.message)

  return {
    ...offering,
    available_seats: availableSeats,
    faculty: assignments || [],
  }
}

export async function getStudentPermanentElective(profileId) {
  const { student } = await getStudentContext(profileId)

  const { data: selection, error } = await supabase
    .from('student_elective_selections')
    .select(`
      id,
      student_id,
      elective_id,
      selected_offering_id,
      selected_academic_record_id,
      selected_at
    `)
    .eq('student_id', student.id)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!selection) return null

  const offering = await getOfferingDetails(selection.selected_offering_id)

  return {
    ...selection,
    offering,
  }
}

export async function selectPermanentStudentElective(
  profileId,
  offeringId
) {
  const context = await getStudentContext(profileId)

  if (
    !context.academicYear?.is_current ||
    !context.academicYear?.is_active ||
    !context.term.is_active
  ) {
    const error = new Error('Elective selection is not available for the current academic period.')
    error.statusCode = 409
    throw error
  }

  const eligibleIds = await getEligibleOfferingIds(context)

  if (!eligibleIds.includes(offeringId)) {
    const error = new Error('You are not eligible for this elective.')
    error.statusCode = 403
    throw error
  }

  const offering = await getOfferingDetails(offeringId)

  if (
    !offering ||
    offering.status !== 'open' ||
    offering.academic_term_id !== context.academicRecord.academic_term_id ||
    !offering.electives?.is_active
  ) {
    const error = new Error('This elective is not currently open for selection.')
    error.statusCode = 409
    throw error
  }

  const { data, error } = await supabase.rpc(
    'select_student_permanent_elective',
    {
      p_profile_id: profileId,
      p_offering_id: offeringId,
    }
  )

  if (error) {
    const selectionError = new Error(error.message)
    selectionError.statusCode = 409
    throw selectionError
  }

  return data
}
