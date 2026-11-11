
import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { supabase } from '../src/config/supabase.js'

const ADMIN_EMAIL = 'email-smartselect3035@gmail.com'

const rl = createInterface({
  input: stdin,
  output: stdout,
})

function ask(question) {
  return rl.question(question)
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Run this script in an interactive PowerShell terminal.'))
      return
    }

    stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()

    let password = ''

    function cleanup() {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
    }

    function onData(data) {
      const key = data.toString()

      if (key === '\u0003') {
        cleanup()
        reject(new Error('Operation cancelled.'))
        return
      }

      if (key === '\r' || key === '\n') {
        cleanup()
        stdout.write('\n')
        resolve(password)
        return
      }

      if (key === '\u007f' || key === '\b') {
        password = password.slice(0, -1)
        return
      }

      if (key >= ' ' && key <= '~') {
        password += key
      }
    }

    stdin.on('data', onData)
  })
}

let createdUserId = null

async function createInitialAdmin() {
  try {
    console.log('\n======================================')
    console.log(' SMARTSELECT INITIAL ADMIN SETUP')
    console.log('======================================\n')

    console.log(`Admin email: ${ADMIN_EMAIL}\n`)

    const fullName = (await ask('Administrator full name: ')).trim()

    const phone = (
      await ask('Phone number (example +919876543210): ')
    ).trim()

    if (!fullName) {
      throw new Error('Administrator name is required.')
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw new Error('Enter a valid international phone number.')
    }

    const password = await askHidden(
      'Enter password (minimum 12 characters): '
    )

    const confirmPassword = await askHidden(
      'Confirm password: '
    )

    if (password.length < 12 || password.length > 128) {
      throw new Error('Password must contain 12–128 characters.')
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.')
    }

    console.log('\nChecking for an existing profile...')

    const { data: existingProfile, error: lookupError } =
      await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', ADMIN_EMAIL)
        .maybeSingle()

    if (lookupError) {
      throw new Error(lookupError.message)
    }

    if (existingProfile) {
      throw new Error(
        'A profile already exists for this email. No changes made.'
      )
    }

    console.log('Creating Supabase Auth administrator...')

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password,
        email_confirm: true,
      })

    if (authError || !authData?.user) {
      throw new Error(
        authError?.message || 'Unable to create Auth user.'
      )
    }

    createdUserId = authData.user.id

    console.log('Auth user created. Creating profile...')

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: createdUserId,
        full_name: fullName,
        email: ADMIN_EMAIL,
        phone,
        role: 'admin',
        account_status: 'active',
        force_password_change: false,
      })

    if (profileError) {
      throw new Error(profileError.message)
    }

    console.log('\n======================================')
    console.log(' ADMIN ACCOUNT CREATED SUCCESSFULLY')
    console.log('======================================')
    console.log(`Email: ${ADMIN_EMAIL}`)
    console.log('Role: admin')
    console.log('Status: active')
    console.log('\nYou can now log in to SmartSelect.')

    createdUserId = null
  } catch (error) {
    console.error('\nADMIN SETUP FAILED:', error.message)

    if (createdUserId) {
      console.log('Cleaning up incomplete Auth account...')

      const { error: cleanupError } =
        await supabase.auth.admin.deleteUser(createdUserId)

      if (cleanupError) {
        console.error(
          'Cleanup failed. Check Supabase Auth Users before retrying:',
          cleanupError.message
        )
      } else {
        console.log('Incomplete Auth account removed.')
      }
    }

    process.exitCode = 1
  } finally {
    rl.close()
  }
}

createInitialAdmin()
