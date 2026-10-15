import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS } from '../../auth/mockUsers'
import { useAuth } from '../../auth/useAuth'
import { ROLE_CONFIG } from '../../config/roles'
import { getHomeRoute } from '../../services/permissionsService'
import { Button } from '../../components/common/UI'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <div className="loading-screen"><span className="spinner" />Restoring demo session…</div>
  if (user) return <Navigate to={getHomeRoute(user)} replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Enter both your demo email and password.'); return }
    setBusy(true)
    try {
      const signedIn = await login(email, password)
      navigate(location.state?.from || getHomeRoute(signedIn), { replace: true })
    } catch (cause) {
      setError(cause.message || 'Could not sign in to the demo workspace.')
    } finally { setBusy(false) }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <header className="auth-brand"><div className="brand-mark">D</div><div><strong>DESIGN BLOCKS</strong><span>CRM &amp; PROJECT MANAGEMENT</span></div></header>
      <div className="auth-intro"><span>DEMO WORKSPACE</span><h1>Sign in to your workspace</h1><p>Choose a demo account to explore role-based CRM access.</p></div>
      <form className="auth-form" onSubmit={submit}>
        <label className="form-field"><span>Email address</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@designblocks.demo" /></label>
        <label className="form-field"><span>Password</span><span className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter demo password" /><button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <section className="demo-accounts" aria-labelledby="demo-accounts-title">
        <div className="demo-accounts-heading"><div><h2 id="demo-accounts-title">Demo accounts</h2><p>Fictional accounts for local exploration</p></div><ShieldCheck size={19} /></div>
        <div className="demo-account-list">{DEMO_ACCOUNTS.map((account) => <div className="demo-account" key={account.id}>
          <div><strong>{ROLE_CONFIG[account.role].label}</strong><small>{account.email}</small><small>Password: {account.password}</small></div>
          <button type="button" onClick={() => { setEmail(account.email); setPassword(account.password); setError('') }}>Use</button>
        </div>)}</div>
      </section>
      <p className="auth-disclaimer">Mock authentication only. Sessions and permissions in this frontend are not secure production controls.</p>
    </section>
  </main>
}
