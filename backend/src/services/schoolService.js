
import { supabase } from '../config/supabase.js'

// Retrieve dashboard information for one selected school.
export async function getSchoolDashboard(schoolId) {
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, code, is_active, created_at, updated_at')
    .eq('id', schoolId)
    .maybeSingle()

  if (schoolError) throw new Error(schoolError.message)
  if (!school) return null

  const { data: departments, error: departmentError } = await supabase
    .from('departments')
    .select('id, name, code, is_active')
    .eq('school_id', schoolId)

  if (departmentError) throw new Error(departmentError.message)

  const departmentIds = (departments || []).map(item => item.id)

  const { count: studentCount, error: studentError } = await supabase
    .from('student_academic_records')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('record_status', 'active')

  if (studentError) throw new Error(studentError.message)

  let facultyCount = 0

  if (departmentIds.length > 0) {
    const { count, error } = await supabase
      .from('faculty_details')
      .select('id', { count: 'exact', head: true })
      .in('department_id', departmentIds)

    if (error) throw new Error(error.message)
    facultyCount = count || 0
  }

  let specializationCount = 0

  if (departmentIds.length > 0) {
    const { count, error } = await supabase
      .from('specializations')
      .select('id', { count: 'exact', head: true })
      .in('department_id', departmentIds)
      .eq('is_active', true)

    if (error) throw new Error(error.message)
    specializationCount = count || 0
  }

  const { data: eligibilityRecords, error: eligibilityError } =
    await supabase
      .from('offering_eligibility')
      .select('offering_id')
      .eq('school_id', schoolId)

  if (eligibilityError) throw new Error(eligibilityError.message)

  const offeringIds = [
    ...new Set((eligibilityRecords || []).map(item => item.offering_id)),
  ]

  let electiveCount = 0

  if (offeringIds.length > 0) {
    const { count, error } = await supabase
      .from('elective_offerings')
      .select('id', { count: 'exact', head: true })
      .in('id', offeringIds)
      .eq('status', 'active')

    if (error) throw new Error(error.message)
    electiveCount = count || 0
  }

  return {
    school,
    stats: {
      total_students: studentCount || 0,
      total_faculty: facultyCount,
      total_departments: (departments || []).length,
      total_specializations: specializationCount,
      total_electives: electiveCount,
    },
    departments: departments || [],
  }
}

// Retrieve all departments belonging to one school.
export async function getSchoolDepartments(schoolId) {
  const { data, error } = await supabase
    .from('departments')
    .select('id, school_id, name, code, is_active, created_at, updated_at')
    .eq('school_id', schoolId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return data || []
}

// Create a department under one school.
export async function createDepartment(schoolId, { name, code }) {
  const { data, error } = await supabase
    .from('departments')
    .insert({
      school_id: schoolId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
    })
    .select('id, school_id, name, code, is_active, created_at, updated_at')
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Update a department belonging to the selected school.
export async function updateDepartment(schoolId, departmentId, { name, code }) {
  const { data, error } = await supabase
    .from('departments')
    .update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', departmentId)
    .eq('school_id', schoolId)
    .select('id, school_id, name, code, is_active, created_at, updated_at')
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data
}

// Activate or deactivate a department.
export async function setDepartmentStatus(
  schoolId,
  departmentId,
  isActive
) {
  const { data, error } = await supabase
    .from('departments')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', departmentId)
    .eq('school_id', schoolId)
    .select('id, school_id, name, code, is_active, created_at, updated_at')
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data
}
