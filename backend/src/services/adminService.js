
import { supabase } from '../config/supabase.js'

const PAGE_SIZE = 1000

// Fetch all matching rows in pages.
async function fetchAllRows(buildQuery) {
  const allRows = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery()
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    allRows.push(...(data || []))

    if (!data || data.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return allRows
}

// Retrieve all schools and their statistics.
export async function getSchoolsWithStats() {
  const { data: schools, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, code, is_active, created_at, updated_at')
    .order('name', { ascending: true })

  if (schoolError) {
    throw new Error(schoolError.message)
  }

  const [
    studentRecords,
    studentDetails,
    activeStudentProfiles,
    facultyRecords,
    eligibilityRecords,
  ] = await Promise.all([
    // Students assigned to schools.
    fetchAllRows(() =>
      supabase
        .from('student_academic_records')
        .select('student_id, school_id')
        .eq('record_status', 'active')
    ),

    // Registered student accounts.
    fetchAllRows(() =>
      supabase
        .from('student_details')
        .select('profile_id')
    ),

    // Active student profiles.
    fetchAllRows(() =>
      supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('account_status', 'active')
    ),

    // Faculty records.
    fetchAllRows(() =>
      supabase
        .from('faculty_details')
        .select('id, profile_id, departments!inner(school_id)')
    ),

    // Eligible elective offerings.
    fetchAllRows(() =>
      supabase
        .from('offering_eligibility')
        .select('school_id, offering_id')
    ),
  ])

  const studentSets = new Map()
  const facultySets = new Map()
  const offeringSets = new Map()

  // Count students assigned to each school.
  for (const record of studentRecords) {
    if (!studentSets.has(record.school_id)) {
      studentSets.set(record.school_id, new Set())
    }

    studentSets.get(record.school_id).add(record.student_id)
  }

  // Count active registered students university-wide.
  const activeProfileIds = new Set(
    activeStudentProfiles.map(profile => profile.id)
  )

  const registeredStudentIds = new Set(
    studentDetails
      .filter(student => activeProfileIds.has(student.profile_id))
      .map(student => student.profile_id)
  )

  // Count faculty by school.
  for (const record of facultyRecords) {
    const schoolId = record.departments?.school_id

    if (!schoolId) continue

    if (!facultySets.has(schoolId)) {
      facultySets.set(schoolId, new Set())
    }

    facultySets.get(schoolId).add(record.profile_id)
  }

  // Count distinct eligible offerings by school.
  for (const record of eligibilityRecords) {
    if (!offeringSets.has(record.school_id)) {
      offeringSets.set(record.school_id, new Set())
    }

    offeringSets.get(record.school_id).add(record.offering_id)
  }

  const schoolsWithStats = (schools || []).map(school => ({
    ...school,
    student_count: studentSets.get(school.id)?.size || 0,
    faculty_count: facultySets.get(school.id)?.size || 0,
    elective_count: offeringSets.get(school.id)?.size || 0,
  }))

  return {
    schools: schoolsWithStats,

    stats: {
      total_schools: schools.length,
      total_students: registeredStudentIds.size,
      total_faculty: new Set(
        facultyRecords.map(record => record.profile_id)
      ).size,
      total_electives: new Set(
        eligibilityRecords.map(record => record.offering_id)
      ).size,
    },
  }
}

// Create a school.
export async function createSchool({ name, code }) {
  const { data, error } = await supabase
    .from('schools')
    .insert({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    })
    .select('id, name, code, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Update school name and code.
export async function updateSchool(schoolId, { name, code }) {
  const { data, error } = await supabase
    .from('schools')
    .update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', schoolId)
    .select('id, name, code, is_active, created_at, updated_at')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Activate or deactivate a school.
export async function setSchoolStatus(schoolId, isActive) {
  const { data, error } = await supabase
    .from('schools')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schoolId)
    .select('id, name, code, is_active, created_at, updated_at')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
