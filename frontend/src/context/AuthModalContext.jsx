import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AuthModal from '../components/auth/AuthModal.jsx'

/**
 * Landing-wide auth modal. Provides `openAuth(role)` to any component so hero
 * CTAs, navbar links, specialty chips etc. can all launch the login/signup
 * flow, while the modal itself is rendered once here.
 */
const Ctx = createContext(null)

export function AuthModalProvider({ children }) {
  const [auth, setAuth] = useState({ open: false, role: 'patient' })
  const openAuth = useCallback((role = 'patient') => setAuth({ open: true, role }), [])
  const closeAuth = useCallback(() => setAuth((a) => ({ ...a, open: false })), [])

  // Deep-link: /?auth=patient or /?auth=doctor opens the modal on load.
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('auth')
    if (role === 'patient' || role === 'doctor') setAuth({ open: true, role })
  }, [])

  return (
    <Ctx.Provider value={{ openAuth, closeAuth }}>
      {children}
      <AuthModal open={auth.open} role={auth.role} onClose={closeAuth} />
    </Ctx.Provider>
  )
}

export function useAuthModal() {
  return useContext(Ctx) || { openAuth: () => {}, closeAuth: () => {} }
}
