
import { supabase } from '../config/supabase.js'

const ALLOWED_STATUSES = ['draft', 'published', 'open', 'closed', 'cancelled']
const ALLOWED_YEAR_LEVELS = ['FY', 'SY', 'TY', 'LY']

function fail(message) {
  throw new Error(message)
}

async function getSchool(schoolId) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, is_active')
    .eq('id', schoolId)
    .maybeSingle()

  if (error) fail(error.message)
  if (!data) fail('School not found.')
  if (!data.is_active) fail('This school is inactive.')

  return data
}

async function getSchoolDepartment(schoolId, departmentId) {
  const { data, error } = await supabase
    .from('departments')
    .select('id, school_id, name, code, is_active')
    .eq('id', departmentId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) fail(error.message)
  if (!data) fail('Department does not belong to this school.')
  if (!data.is_active) fail('Selected department is inactive.')

  return data
}

async function validateEligibility(schoolId, eligibility = []) {
  if (!Array.isArray(eligibility) || eligibility.length === 0) {
    fail('Add at least one eligibility rule.')
  }

  const validated = []

  for (const item of eligibility) {
    const departmentId = item.departmentId || null
    const specializationId = item.specializationId || null
    const yearLevel = item.academicYearLevel || null

    if (yearLevel && !ALLOWED_YEAR_LEVELS.includes(yearLevel)) {
      fail('Invalid academic year level.')
    }

    if (departmentId) {
      await getSchoolDepartment(schoolId, departmentId)
    }

    if (specializationId && !departmentId) {
      fail('A specialization requires a department.')
    }

    if (specializationId) {
      const { data, error } = await supabase
        .from('specializations')
        .select('id, department_id, is_active')
        .eq('id', specializationId)
        .eq('department_id', departmentId)
        .maybeSingle()

      if (error) fail(error.message)
      if (!data) fail('Specialization does not belong to the selected department.')
      if (!data.is_active) fail('Selected specialization is inactive.')
    }

    validated.push({
      school_id: schoolId,
      department_id: departmentId,
      specialization_id: specializationId,
      academic_year_level: yearLevel,
    })
  }

  return validated
}

async function validateOfferingInputs({
  academicTermId,
  totalSeats,
  reservedSeats = 0,
  status = 'draft',
  facultyIds = [],
}) {
  if (!academicTermId) fail('Select a semester.')

  if (!Number.isInteger(Number(totalSeats)) || Number(totalSeats) <= 0) {
    fail('Total seats must be a positive whole number.')
  }

  if (
    !Number.isInteger(Number(reservedSeats)) ||
    Number(reservedSeats) < 0 ||
    Number(reservedSeats) > Number(totalSeats)
  ) {
    fail('Reserved seats must be between zero and total seats.')
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    fail('Invalid offering status.')
  }

  if (!Array.isArray(facultyIds)) {
    fail('Faculty assignments must be a list.')
  }

  const { data: term, error: termError } = await supabase
    .from('academic_terms')
    .select('id, name, semester_number, academic_year_id, is_active')
    .eq('id', academicTermId)
    .maybeSingle()

  if (termError) fail(termError.message)
  if (!term) fail('Selected semester was not found.')
  if (!term.is_active) fail('Selected semester is inactive.')

  return term
}

async function validateFaculty(schoolId, facultyIds) {
  const uniqueIds = [...new Set(facultyIds.filter(Boolean))]

  if (uniqueIds.length === 0) return []

  const { data, error } = await supabase
    .from('faculty_details')
    .select('id, department_id, profiles!inner(account_status)')
    .in('id', uniqueIds)
    .eq('profiles.account_status', 'active')

  if (error) fail(error.message)

  if ((data || []).length !== uniqueIds.length) {
    fail('One or more selected faculty members are unavailable or inactive.')
  }

  const departmentIds = [...new Set(data.map(item => item.department_id))]

  const { data: departments, error: departmentError } = await supabase
    .from('departments')
    .select('id')
    .eq('school_id', schoolId)
    .in('id', departmentIds)

  if (departmentError) fail(departmentError.message)

  if ((departments || []).length !== departmentIds.length) {
    fail('One or more faculty members do not belong to this school.')
  }

  return uniqueIds
}

