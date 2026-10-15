import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, ShieldCheck } from 'lucide-react'
import { apiFor } from '../../api/resourcesApi'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../auth/useAuth'
import { usePermissions } from '../../auth/usePermissions'
import { Button, PageHeader } from '../../components/common/UI'
import { filterRecordsForUser } from '../../services/permissionsService'
import { formatCurrency, getInvoicePaid } from '../../utils/formatters'

export default function ReportsPage() {
  const { notify } = useApp()
  const { user } = useAuth()
  const { hasPermission: can } = usePermissions()
  const canSales = can('reports.view.sales')
  const canFinancial = can('reports.view.financial')
  const canDelivery = can('projects.view') || can('projects.view.assigned') || can('tasks.view')
  const [data, setData] = useState(null)

  useEffect(() => {
    const keys = [
      ...(canSales ? ['leads', 'quotations'] : []),
      ...(canFinancial ? ['invoices', 'payments'] : []),
      ...(canDelivery ? ['projects', 'tasks'] : []),
    ]
    Promise.all(keys.map((key) => apiFor[key].list()))
      .then((values) => setData(Object.fromEntries(keys.map((key, index) =>
        [key, filterRecordsForUser(key, values[index], user)]))))
      .catch((error) => notify(error.message, 'error'))
  }, [canDelivery, canFinancial, canSales, notify, user])

  const report = useMemo(() => {
    if (!data) return null
    const leads = data.leads || []
    const quotations = data.quotations || []
    const invoices = data.invoices || []
    const payments = data.payments || []
    const projects = data.projects || []
    const tasks = data.tasks || []
    return {
      leads,
      quotations,
      invoices,
      projects,
      tasks,
      outstanding: invoices.reduce((sum, invoice) =>
        sum + Math.max(0, invoice.total - getInvoicePaid(invoice.id, payments)), 0),
      conversions: leads.length ? Math.round(leads.filter((lead) => lead.status === 'Won').length / leads.length * 100) : 0,
      pipeline: quotations.filter((quote) => ['Draft', 'Sent', 'Viewed'].includes(quote.status))
        .reduce((sum, quote) => sum + quote.amount, 0),
      projectCompletion: projects.length
        ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
        : 0,
    }
  }, [data])

  return <div className="page">
    <PageHeader title="Reports" description="A role-scoped view of sales activity, financial health, and delivery progress."
      actions={<><Button className="no-print" variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print</Button><Button className="no-print" variant="secondary" onClick={() => notify('Report export is available from each module’s Export action.', 'info')}><Download size={16} /> Export guide</Button></>} />
    {!report ? <div className="loading-inline"><span className="spinner" />Loading reports…</div> : <>
      <div className="report-metrics">
        {canSales && <><div><small>Lead conversion</small><strong>{report.conversions}%</strong><span>Won leads / all leads</span></div><div><small>Sales pipeline</small><strong>{formatCurrency(report.pipeline)}</strong><span>Draft and sent quotes</span></div></>}
        {canFinancial && <div><small>Outstanding balance</small><strong>{formatCurrency(report.outstanding)}</strong><span>Invoice total less recorded demo payments</span></div>}
        {canDelivery && <div><small>Project completion</small><strong>{report.projectCompletion}%</strong><span>Average assigned project progress</span></div>}
      </div>
      <div className="report-grid">
        {canSales && <section className="panel"><div className="panel-heading"><div><h2>Lead status distribution</h2><p>Number of leads at each stage</p></div></div>
          {['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map((status) => {
            const count = report.leads.filter((lead) => lead.status === status).length
            const width = report.leads.length ? count / report.leads.length * 100 : 0
            return <div className="report-bar-row" key={status}><span>{status}</span><div className="report-bar-track"><i style={{ width: `${width}%` }} /></div><b>{count}</b></div>
          })}
        </section>}
        {(canSales || canDelivery || canFinancial) && <section className="panel"><div className="panel-heading"><div><h2>Workspace snapshot</h2><p>Activity available to your role</p></div></div>
          <div className="snapshot-list">
            {canDelivery && <><div><span>Active projects</span><strong>{report.projects.filter((project) => !['Completed', 'Cancelled'].includes(project.status)).length}</strong></div><div><span>Tasks completed</span><strong>{report.tasks.filter((task) => task.status === 'Completed').length} / {report.tasks.length}</strong></div></>}
            {canSales && <div><span>Quotation acceptance</span><strong>{report.quotations.length ? Math.round(report.quotations.filter((quote) => quote.status === 'Accepted').length / report.quotations.length * 100) : 0}%</strong></div>}
            {canFinancial && <div><span>Open invoices</span><strong>{report.invoices.filter((invoice) => invoice.status !== 'Paid').length}</strong></div>}
          </div>
        </section>}
      </div>
      <p className="prototype-callout"><ShieldCheck size={17} /> Analytics use fictional demo data and are limited by your demo account role; this is not financial reporting.</p>
    </>}
  </div>
}
