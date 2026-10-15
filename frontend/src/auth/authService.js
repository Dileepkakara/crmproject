import { DEFAULT_MOCK_USERS, DEMO_PASSWORD } from './mockUsers'

const USERS_KEY = 'designblocks-crm-mock-users'

function readUsers() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(USERS_KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch (error) {
    console.warn('Could not read demo user changes; using the default users.', error)
  }
  return DEFAULT_MOCK_USERS
}

function saveUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch (error) {
    throw new Error(`Could not save demo user changes: ${error.message}`, { cause: error })
  }
}

export const authService = {
  listUsers: async () => structuredClone(readUsers()),
  getUser: async (id) => structuredClone(readUsers().find((user) => user.id === id && user.status === 'Active') || null),
  login: async (email, password) => {
    const user = readUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.status !== 'Active' || password !== DEMO_PASSWORD) {
      throw new Error('Email or password is incorrect, or this demo account is inactive.')
    }
    return structuredClone(user)
  },
  saveUser: async (input) => {
    const users = readUsers()
    const email = input.email.trim().toLowerCase()
    if (users.some((user) => user.email.toLowerCase() === email && user.id !== input.id)) {
      throw new Error('A demo user with this email already exists.')
    }
    const user = input.id
      ? { ...users.find((entry) => entry.id === input.id), ...input, email }
      : { ...input, id: `USR-${Date.now()}`, email, status: input.status || 'Active', initials: input.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
    const next = input.id ? users.map((entry) => entry.id === input.id ? user : entry) : [...users, user]
    saveUsers(next)
    return structuredClone(user)
  },
  removeUser: async (id, currentUserId) => {
    if (id === currentUserId) throw new Error('You cannot deactivate your own signed-in account.')
    const users = readUsers()
    saveUsers(users.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' } : user))
  },
  resetUsers: () => saveUsers(DEFAULT_MOCK_USERS),
}
