import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api'
import { getTokens, clearTokens } from '../api/client.js'

/**
 * Real auth context backed by the API.
 *  - On mount: if a token exists, rehydrate the user via /auth/me.
 *  - login(identifier, password) -> stores JWT + user.
 *  - register(payload) -> patient self-signup.
 *  - homeFor(role) -> the console route for a backend role.
 */
const AuthContext = createContext(null)

const ROLE_HOME = {
  PATIENT: '/patient-dashboard',
  DOCTOR: '/doctor-dashboard',
  HOSPITAL_ADMIN: '/clinic-dashboard',
  RECEPTIONIST: '/assistant-dashboard',
  SUPER_ADMIN: '/admin/approvals',
}

export function homeFor(role) {
  return ROLE_HOME[role] || '/'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (getTokens().access_token) {
        try {
          const me = await authApi.me()
          if (active) setUser(me)
        } catch {
          clearTokens()
        }
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const login = async (identifier, password) => {
    const data = await authApi.login(identifier, password)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await authApi.register(payload)
    setUser(data.user)
    return data.user
  }

  // Mobile-OTP patient auth.
  const requestOtp = (phone) => authApi.otpRequest(phone)
  const loginOtp = async (phone, otp) => {
    const data = await authApi.otpLogin(phone, otp)
    setUser(data.user)
    return data.user
  }
  const registerOtp = async (payload) => {
    const data = await authApi.otpRegister(payload)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, requestOtp, loginOtp, registerOtp, logout, homeFor }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
