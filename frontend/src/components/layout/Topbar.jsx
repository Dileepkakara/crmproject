import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFor } from '../../api/resourcesApi'
import { useApp } from '../../context/useApp'
import { routeTitles, searchableResources } from './navigation'
import { useAuth } from '../../auth/useAuth'
import { getRoleLabel, hasAnyPermission, filterRecordsForUser } from '../../services/permissionsService'
import { usePermissions } from '../../auth/usePermissions'

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { notify } = useApp()
  const { user } = useAuth()

  useEffect(() => {
    if (!query.trim()) return undefined
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const visibleResources = searchableResources.filter(([,, , permission]) => hasAnyPermission(user, permission))
        const resources = await Promise.all(visibleResources.map(async ([resource, path, label]) => ({
          path, label, records: await apiFor[resource].list(),
        })))
        const term = query.toLowerCase()
        if (!cancelled) setResults(resources.flatMap(({ path, label, records }) =>
          filterRecordsForUser(label.toLowerCase(), records, user).filter((record) => JSON.stringify(record).toLowerCase().includes(term)).slice(0, 3)
            .map((record) => ({ label, record, path }))).slice(0, 6))
      } catch (error) {
        if (!cancelled) notify(error.message || 'Search is temporarily unavailable.', 'error')
      }
    }, 220)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, notify, user])

  return <div className="global-search"><Search size={16} /><input aria-label="Search records" placeholder="Search anything..." value={query}
    onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
    onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }} />
    <kbd>⌘ K</kbd>
    {open && query && <><button className="search-dismiss" aria-label="Close search results" onClick={() => setOpen(false)} />
      <div className="search-results">{results.length ? results.map(({ label, record, path }) => <button key={`${label}-${record.id}`} onClick={() => {
        setOpen(false); setQuery(''); navigate(`${path}/${record.id}`)
      }}><span className="search-result-type">{label}</span><strong>{record.name || record.title || record.id}</strong><small>{record.company || record.client || record.status}</small></button>)
        : <div className="search-no-results">No matching records found</div>}</div></>}
  </div>
}

export default function Topbar({ onMenu }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useApp()
  const { user, logout } = useAuth()
  const { hasPermission } = usePermissions()
  const title = useMemo(() => {
    if (location.pathname === '/') return 'Dashboard'
    const route = Object.keys(routeTitles).sort((a, b) => b.length - a.length)
      .find((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
    if (route) return routeTitles[route]
    return location.pathname.startsWith('/leads/') ? 'Lead details' : 'Record details'
  }, [location.pathname])
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!hasPermission('notifications.view')) return undefined
    let active = true
    apiFor.notifications.list()
      .then((notifications) => { if (active) setUnreadCount(notifications.filter((item) => !item.read).length) })
      .catch((error) => { if (active) notify(error.message || 'Could not load notifications.', 'error') })
    return () => { active = false }
  }, [location.pathname, notify, hasPermission])

  return <header className="topbar">
    <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={onMenu}><Menu size={20} /></button>
    <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{title}</strong></div>
    <div className="topbar-tools"><GlobalSearch />
      {hasPermission('notifications.view') && <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate('/notifications')}>
        <Bell size={19} />{unreadCount > 0 && <i>{unreadCount}</i>}
      </button>}
      <div className="profile-menu-wrap"><button className="topbar-profile" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="avatar avatar-blue">{user?.initials || user?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div><span><strong>{user?.name}</strong><small>{getRoleLabel(user?.role)}</small></span><ChevronDown size={15} />
      </button>
        {menuOpen && <div className="profile-dropdown">
          {hasPermission('settings.manage') && <button onClick={() => { setMenuOpen(false); navigate('/settings') }}>Profile & preferences</button>}
          {hasPermission('settings.manage') && <button onClick={() => { setMenuOpen(false); navigate('/settings') }}>Demo workspace settings</button>}
          <button onClick={() => { setMenuOpen(false); logout() }}><LogOut size={14} /> Sign out</button>
          <div className="profile-dropdown-note">Mock session · not production authentication</div>
        </div>}
      </div>
    </div>
  </header>
}
