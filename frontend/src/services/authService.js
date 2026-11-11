
import api from './api'

const ACCESS_TOKEN_KEY = 'smartselect_access_token'
const REFRESH_TOKEN_KEY = 'smartselect_refresh_token'

const authService = {
  async login(identifier, password) {
    const response = await api.post('/auth/login', {
      identifier,
      password,
    })

    const result = response.data

    if (!result.activationRequired && result.data?.accessToken) {
      sessionStorage.setItem(
        ACCESS_TOKEN_KEY,
        result.data.accessToken
      )

      sessionStorage.setItem(
        REFRESH_TOKEN_KEY,
        result.data.refreshToken
      )
    }

    return result
  },

  async verifyActivationOtp(identifier, otp) {
    const response = await api.post('/auth/activation/verify-otp', {
      identifier,
      otp,
    })

    return response.data
  },

  async setActivationPassword(activationToken, password) {
    const response = await api.post(
      '/auth/activation/set-password',
      { password },
      {
        headers: {
          Authorization: `Bearer ${activationToken}`,
        },
      }
    )

    return response.data
  },

  async requestPasswordReset(identifier) {
    const response = await api.post('/auth/forgot-password', {
      identifier,
    })

    return response.data
  },

  async verifyPasswordResetOtp(identifier, otp) {
    const response = await api.post(
      '/auth/reset-password/verify-otp',
      { identifier, otp }
    )

    return response.data
  },

  async completePasswordReset(resetToken, password) {
    const response = await api.post(
      '/auth/reset-password/complete',
      { password },
      {
        headers: {
          Authorization: `Bearer ${resetToken}`,
        },
      }
    )

    return response.data
  },

  async refreshSession() {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)

    if (!refreshToken) {
      throw new Error('No refresh token available.')
    }

    const response = await api.post('/auth/refresh', {
      refreshToken,
    })

    const result = response.data

    sessionStorage.setItem(
      ACCESS_TOKEN_KEY,
      result.data.accessToken
    )

    sessionStorage.setItem(
      REFRESH_TOKEN_KEY,
      result.data.refreshToken
    )

    return result
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  },

  clearSession() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export default authService
