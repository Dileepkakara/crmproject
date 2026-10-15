import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { authService } from './authService'
import { clearSession, readSessionId, writeSessionId } from './authStorage'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const userId = readSessionId()
    const restore = userId ? authService.getUser(userId) : Promise.resolve(null)
    restore.then((current) => {
      if (active) {
        setUser(current)
        if (userId && !current) clearSession()
      }
    }).catch((error) => {
      if (active) console.error('Could not restore the mock session.', error)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = useCallback(async (email, password) => {
    const current = await authService.login(email, password)
    writeSessionId(current.id)
    setUser(current)
    return current
  }, [])
  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])
  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