async function getOfferingIdsForSchool(schoolId) {
  const { data, error } = await supabase
    .from('offering_eligibility')
    .select('offering_id')
    .eq('school_id', schoolId)

  if (error) fail(error.message)

  return [...new Set((data || []).map(item => item.offering_id))]
}

async function getOfferingForSchool(schoolId, offeringId) {
  const { data: eligibility, error: eligibilityError } = await supabase
    .from('offering_eligibility')
    .select('offering_id')
    .eq('school_id', schoolId)
    .eq('offering_id', offeringId)
    .limit(1)

  if (eligibilityError) fail(eligibilityError.message)
  if (!eligibility?.length) fail('Offering not found for this school.')

  const { data, error } = await supabase
    .from('elective_offerings')
    .select(`
      *,
      electives!inner(id, elective_code, name, description, credits, is_active),
      academic_terms!inner(
        id, name, semester_number, academic_year_id, start_date, end_date, is_active,
        academic_years!inner(id, name, code, is_current)
      ),
      offering_eligibility(*),
      faculty_assignments(
        id, faculty_id, assignment_role,
        faculty_details!inner(
          id, employee_id, designation,
          profiles!inner(id, full_name, email, account_status)
        )
      )
    `)
    .eq('id', offeringId)
    .maybeSingle()

  if (error) fail(error.message)
  if (!data) fail('Offering not found.')

  return data
}

async function replaceEligibility(offeringId, schoolId, eligibility) {
  const validated = await validateEligibility(schoolId, eligibility)

  const { error: deleteError } = await supabase
    .from('offering_eligibility')
    .delete()
    .eq('offering_id', offeringId)
    .eq('school_id', schoolId)

  if (deleteError) fail(deleteError.message)

  const rows = validated.map(item => ({
    ...item,
    offering_id: offeringId,
  }))

  const { error: insertError } = await supabase
    .from('offering_eligibility')
    .insert(rows)

  if (insertError) fail(insertError.message)
}

async function replaceFacultyAssignments(offeringId, schoolId, facultyIds, assignedBy) {
  const validIds = await validateFaculty(schoolId, facultyIds)

  const { error: deleteError } = await supabase
    .from('faculty_assignments')
    .delete()
    .eq('offering_id', offeringId)

  if (deleteError) fail(deleteError.message)

  if (validIds.length === 0) return

  const rows = validIds.map((facultyId, index) => ({
    offering_id: offeringId,
    faculty_id: facultyId,
    assignment_role: index === 0 ? 'primary' : 'assistant',
    assigned_by: assignedBy || null,
  }))

  const { error } = await supabase.from('faculty_assignments').insert(rows)

  if (error) fail(error.message)
}

// Return active departments, specializations, semesters and faculty for the form.
export async function getSchoolElectiveOptions(schoolId) {
  await getSchool(schoolId)

  const [
    departmentResult,
    specializationResult,
    facultyResult,
    academicYearResult,
  ] = await Promise.all([
    supabase
      .from('departments')
      .select('id, name, code')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('specializations')
      .select('id, department_id, name, code')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('faculty_details')
      .select(`
        id, employee_id, designation,
        departments!inner(id, school_id, name),
        profiles!inner(id, full_name, email, account_status)
      `)
      .eq('departments.school_id', schoolId)
      .eq('profiles.account_status', 'active')
      .order('employee_id'),
    supabase
      .from('academic_years')
      .select('id, name, code, is_current, is_active')
      .eq('is_active', true)
      .order('start_date', { ascending: false }),
  ])

  for (const result of [
    departmentResult,
    specializationResult,
    facultyResult,
    academicYearResult,
  ]) {
    if (result.error) fail(result.error.message)
  }

  const academicYears = academicYearResult.data || []
  const yearIds = academicYears.map(item => item.id)

  let terms = []

  if (yearIds.length > 0) {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('id, academic_year_id, name, semester_number, start_date, end_date, is_active')
      .in('academic_year_id', yearIds)
      .eq('is_active', true)
      .order('semester_number')

    if (error) fail(error.message)
    terms = data || []
  }

  return {
    departments: departmentResult.data || [],
    specializations: specializationResult.data || [],
    faculty: (facultyResult.data || []).map(item => ({
      id: item.id,
      employee_id: item.employee_id,
      designation: item.designation,
      full_name: item.profiles?.full_name || '',
      email: item.profiles?.email || '',
      department_id: item.departments?.id,
      department_name: item.departments?.name || '',
    })),
    academic_years: academicYears,
    semesters: terms.map(term => ({
      ...term,
      academic_year: academicYears.find(year => year.id === term.academic_year_id) || null,
    })),
  }
}

