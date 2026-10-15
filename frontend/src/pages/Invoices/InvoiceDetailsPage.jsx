import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { apiFor } from '../../api/resourcesApi'
import { useApp } from '../../context/useApp'
import { Badge, Button, PageHeader } from '../../components/common/UI'
import { readPreferences } from '../../services/storageService'
import { formatCurrency, formatDate, getInvoicePaid } from '../../utils/formatters'
import { useAuth } from '../../auth/useAuth'
import { canAccessRecord } from '../../services/permissionsService'

function getLineItems(invoice) {
  if (Array.isArray(invoice.lineItems) && invoice.lineItems.length) {
    return invoice.lineItems.map((item) => ({
      description: item.description || '—',
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount ?? Number(item.quantity || 0) * Number(item.rate || 0)),
    }))
  }
  if (invoice.description && invoice.quantity !== undefined && invoice.rate !== undefined) {
    return [{
      description: invoice.description,
      quantity: Number(invoice.quantity) || 0,
      rate: Number(invoice.rate) || 0,
      amount: Number(invoice.quantity || 0) * Number(invoice.rate || 0),
    }]
  }
  return [{
    description: 'Line-item details not recorded',
    quantity: null,
    rate: null,
    amount: Number(invoice.total) || 0,
  }]
}

export default function InvoiceDetailsPage() {
  const { id } = useParams()
  const { notify } = useApp()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [client, setClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [preferences] = useState(readPreferences)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      apiFor.invoices.get(id),
      apiFor.clients.list(),
      apiFor.payments.list(),
    ]).then(([record, clients, paymentRecords]) => {
      if (!active) return
      if (!canAccessRecord('invoices', record, user)) {
        notify('This invoice is outside your demo account access.', 'error')
        return
      }
      setInvoice(record)
      setClient(clients.find((item) => item.id === record.clientId) || null)
      setPayments(paymentRecords.filter((item) => item.invoiceId === record.id))
    }).catch((error) => { if (active) notify(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, notify, user])

  const lineItems = useMemo(() => invoice ? getLineItems(invoice) : [], [invoice])
  const hasLineBreakdown = Boolean(invoice?.lineItems?.length || (invoice?.description && invoice?.quantity !== undefined && invoice?.rate !== undefined))
  const hasSubtotal = Boolean(invoice && (invoice.subtotal !== undefined || hasLineBreakdown))
  const subtotal = Number(invoice?.subtotal ?? (hasLineBreakdown ? lineItems.reduce((sum, item) => sum + item.amount, 0) : 0))
  const discount = Number(invoice?.discount) || 0
  const tax = Number(invoice?.tax) || 0
  const total = hasLineBreakdown
    ? Math.max(0, subtotal - discount + tax)
    : Number(invoice?.total) || 0
  const paid = invoice ? getInvoicePaid(invoice.id, payments) : 0
  const balance = Math.max(0, total - paid)

  if (loading) return <div className="loading-screen"><span className="spinner" />Loading invoice…</div>
  if (!invoice) return <div className="page"><Link to="/invoices" className="back-link"><ArrowLeft size={16} /> Back to invoices</Link><div className="empty-state">Invoice record not found.</div></div>

  const clientName = client?.name || invoice.client || '—'
  const clientCompany = client?.company

  return <div className="page">
    <div className="no-print">
      <Link to="/invoices" className="back-link"><ArrowLeft size={16} /> Back to invoices</Link>
      <PageHeader title={`Invoice ${invoice.id}`} description={invoice.project || 'Invoice details'}
        actions={<Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print invoice</Button>} />
      <section className="panel invoice-screen-card">
        <div className="panel-heading"><div><h2>{clientName}</h2><p>{clientCompany || invoice.project}</p></div><Badge>{invoice.status}</Badge></div>
        <div className="invoice-screen-meta"><span>Issued <strong>{formatDate(invoice.issueDate)}</strong></span><span>Due <strong>{formatDate(invoice.dueDate)}</strong></span></div>
        <div className="table-scroll"><table className="data-table invoice-line-table"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{lineItems.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description}</td><td>{item.quantity ?? '—'}</td><td>{item.rate === null ? '—' : formatCurrency(item.rate)}</td><td>{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>
        <div className="invoice-totals"><div><span>Subtotal</span><strong>{hasSubtotal ? formatCurrency(subtotal) : 'Not recorded'}</strong></div>{discount > 0 && <div><span>Discount</span><strong>− {formatCurrency(discount)}</strong></div>}{tax > 0 && <div><span>Tax</span><strong>{formatCurrency(tax)}</strong></div>}<div className="invoice-grand-total"><span>Total</span><strong>{formatCurrency(total)}</strong></div><div><span>Paid</span><strong>{formatCurrency(paid)}</strong></div><div><span>Balance due</span><strong>{formatCurrency(balance)}</strong></div></div>
      </section>
    </div>
    <article className="print-only print-document invoice-print-document">
      <header className="invoice-print-header"><div><h1>{preferences.companyName || 'Design Blocks'}</h1>{preferences.subtitle && <p>{preferences.subtitle}</p>}</div><div><strong>INVOICE</strong><span>{invoice.id}</span></div></header>
      <div className="invoice-print-parties">
        <section><h2>Bill to</h2><strong>{clientName}</strong>{clientCompany && <span>{clientCompany}</span>}{client?.email && <span>{client.email}</span>}{client?.phone && <span>{client.phone}</span>}</section>
        <section><h2>Invoice details</h2><span>Invoice no.: <strong>{invoice.id}</strong></span><span>Invoice date: <strong>{formatDate(invoice.issueDate)}</strong></span><span>Due date: <strong>{formatDate(invoice.dueDate)}</strong></span>{invoice.project && <span>Project: <strong>{invoice.project}</strong></span>}</section>
      </div>
      <table className="print-invoice-table"><thead><tr><th>Description</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>{lineItems.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description}</td><td>{item.quantity ?? '—'}</td><td>{item.rate === null ? '—' : formatCurrency(item.rate)}</td><td>{formatCurrency(item.amount)}</td></tr>)}</tbody>
      </table>
      {!invoice.lineItems?.length && !invoice.description && <p className="invoice-data-note">This invoice record contains a total only; no line-item breakdown was provided.</p>}
      <dl className="invoice-print-totals"><div><dt>Subtotal</dt><dd>{hasSubtotal ? formatCurrency(subtotal) : 'Not recorded'}</dd></div>{discount > 0 && <div><dt>Discount</dt><dd>− {formatCurrency(discount)}</dd></div>}{tax > 0 && <div><dt>Tax</dt><dd>{formatCurrency(tax)}</dd></div>}<div className="invoice-print-total"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div><div><dt>Paid</dt><dd>{formatCurrency(paid)}</dd></div><div><dt>Outstanding balance</dt><dd>{formatCurrency(balance)}</dd></div></dl>
      {payments.length > 0 && <section className="invoice-payment-details"><h2>Payment details</h2><table className="print-invoice-table"><thead><tr><th>Date</th><th>Method</th><th>Status</th><th>Amount</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.date)}</td><td>{payment.method || '—'}</td><td>{payment.status || '—'}</td><td>{formatCurrency(payment.amount)}</td></tr>)}</tbody></table></section>}
    </article>
  </div>
}
