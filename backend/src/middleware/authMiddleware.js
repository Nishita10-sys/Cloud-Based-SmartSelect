
import { supabase } from '../config/supabase.js'

export async function authenticateUser(req, res, next) {
  try {
    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      })
    }

    const accessToken = authorization.slice(7).trim()

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      })
    }

    // Verify the access token with Supabase Auth.
    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken)

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      })
    }

    // Fetch the latest account status and role.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, account_status, force_password_change')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message: 'User profile is unavailable.',
      })
    }

    if (profile.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active.',
      })
    }

    if (profile.force_password_change) {
      return res.status(403).json({
        success: false,
        message: 'Password change is required.',
      })
    }

    req.user = {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
    }

    next()
  } catch (error) {
    console.error('Authentication middleware error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to authenticate request.',
    })
  }
}
