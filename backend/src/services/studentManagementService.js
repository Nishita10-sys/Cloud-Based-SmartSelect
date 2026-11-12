
import { supabase } from '../config/supabase.js'

const PAGE_SIZE = 1000
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

// ======================================================
// COMMON HELPERS
// ======================================================

async function fetchAllRows(buildQuery) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery()
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)

    rows.push(...(data || []))

    if (!data || data.length < PAGE_SIZE) break

    from += PAGE_SIZE
  }

  return rows
}

async function fetchByIds(table, columns, ids) {
  if (!ids.length) return []

  const uniqueIds = [...new Set(ids)]

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in('id', uniqueIds)

  if (error) throw new Error(error.message)

  return data || []
}

function createMap(rows) {
  return new Map(rows.map(row => [row.id, row]))
}

// ======================================================
// ACADEMIC RECORD ENRICHMENT
// ======================================================

async function enrichAcademicRecords(records) {
  if (!records.length) return []

  const [
    schools,
    departments,
    specializations,
    terms,
  ] = await Promise.all([
    fetchByIds(
      'schools',
      'id, name, code',
      records.map(row => row.school_id)
    ),
    fetchByIds(
      'departments',
      'id, name, code',
      records.map(row => row.department_id)
    ),
    fetchByIds(
      'specializations',
      'id, name, code',
      records.map(row => row.specialization_id)
    ),
    fetchByIds(
      'academic_terms',
      'id, academic_year_id, semester_number, name, start_date, end_date',
      records.map(row => row.academic_term_id)
    ),
  ])

  const years = await fetchByIds(
    'academic_years',
    'id, name, code, is_current',
    terms.map(row => row.academic_year_id)
  )

  const schoolMap = createMap(schools)
  const departmentMap = createMap(departments)
  const specializationMap = createMap(specializations)
  const termMap = createMap(terms)
  const yearMap = createMap(years)

  return records.map(record => {
    const term = termMap.get(record.academic_term_id)

    return {
      ...record,
      school: schoolMap.get(record.school_id) || null,
      department: departmentMap.get(record.department_id) || null,
      specialization:
        specializationMap.get(record.specialization_id) || null,
      academic_term: term
        ? {
            ...term,
            academic_year: yearMap.get(term.academic_year_id) || null,
          }
        : null,
    }
  })
}

// ======================================================
// UNIVERSITY-WIDE STUDENT DIRECTORY
// ======================================================

export async function getStudentDirectory({
  search = '',
  accountStatus = '',
  schoolId = '',
  departmentId = '',
  academicYearLevel = '',
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE)
  )

  // Start from student_details so unassigned students are included.
  const students = await fetchAllRows(() =>
    supabase
      .from('student_details')
      .select(`
        id,
        profile_id,
        enrollment_number,
        admission_date,
        admission_batch,
        created_at,
        updated_at,
        profiles!inner (
          id,
          full_name,
          email,
          phone,
          role,
          account_status,
          force_password_change,
          created_at
        )
      `)
      .eq('profiles.role', 'student')
      .order('created_at', { ascending: false })
  )

  // Load active academic placements separately.
  const academicRecords = await fetchAllRows(() =>
    supabase
      .from('student_academic_records')
      .select('*')
      .eq('record_status', 'active')
      .order('created_at', { ascending: false })
  )

  const enrichedRecords =
    await enrichAcademicRecords(academicRecords)

  // Keep the latest active academic placement for directory display.
  const latestRecordMap = new Map()

  for (const record of enrichedRecords) {
    if (!latestRecordMap.has(record.student_id)) {
      latestRecordMap.set(record.student_id, record)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()

  let result = students.map(student => {
    const profile = student.profiles
    const academicRecord = latestRecordMap.get(student.id) || null

    return {
      id: student.id,
      profile_id: student.profile_id,
      enrollment_number: student.enrollment_number,
      admission_date: student.admission_date,
      admission_batch: student.admission_batch,
      created_at: student.created_at,
      updated_at: student.updated_at,

      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        account_status: profile.account_status,
        force_password_change: profile.force_password_change,
        created_at: profile.created_at,
      },

      academic_record: academicRecord,
    }
  })

  if (normalizedSearch) {
    result = result.filter(student => {
      const searchable = [
        student.profile.full_name,
        student.profile.email,
        student.profile.phone,
        student.enrollment_number,
      ].join(' ').toLowerCase()

      return searchable.includes(normalizedSearch)
    })
  }

  if (accountStatus) {
    result = result.filter(
      student => student.profile.account_status === accountStatus
    )
  }

  if (schoolId) {
    result = result.filter(
      student => student.academic_record?.school_id === schoolId
    )
  }

  if (departmentId) {
    result = result.filter(
      student => student.academic_record?.department_id === departmentId
    )
  }

  if (academicYearLevel) {
    result = result.filter(
      student =>
        student.academic_record?.academic_year_level === academicYearLevel
    )
  }

  const total = result.length
  const start = (safePage - 1) * safeLimit

  return {
    students: result.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  }
}

