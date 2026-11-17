
import { supabase } from '../config/supabase.js'

// ======================================================
// HELPERS
// ======================================================

function normalizeFaculty(input = {}) {
  return {
    full_name: String(input.full_name || '').trim(),
    employee_id: String(input.employee_id || '').trim().toUpperCase(),
    email: String(input.email || '').trim().toLowerCase(),
    phone: String(input.phone || '').trim(),
    department_id: String(input.department_id || '').trim(),
    designation: String(input.designation || '').trim() || null,
    joining_date: input.joining_date || null,
  }
}

function validateFaculty(faculty) {
  if (!faculty.full_name) throw new Error('Full name is required.')
  if (!faculty.employee_id) throw new Error('Employee ID is required.')
  if (!faculty.email) throw new Error('Email is required.')
  if (!faculty.phone) throw new Error('Phone is required.')
  if (!faculty.department_id) throw new Error('Department is required.')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(faculty.email)) {
    throw new Error('Enter a valid email address.')
  }

  if (!/^\+[1-9][0-9]{7,14}$/.test(faculty.phone)) {
    throw new Error('Phone must use international format, e.g. +919876543210.')
  }

  if (
    faculty.joining_date &&
    Number.isNaN(Date.parse(faculty.joining_date))
  ) {
    throw new Error('Invalid joining date.')
  }
}

async function validateSchool(schoolId) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, is_active')
    .eq('id', schoolId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('School not found.')
  if (!data.is_active) throw new Error('This school is inactive.')

  return data
}

