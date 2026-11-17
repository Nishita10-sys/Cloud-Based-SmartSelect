import { supabase } from '../config/supabase.js'

function fail(message) {
  const error = new Error(message)
  error.statusCode = 500
  throw error
}

async function getFacultyContext(profileId) {
  const { data: faculty, error: facultyError } = await supabase
    .from('faculty_details')
    .select(`
      id,
      profile_id,
      employee_id,
      department_id,
      designation,
      joining_date,
      profiles!inner(
        id,
        full_name,
        email,
        phone,
        account_status
      )
    `)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (facultyError) fail(facultyError.message)

  if (!faculty) {
    const error = new Error('Faculty record was not found.')
    error.statusCode = 404
    throw error
  }

  const { data: department, error: departmentError } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('id', faculty.department_id)
    .maybeSingle()

  if (departmentError) fail(departmentError.message)

  const { data: assignments, error: assignmentError } = await supabase
    .from('faculty_assignments')
    .select('id, offering_id, assignment_role, assigned_at')
    .eq('faculty_id', faculty.id)
    .order('assigned_at', { ascending: false })

  if (assignmentError) fail(assignmentError.message)

  const offeringIds = [
    ...new Set((assignments || []).map(item => item.offering_id)),
  ]

  let offerings = []

  if (offeringIds.length > 0) {
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
        electives!inner(
          id,
          elective_code,
          name,
          description,
          credits,
          is_active
        ),
        academic_terms!inner(
          id,
          name,
          semester_number,
          academic_year_id,
          start_date,
          end_date,
          is_active,
          academic_years!inner(
            id,
            name,
            code,
            is_current
          )
        )
      `)
      .in('id', offeringIds)

    if (error) fail(error.message)

    offerings = (data || []).map(offering => ({
      ...offering,
      assignment: assignments.find(
        item => item.offering_id === offering.id
      ) || null,
    }))
  }

  return {
    faculty: {
      id: faculty.id,
      profile_id: faculty.profile_id,
      employee_id: faculty.employee_id,
      designation: faculty.designation,
      joining_date: faculty.joining_date,
      department,
      profile: faculty.profiles,
    },
    offerings,
  }
}

async function getStudentsForOfferings(offerings) {
  const offeringIds = offerings.map(item => item.id)

  if (offeringIds.length === 0) return []

  const { data: selections, error: selectionError } = await supabase
    .from('student_elective_selections')
    .select(`
      id,
      student_id,
      elective_id,
      selected_offering_id,
      selected_academic_record_id,
      selected_at
    `)
    .in('selected_offering_id', offeringIds)
    .order('selected_at', { ascending: false })

  if (selectionError) fail(selectionError.message)

  if (!selections?.length) return []

  const studentIds = [
    ...new Set(selections.map(item => item.student_id)),
  ]

  const academicRecordIds = [
    ...new Set(selections.map(item => item.selected_academic_record_id)),
  ]

  const [
    studentResult,
    academicRecordResult,
  ] = await Promise.all([
    supabase
      .from('student_details')
      .select('id, profile_id, school_id')
      .in('id', studentIds),
    supabase
      .from('student_academic_records')
      .select(`
        id,
        student_id,
        school_id,
        department_id,
        specialization_id,
        academic_year_level,
        academic_term_id,
        division,
        roll_number,
        record_status
      `)
      .in('id', academicRecordIds),
  ])

  if (studentResult.error) fail(studentResult.error.message)
  if (academicRecordResult.error) fail(academicRecordResult.error.message)

  const students = studentResult.data || []
  const academicRecords = academicRecordResult.data || []

  const profileIds = [
    ...new Set(students.map(item => item.profile_id)),
  ]

  let profiles = []

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, account_status')
      .in('id', profileIds)

    if (error) fail(error.message)

    profiles = data || []
  }

  return selections.map(selection => {
    const student = students.find(
      item => item.id === selection.student_id
    )

    const academicRecord = academicRecords.find(
      item => item.id === selection.selected_academic_record_id
    )

    const profile = profiles.find(
      item => item.id === student?.profile_id
    )

    const offering = offerings.find(
      item => item.id === selection.selected_offering_id
    )

    return {
      selection_id: selection.id,
      selected_at: selection.selected_at,
      student_id: selection.student_id,
      student,
      profile: profile || null,
      academic_record: academicRecord || null,
      offering: offering || null,
    }
  }).filter(item => item.student && item.profile)
}

export async function getFacultyDashboardData(profileId) {
  const context = await getFacultyContext(profileId)
  const students = await getStudentsForOfferings(context.offerings)

  return {
    faculty: context.faculty,
    stats: {
      assigned_electives: context.offerings.length,
      total_students: students.length,
      primary_assignments: context.offerings.filter(
        item => item.assignment?.assignment_role === 'primary'
      ).length,
      assistant_assignments: context.offerings.filter(
        item => item.assignment?.assignment_role === 'assistant'
      ).length,
    },
    recent_students: students.slice(0, 5),
  }
}

export async function getFacultyElectives(profileId) {
  const context = await getFacultyContext(profileId)

  return context.offerings
}

export async function getFacultyStudents(profileId) {
  const context = await getFacultyContext(profileId)

  return getStudentsForOfferings(context.offerings)
}