// ======================================================
// GET ONE STUDENT
// ======================================================

export async function getStudentById(studentId) {
  const { data: student, error } = await supabase
    .from('student_details')
    .select(`
      id,
      profile_id,
      enrollment_number,
      admission_date,
      admission_batch,
      created_at,
      updated_at,
      profiles!inner (
        id,
        full_name,
        email,
        phone,
        role,
        account_status,
        force_password_change,
        created_at
      )
    `)
    .eq('id', studentId)
    .eq('profiles.role', 'student')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!student) return null

  const { data: records, error: recordsError } = await supabase
    .from('student_academic_records')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (recordsError) throw new Error(recordsError.message)

  const academicHistory = await enrichAcademicRecords(records || [])
  const profile = student.profiles

  return {
    id: student.id,
    profile_id: student.profile_id,
    enrollment_number: student.enrollment_number,
    admission_date: student.admission_date,
    admission_batch: student.admission_batch,
    created_at: student.created_at,
    updated_at: student.updated_at,

    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      account_status: profile.account_status,
      force_password_change: profile.force_password_change,
      created_at: profile.created_at,
    },

    academic_history: academicHistory,
  }
}

// ======================================================
// STUDENT FORM OPTIONS
// ======================================================

export async function getStudentFormOptions() {
  const [
    schoolsResult,
    departmentsResult,
    specializationsResult,
    yearsResult,
    termsResult,
  ] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('departments')
      .select('id, school_id, name, code')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('specializations')
      .select('id, department_id, name, code')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('academic_years')
      .select('id, name, code, is_current')
      .eq('is_active', true)
      .order('start_date', { ascending: false }),

    supabase
      .from('academic_terms')
      .select('id, academic_year_id, semester_number, name')
      .eq('is_active', true)
      .order('semester_number'),
  ])

  for (const result of [
    schoolsResult,
    departmentsResult,
    specializationsResult,
    yearsResult,
    termsResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    schools: schoolsResult.data || [],
    departments: departmentsResult.data || [],
    specializations: specializationsResult.data || [],
    academic_years: yearsResult.data || [],
    semesters: termsResult.data || [],
    year_levels: ['FY', 'SY', 'TY', 'LY'],
  }
}

// ======================================================
// VALIDATE OPTIONAL ACADEMIC PLACEMENT
// ======================================================

async function validateAcademicPlacement(placement) {
  const {
    academicTermId,
    schoolId,
    departmentId,
    specializationId,
    academicYearLevel,
  } = placement

  const yearLevelSemesters = {
    FY: [1, 2],
    SY: [3, 4],
    TY: [5, 6],
    LY: [7, 8],
  }

  if (!yearLevelSemesters[academicYearLevel]) {
    throw new Error('Invalid academic year level.')
  }

  const { data: term, error: termError } = await supabase
    .from('academic_terms')
    .select('id, academic_year_id, semester_number, is_active')
    .eq('id', academicTermId)
    .maybeSingle()

  if (termError) throw new Error(termError.message)
  if (!term || !term.is_active) {
    throw new Error('Selected semester does not exist or is inactive.')
  }

  if (!yearLevelSemesters[academicYearLevel].includes(term.semester_number)) {
    throw new Error(
      `Semester ${term.semester_number} does not match ${academicYearLevel}.`
    )
  }

  const { data: year, error: yearError } = await supabase
    .from('academic_years')
    .select('id, is_active')
    .eq('id', term.academic_year_id)
    .maybeSingle()

  if (yearError) throw new Error(yearError.message)
  if (!year || !year.is_active) {
    throw new Error('Selected academic year is inactive.')
  }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, is_active')
    .eq('id', schoolId)
    .maybeSingle()

  if (schoolError) throw new Error(schoolError.message)
  if (!school || !school.is_active) {
    throw new Error('Selected school does not exist or is inactive.')
  }

  const { data: department, error: departmentError } = await supabase
    .from('departments')
    .select('id, school_id, is_active')
    .eq('id', departmentId)
    .maybeSingle()

  if (departmentError) throw new Error(departmentError.message)
  if (
    !department ||
    !department.is_active ||
    department.school_id !== schoolId
  ) {
    throw new Error('Selected department does not belong to this school.')
  }

  const { data: specialization, error: specializationError } =
    await supabase
      .from('specializations')
      .select('id, department_id, is_active')
      .eq('id', specializationId)
      .maybeSingle()

  if (specializationError) {
    throw new Error(specializationError.message)
  }

  if (
    !specialization ||
    !specialization.is_active ||
    specialization.department_id !== departmentId
  ) {
    throw new Error(
      'Selected specialization does not belong to this department.'
    )
  }
}