async function validateDepartment(schoolId, departmentId) {
  const { data, error } = await supabase
    .from('departments')
    .select('id, school_id, name, is_active')
    .eq('id', departmentId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Department does not belong to this school.')
  if (!data.is_active) throw new Error('Selected department is inactive.')

  return data
}

async function fetchAllRows(query) {
  const pageSize = 1000
  let rows = []
  let start = 0

  while (true) {
    const { data, error } = await query.range(
      start,
      start + pageSize - 1
    )

    if (error) throw new Error(error.message)

    rows = rows.concat(data || [])

    if (!data || data.length < pageSize) break

    start += pageSize
  }

  return rows
}

function buildFacultyRecord(faculty, profiles, departments) {
  const profile = profiles.get(faculty.profile_id)

  if (!profile) return null

  return {
    faculty_id: faculty.id,
    profile_id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    account_status: profile.account_status,
    force_password_change: profile.force_password_change,
    employee_id: faculty.employee_id,
    designation: faculty.designation,
    joining_date: faculty.joining_date,
    department: departments.get(faculty.department_id) || null,
    created_at: faculty.created_at,
  }
}

// ======================================================
// FACULTY DIRECTORY
// ======================================================

export async function getSchoolFaculty(schoolId, filters = {}) {
  await validateSchool(schoolId)

  const { data: departments, error: departmentError } = await supabase
    .from('departments')
    .select('id, name, code, is_active')
    .eq('school_id', schoolId)

  if (departmentError) throw new Error(departmentError.message)

  const departmentList = departments || []
  const departmentIds = departmentList.map(item => item.id)

  if (departmentIds.length === 0) return []

  const facultyRows = await fetchAllRows(
    supabase
      .from('faculty_details')
      .select(`
        id,
        profile_id,
        employee_id,
        department_id,
        designation,
        joining_date,
        created_at
      `)
      .in('department_id', departmentIds)
      .order('created_at', { ascending: false })
  )

  if (facultyRows.length === 0) return []

  const profileIds = facultyRows.map(item => item.profile_id)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      account_status,
      force_password_change
    `)
    .in('id', profileIds)
    .eq('role', 'faculty')

  if (profileError) throw new Error(profileError.message)

  const profileMap = new Map(
    (profiles || []).map(item => [item.id, item])
  )

  const departmentMap = new Map(
    departmentList.map(item => [item.id, item])
  )

  let results = facultyRows
    .map(item => buildFacultyRecord(item, profileMap, departmentMap))
    .filter(Boolean)

  const search = String(filters.search || '').trim().toLowerCase()

  if (search) {
    results = results.filter(item =>
      item.full_name.toLowerCase().includes(search) ||
      item.employee_id.toLowerCase().includes(search) ||
      item.email.toLowerCase().includes(search)
    )
  }

  if (filters.departmentId) {
    results = results.filter(
      item => item.department?.id === filters.departmentId
    )
  }

  if (filters.accountStatus) {
    results = results.filter(
      item => item.account_status === filters.accountStatus
    )
  }

  return results.sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  )
}

// ======================================================
// FACULTY FORM OPTIONS
// ======================================================

export async function getSchoolFacultyOptions(schoolId) {
  await validateSchool(schoolId)

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return {
    departments: data || [],
    accountStatuses: ['pending', 'active', 'suspended', 'disabled'],
  }
}

// ======================================================
// FACULTY DETAILS
// ======================================================

export async function getSchoolFacultyDetails(schoolId, facultyId) {
  const faculty = await getSchoolFaculty(schoolId)

  return faculty.find(item => item.faculty_id === facultyId) || null
}

// ======================================================
// CREATE FACULTY
// ======================================================

export async function createSchoolFaculty(schoolId, input) {
  const faculty = normalizeFaculty(input)

  validateFaculty(faculty)
  await validateSchool(schoolId)
  await validateDepartment(schoolId, faculty.department_id)

  const { data: existingEmployee, error: employeeError } =
    await supabase
      .from('faculty_details')
      .select('id')
      .eq('employee_id', faculty.employee_id)
      .maybeSingle()

  if (employeeError) throw new Error(employeeError.message)

  if (existingEmployee) {
    throw new Error('Employee ID already exists.')
  }

  const { data: existingEmail, error: emailError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', faculty.email)
    .maybeSingle()

  if (emailError) throw new Error(emailError.message)

  if (existingEmail) {
    throw new Error('Email address is already registered.')
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: faculty.email,
      password: faculty.phone,
      email_confirm: true,
      user_metadata: {
        full_name: faculty.full_name,
        role: 'faculty',
      },
    })

  if (authError) {
    throw new Error(authError.message)
  }

  const userId = authData.user.id

  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: faculty.full_name,
        email: faculty.email,
        phone: faculty.phone,
        role: 'faculty',
        account_status: 'pending',
        force_password_change: true,
      })

    if (profileError) throw new Error(profileError.message)

    const { data: facultyRecord, error: facultyError } =
      await supabase
        .from('faculty_details')
        .insert({
          profile_id: userId,
          employee_id: faculty.employee_id,
          department_id: faculty.department_id,
          designation: faculty.designation,
          joining_date: faculty.joining_date,
        })
        .select()
        .single()

    if (facultyError) throw new Error(facultyError.message)

    return {
      faculty_id: facultyRecord.id,
      profile_id: userId,
      employee_id: facultyRecord.employee_id,
      full_name: faculty.full_name,
      email: faculty.email,
      account_status: 'pending',
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId)
    throw error
  }
}

// ======================================================
// UPDATE FACULTY
// ======================================================

export async function updateSchoolFaculty(
  schoolId,
  facultyId,
  input
) {
  const existing = await getSchoolFacultyDetails(schoolId, facultyId)

  if (!existing) throw new Error('Faculty member not found.')

  const faculty = normalizeFaculty(input)

  validateFaculty(faculty)
  await validateDepartment(schoolId, faculty.department_id)

  if (faculty.employee_id !== existing.employee_id) {
    const { data, error } = await supabase
      .from('faculty_details')
      .select('id')
      .eq('employee_id', faculty.employee_id)
      .neq('id', facultyId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) throw new Error('Employee ID already exists.')
  }

  if (faculty.email !== existing.email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', faculty.email)
      .neq('id', existing.profile_id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) throw new Error('Email address is already registered.')

    const { error: authError } =
      await supabase.auth.admin.updateUserById(existing.profile_id, {
        email: faculty.email,
      })

    if (authError) throw new Error(authError.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: faculty.full_name,
      email: faculty.email,
      phone: faculty.phone,
    })
    .eq('id', existing.profile_id)

  if (profileError) throw new Error(profileError.message)

  const { error: facultyError } = await supabase
    .from('faculty_details')
    .update({
      employee_id: faculty.employee_id,
      department_id: faculty.department_id,
      designation: faculty.designation,
      joining_date: faculty.joining_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facultyId)

  if (facultyError) throw new Error(facultyError.message)

  return getSchoolFacultyDetails(schoolId, facultyId)
}

// ======================================================
// ACCOUNT STATUS
// ======================================================

export async function setSchoolFacultyStatus(
  schoolId,
  facultyId,
  accountStatus
) {
  const allowedStatuses = ['active', 'suspended', 'disabled']

  if (!allowedStatuses.includes(accountStatus)) {
    throw new Error('Invalid faculty account status.')
  }

  const existing = await getSchoolFacultyDetails(schoolId, facultyId)

  if (!existing) throw new Error('Faculty member not found.')

  if (existing.account_status === 'pending' && accountStatus === 'active') {
    throw new Error(
      'Faculty must complete account activation before being activated.'
    )
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.profile_id)
    .select('id, account_status')
    .single()

  if (error) throw new Error(error.message)

  return data
}

// ======================================================
// BULK FACULTY REGISTRATION
// ======================================================

export async function bulkCreateSchoolFaculty(schoolId, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Please provide at least one faculty record.')
  }

  if (rows.length > 500) {
    throw new Error('Maximum 500 faculty records per upload.')
  }

  const created = []
  const errors = []

  for (let index = 0; index < rows.length; index += 1) {
    try {
      const result = await createSchoolFaculty(schoolId, rows[index])
      created.push({
        row: index + 1,
        ...result,
      })
    } catch (error) {
      errors.push({
        row: index + 1,
        employee_id: rows[index]?.employee_id || '',
        message: error.message,
      })
    }
  }

  return {
    total: rows.length,
    successful: created.length,
    failed: errors.length,
    created,
    errors,
  }
}
