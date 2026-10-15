import { API_ENDPOINTS } from './endpoints'
import { getStore, persistStore, resetStore } from '../services/storageService'

const apiMode = import.meta.env.VITE_API_MODE || 'mock'
const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
const wait = (ms = 140) => new Promise((resolve) => window.setTimeout(resolve, ms))

async function request(method, resource, payload, params = {}) {
  if (!API_ENDPOINTS[resource]) throw new Error(`Unknown API resource: ${resource}`)
  if (apiMode === 'backend') {
    const response = await fetch(`${baseUrl}${API_ENDPOINTS[resource]}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return response.status === 204 ? { success: true, data: null } : response.json()
  }
  if (apiMode !== 'mock') throw new Error(`Unsupported VITE_API_MODE: ${apiMode}`)
  await wait()
  const store = getStore()
  const rows = store[resource] || []
  const id = params.id
  let result
  if (method === 'GET' && id) result = rows.find((row) => String(row.id) === String(id)) || null
  else if (method === 'GET') result = rows
  else if (method === 'POST' && payload?.__reset) {
    const fresh = resetStore()
    return { success: true, data: structuredClone(fresh), message: 'Demo data reset.' }
  } else if (method === 'POST') {
    const prefixes = { leads: 'LD', followups: 'FU', clients: 'CL', quotations: 'QT-2026', agreements: 'WO-2026', invoices: 'INV-2026', payments: 'PAY-2026', projects: 'PR', tasks: 'TS', users: 'US', notifications: 'NT' }
    const prefix = prefixes[resource] || resource.slice(0, 2).toUpperCase()
    result = { ...payload, id: payload.id || `${prefix}-${Date.now().toString().slice(-6)}` }
    delete result.__reset
    rows.unshift(result)
    store[resource] = rows
    persistStore(store)
  } else if (method === 'PATCH' || method === 'PUT') {
    const index = rows.findIndex((row) => String(row.id) === String(id))
    if (index < 0) throw new Error(`${resource} record ${id} was not found.`)
    rows[index] = { ...rows[index], ...payload }
    result = rows[index]
    store[resource] = rows
    persistStore(store)
  } else if (method === 'DELETE') {
    const remaining = rows.filter((row) => String(row.id) !== String(id))
    if (remaining.length === rows.length) throw new Error(`${resource} record ${id} was not found.`)
    store[resource] = remaining
    persistStore(store)
    result = { id }
  } else throw new Error(`Unsupported mock operation: ${method}`)
  if (method === 'GET' && id && !result) throw new Error(`${resource} record ${id} was not found.`)
  return { success: true, data: structuredClone(result), message: `${resource} ${method.toLowerCase()} successful` }
}

export const apiClient = {
  get: (resource, params) => request('GET', resource, undefined, params),
  post: (resource, payload) => request('POST', resource, payload),
  patch: (resource, id, payload) => request('PATCH', resource, payload, { id }),
  put: (resource, id, payload) => request('PUT', resource, payload, { id }),
  delete: (resource, id) => request('DELETE', resource, undefined, { id }),
}

export const resetDemoData = async () => request('POST', 'leads', { __reset: true })
