import { apiClient } from './apiClient'

export const resourceApi = (resource) => ({
  list: async () => (await apiClient.get(resource)).data,
  get: async (id) => (await apiClient.get(resource, { id })).data,
  create: async (payload) => (await apiClient.post(resource, payload)).data,
  update: async (id, payload) => (await apiClient.patch(resource, id, payload)).data,
  remove: async (id) => (await apiClient.delete(resource, id)).data,
})

export const leadsApi = {
  ...resourceApi('leads'),
  search: async (query) => (await resourceApi('leads').list()).filter((lead) =>
    JSON.stringify(lead).toLowerCase().includes(String(query).toLowerCase())),
  assign: async (id, assignee) => (await apiClient.patch('leads', id, { assignee })).data,
  updateStatus: async (id, status) => (await apiClient.patch('leads', id, { status })).data,
}

export const followupsApi = resourceApi('followups')
export const clientsApi = resourceApi('clients')
export const quotationsApi = {
  ...resourceApi('quotations'),
  send: async (id) => (await apiClient.patch('quotations', id, { status: 'Sent', sentAt: new Date().toISOString() })).data,
  approve: async (id) => (await apiClient.patch('quotations', id, { status: 'Accepted', acceptedAt: new Date().toISOString() })).data,
  reject: async (id) => (await apiClient.patch('quotations', id, { status: 'Rejected' })).data,
  revise: async (id, reason) => {
    const previous = await apiClient.get('quotations', { id })
    const revised = await apiClient.post('quotations', {
      ...previous.data, id: undefined, version: Number(previous.data.version || 1) + 1,
      status: 'Draft', revisionOf: id, revisionReason: reason, revisionDate: new Date().toISOString(),
    })
    return revised.data
  },
}
export const agreementsApi = resourceApi('agreements')
export const invoicesApi = resourceApi('invoices')
export const paymentsApi = resourceApi('payments')
export const projectsApi = resourceApi('projects')
export const tasksApi = resourceApi('tasks')
export const usersApi = resourceApi('users')
export const notificationsApi = resourceApi('notifications')
export const reportsApi = {
  getSummary: async () => {
    const [leads, quotations, invoices, payments, projects, tasks] = await Promise.all([
      apiFor.leads.list(), apiFor.quotations.list(), apiFor.invoices.list(),
      apiFor.payments.list(), apiFor.projects.list(), apiFor.tasks.list(),
    ])
    return { leads, quotations, invoices, payments, projects, tasks }
  },
}

export const apiFor = {
  leads: leadsApi, followups: followupsApi, clients: clientsApi, quotations: quotationsApi,
  agreements: agreementsApi, invoices: invoicesApi, payments: paymentsApi,
  projects: projectsApi, tasks: tasksApi, users: usersApi, notifications: notificationsApi,
}