// Return all master electives and offerings available to this school.
export async function getSchoolElectives(schoolId, filters = {}) {
  await getSchool(schoolId)

  const offeringIds = await getOfferingIdsForSchool(schoolId)

  if (offeringIds.length === 0) return []

  let query = supabase
    .from('elective_offerings')
    .select(`
      *,
      electives!inner(id, elective_code, name, description, credits, is_active),
      academic_terms!inner(
        id, name, semester_number, academic_year_id,
        academic_years!inner(id, name, code)
      ),
      offering_eligibility(*),
      faculty_assignments(
        id, faculty_id, assignment_role,
        faculty_details!inner(
          id, employee_id, designation,
          profiles!inner(id, full_name, account_status)
        )
      )
    `)
    .in('id', offeringIds)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.academicTermId) {
    query = query.eq('academic_term_id', filters.academicTermId)
  }

  const { data, error } = await query

  if (error) fail(error.message)

  return (data || []).map(offering => ({
    ...offering,
    school_eligibility: (offering.offering_eligibility || []).filter(
      item => item.school_id === schoolId
    ),
  }))
}

// Retrieve one offering, scoped to the selected school.
export async function getSchoolElectiveDetails(schoolId, offeringId) {
  return getOfferingForSchool(schoolId, offeringId)
}

