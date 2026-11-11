
const VALID_ROLES = ['student', 'faculty', 'admin']

export function authorizeRoles(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some(role => !VALID_ROLES.includes(role))
  ) {
    throw new Error('Invalid or missing allowed roles.')
  }

  return function roleAuthorization(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required.',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      })
    }

    next()
  }
}