// ======================================================
// CREATE STUDENT
// ======================================================

export async function createStudent({
  fullName,
  email,
  phone,
  enrollmentNumber,
  admissionDate = null,
  admissionBatch = null,
  academicPlacement = null,
}) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedEnrollment = enrollmentNumber.trim()
  const normalizedPhone = phone.trim()

  if (!/^\+[1-9][0-9]{7,14}$/.test(normalizedPhone)) {
    throw new Error(
      'Phone number must use international format, for example +919876543210.'
    )
  }

  // Academic placement is optional, but if supplied it must be complete.
  if (academicPlacement) {
    const requiredFields = [
      'academicTermId',
      'schoolId',
      'departmentId',
      'specializationId',
      'academicYearLevel',
    ]

    if (requiredFields.some(field => !academicPlacement[field])) {
      throw new Error('Please provide complete academic placement details.')
    }

    await validateAcademicPlacement(academicPlacement)
  }

  // Check duplicate enrollment number.
  const { data: existingEnrollment, error: enrollmentError } =
    await supabase
      .from('student_details')
      .select('id')
      .ilike('enrollment_number', normalizedEnrollment)
      .maybeSingle()

  if (enrollmentError) throw new Error(enrollmentError.message)

  if (existingEnrollment) {
    throw new Error('A student with this enrollment number already exists.')
  }

  // Check duplicate email.
  const { data: existingEmail, error: emailError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (emailError) throw new Error(emailError.message)

  if (existingEmail) {
    throw new Error('A profile with this email address already exists.')
  }

  // Initial password is the student's registered mobile number.
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPhone,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Unable to create student account.')
  }

  const userId = authData.user.id

  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'student',
        account_status: 'pending',
        force_password_change: true,
      })

    if (profileError) {
      throw new Error(`Student profile creation failed: ${profileError.message}`)
    }

    const { data: student, error: studentError } = await supabase
      .from('student_details')
      .insert({
        profile_id: userId,
        enrollment_number: normalizedEnrollment,
        admission_date: admissionDate || null,
        admission_batch: admissionBatch || null,
      })
      .select()
      .single()

    if (studentError) {
      throw new Error(`Student details creation failed: ${studentError.message}`)
    }

    // Academic record is created only when a valid placement is supplied.
    if (academicPlacement) {
      const { error: academicError } = await supabase
        .from('student_academic_records')
        .insert({
          student_id: student.id,
          academic_term_id: academicPlacement.academicTermId,
          school_id: academicPlacement.schoolId,
          department_id: academicPlacement.departmentId,
          specialization_id: academicPlacement.specializationId,
          academic_year_level: academicPlacement.academicYearLevel,
          division: academicPlacement.division?.trim() || null,
          roll_number: academicPlacement.rollNumber?.trim() || null,
          record_status: 'active',
        })

      if (academicError) {
        throw new Error(
          `Academic placement creation failed: ${academicError.message}`
        )
      }
    }

    return {
      id: student.id,
      profile_id: userId,
      enrollment_number: student.enrollment_number,
      account_status: 'pending',
      force_password_change: true,
      academic_placement_created: Boolean(academicPlacement),
    }
  } catch (error) {
    // Remove the partially created Auth account.
    // Related profile/student rows are removed through their foreign keys.
    const { error: rollbackError } =
      await supabase.auth.admin.deleteUser(userId)

    if (rollbackError) {
      console.error(
        'Student account rollback failed:',
        rollbackError.message
      )
    }

    throw error
  }
}

// ======================================================
// UPDATE STUDENT ACCOUNT STATUS
// ======================================================

export async function setStudentAccountStatus(studentId, accountStatus) {
  const allowedStatuses = ['active', 'suspended', 'disabled']

  if (!allowedStatuses.includes(accountStatus)) {
    throw new Error('Invalid student account status.')
  }

  const { data: student, error: studentError } = await supabase
    .from('student_details')
    .select('id, profile_id')
    .eq('id', studentId)
    .maybeSingle()

  if (studentError) throw new Error(studentError.message)
  if (!student) throw new Error('Student not found.')

  const { data, error } = await supabase
    .from('profiles')
    .update({
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', student.profile_id)
    .eq('role', 'student')
    .select('id, full_name, email, account_status')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Student profile not found.')

  return data
}
