import { createContext, useContext, useState } from 'react'

/**
 * Lightweight, in-memory auth context (STATIC — no backend yet).
 * Stores the currently "logged in" user + role so dashboards can read it and
 * so swapping in real backend auth later is a single-file change.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // { role, name, email }

  const login = (role, info = {}) => setUser({ role, ...info })
  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
