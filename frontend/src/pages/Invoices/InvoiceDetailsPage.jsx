import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFor } from '../../api/resourcesApi'
import { useApp } from '../../context/useApp'
import { PageHeader } from '../../components/common/UI'
import { readPreferences } from '../../services/storageService'
import { getInvoicePaid } from '../../utils/formatters'
import { useAuth } from '../../auth/useAuth'
import { canAccessRecord } from '../../services/permissionsService'
import SalesDocument from '../SalesFinance/SalesDocument'

export default function InvoiceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useApp()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [client, setClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const preferences = useMemo(() => readPreferences(), [])

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

  useEffect(() => {
    if (!printing) return undefined
    const finish = () => setPrinting(false)
    window.addEventListener('afterprint', finish)
    const timer = window.setTimeout(() => window.print(), 80)
    return () => { window.removeEventListener('afterprint', finish); window.clearTimeout(timer) }
  }, [printing])

  const paid = invoice ? getInvoicePaid(invoice.id, payments) : 0
  const total = Number(invoice?.total ?? invoice?.amount) || 0
  const balance = Math.max(0, total - paid)

  if (loading) return <div className="loading-screen"><span className="spinner" />Loading invoice…</div>
  if (!invoice) return <div className="page"><div className="sales-module-empty">Invoice record not found.</div></div>

  return <div className={`page sales-document-page invoice-document-page${printing ? ' is-printing' : ''}`}>
    <PageHeader title={`Invoice ${invoice.id}`} description={invoice.project || 'Invoice details'} />
    <SalesDocument kind="Invoice" record={invoice} client={client} preferences={preferences}
      paid={paid} balance={balance} payments={payments}
      onBack={() => navigate('/invoices')} onPrint={() => setPrinting(true)} />
  </div>
}