// Create a master elective and a school-specific offering.
export async function createSchoolElective({
  schoolId,
  electiveCode,
  name,
  description,
  credits,
  academicTermId,
  offeringCode,
  totalSeats,
  reservedSeats = 0,
  status = 'draft',
  eligibility,
  facultyIds = [],
  createdBy,
}) {
  await getSchool(schoolId)

  const code = String(electiveCode || '').trim().toUpperCase()
  const title = String(name || '').trim()

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    fail('Elective code must contain only uppercase letters, numbers, hyphens or underscores.')
  }

  if (!title) fail('Elective name is required.')

  if (
    credits !== null &&
    credits !== undefined &&
    (!Number.isFinite(Number(credits)) || Number(credits) <= 0)
  ) {
    fail('Credits must be a positive number.')
  }

  const term = await validateOfferingInputs({
    academicTermId,
    totalSeats,
    reservedSeats,
    status,
    facultyIds,
  })

  const validEligibility = await validateEligibility(schoolId, eligibility)
  const validFacultyIds = await validateFaculty(schoolId, facultyIds)

  const { data: elective, error: electiveError } = await supabase
    .from('electives')
    .insert({
      elective_code: code,
      name: title,
      description: description?.trim() || null,
      credits: credits === '' || credits === undefined ? null : credits,
      is_active: true,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (electiveError) fail(electiveError.message)

  const { data: offering, error: offeringError } = await supabase
    .from('elective_offerings')
    .insert({
      elective_id: elective.id,
      academic_term_id: term.id,
      offering_code: String(offeringCode || 'A').trim().toUpperCase(),
      total_seats: Number(totalSeats),
      reserved_seats: Number(reservedSeats),
      status,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (offeringError) {
    await supabase.from('electives').delete().eq('id', elective.id)
    fail(offeringError.message)
  }

  const { error: eligibilityError } = await supabase
    .from('offering_eligibility')
    .insert(validEligibility.map(item => ({
      ...item,
      offering_id: offering.id,
    })))

  if (eligibilityError) {
    await supabase.from('elective_offerings').delete().eq('id', offering.id)
    await supabase.from('electives').delete().eq('id', elective.id)
    fail(eligibilityError.message)
  }

  if (validFacultyIds.length > 0) {
    const rows = validFacultyIds.map((facultyId, index) => ({
      offering_id: offering.id,
      faculty_id: facultyId,
      assignment_role: index === 0 ? 'primary' : 'assistant',
      assigned_by: createdBy || null,
    }))

    const { error } = await supabase.from('faculty_assignments').insert(rows)

    if (error) {
      await supabase.from('elective_offerings').delete().eq('id', offering.id)
      await supabase.from('electives').delete().eq('id', elective.id)
      fail(error.message)
    }
  }

  return getOfferingForSchool(schoolId, offering.id)
}

// Update elective master information and offering configuration.
export async function updateSchoolElective({
  schoolId,
  offeringId,
  electiveCode,
  name,
  description,
  credits,
  academicTermId,
  offeringCode,
  totalSeats,
  reservedSeats,
  status,
  eligibility,
  facultyIds,
  updatedBy,
}) {
  const existing = await getOfferingForSchool(schoolId, offeringId)

  const code = String(electiveCode || '').trim().toUpperCase()
  const title = String(name || '').trim()

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    fail('Elective code must contain only uppercase letters, numbers, hyphens or underscores.')
  }

  if (!title) fail('Elective name is required.')

  await validateOfferingInputs({
    academicTermId,
    totalSeats,
    reservedSeats,
    status,
    facultyIds: facultyIds || [],
  })

  const { error: electiveError } = await supabase
    .from('electives')
    .update({
      elective_code: code,
      name: title,
      description: description?.trim() || null,
      credits: credits === '' || credits === undefined ? null : credits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.elective_id)

  if (electiveError) fail(electiveError.message)

  const { error: offeringError } = await supabase
    .from('elective_offerings')
    .update({
      academic_term_id: academicTermId,
      offering_code: String(offeringCode || 'A').trim().toUpperCase(),
      total_seats: Number(totalSeats),
      reserved_seats: Number(reservedSeats),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)

  if (offeringError) fail(offeringError.message)

  if (eligibility) {
    await replaceEligibility(offeringId, schoolId, eligibility)
  }

  if (facultyIds) {
    await replaceFacultyAssignments(
      offeringId,
      schoolId,
      facultyIds,
      updatedBy
    )
  }

  return getOfferingForSchool(schoolId, offeringId)
}

// Change offering status.
export async function setSchoolElectiveStatus(schoolId, offeringId, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    fail('Invalid offering status.')
  }

  await getOfferingForSchool(schoolId, offeringId)

  const { data, error } = await supabase
    .from('elective_offerings')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)
    .select()
    .single()

  if (error) fail(error.message)

  return data
}

// Show enrollment counts and student records for one offering.
export async function getSchoolElectiveEnrollments(schoolId, offeringId) {
  await getOfferingForSchool(schoolId, offeringId)

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      id, status, enrolled_at, cancelled_at,
      student_academic_records!inner(
        id, academic_year_level, division, roll_number,
        student_id, school_id,
        profiles:student_id(id, full_name, email)
      )
    `)
    .eq('offering_id', offeringId)
    .eq('student_academic_records.school_id', schoolId)
    .order('enrolled_at', { ascending: false })

  if (error) fail(error.message)

  return enrollments || []
}

// Bulk create offerings from validated CSV rows.
export async function bulkCreateSchoolElectives({
  schoolId,
  rows,
  createdBy,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    fail('No elective rows were provided.')
  }

  const results = []

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]

    try {
      const result = await createSchoolElective({
        schoolId,
        ...row,
        createdBy,
      })

      results.push({
        row: index + 1,
        success: true,
        offering: result,
      })
    } catch (error) {
      results.push({
        row: index + 1,
        success: false,
        error: error.message,
      })
    }
  }

  return {
    total: rows.length,
    successful: results.filter(item => item.success).length,
    failed: results.filter(item => !item.success).length,
    results,
  }
}
