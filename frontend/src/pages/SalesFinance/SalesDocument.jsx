import { formatCurrency } from '../../utils/formatters'
import { amountInWords } from '../../utils/amountInWords'
import './salesDocuments.css'

function formatDocumentDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year || !month || !day) return '—'
  return `${day}/${month}/${year}`
}

function PartyDetails({ title, name, company, address, gstin, email, phone }) {
  return <section className="sales-doc-party">
    <h2>{title}</h2>
    <strong>{name || company || '—'}</strong>
    {company && company !== name && <span>{company}</span>}
    {address && <span>{address}</span>}
    {gstin && <span>GSTIN: {gstin}</span>}
    {email && <span>{email}</span>}
    {phone && <span>{phone}</span>}
  </section>
}

function CompanyBrand({ name }) {
  return <div className="sales-doc-company">
    <div className="sales-doc-brand" role="img" aria-label={`${name} logo`}>D</div>
  </div>
}

export default function SalesDocument({
  kind, record, client, preferences = {}, onPrint, onBack, onEdit, canEdit = false,
  paid = 0, balance = 0, payments = [],
}) {
  const isWorkOrder = kind === 'Work Order'
  const items = record.items?.length ? record.items
    : record.lineItems?.length ? record.lineItems
      : record.description && record.quantity !== undefined && record.rate !== undefined
        ? [{ description: record.description, quantity: record.quantity, rate: record.rate }]
        : []
  const subtotal = Number(record.subtotal ?? items.reduce((sum, item) =>
    sum + Number(item.amount ?? Number(item.quantity || 0) * Number(item.rate || 0)), 0))
  const discount = Number(record.discount) || 0
  const taxable = Number(record.taxableValue ?? Math.max(0, subtotal - discount))
  const sgst = Number(record.sgstAmount) || taxable * (Number(record.sgstRate) || 0) / 100
  const cgst = Number(record.cgstAmount) || taxable * (Number(record.cgstRate) || 0) / 100
  const tax = Number(record.tax ?? sgst + cgst)
  const total = Number(record.total ?? record.amount ?? Math.max(0, taxable + tax))
  const clientDetails = {
    name: record.billingName || client?.name || record.client,
    company: client?.company || record.client,
    address: record.billingAddress || client?.address,
    gstin: record.customerGstin || client?.gstin,
    email: record.contactEmail || client?.email,
    phone: record.contactPhone || client?.phone,
  }
  const companyDetails = {
    name: preferences.companyName || 'Design Blocks',
    subtitle: preferences.subtitle,
    address: record.companyAddress || preferences.companyAddress,
    gstin: record.companyGstin || preferences.companyGstin || preferences.gstin,
    bankDetails: record.bankDetails || preferences.bankDetails,
  }
  const number = record.number || record.id
  const date = record.issueDate || record.createdAt
  const terms = record.terms || preferences.documentTerms
  const hasNoItemDetails = !items.length && !isWorkOrder

  return <section className="sales-document-preview">
    <div className="sales-doc-actions no-print">
      {onBack && <button type="button" className="sales-doc-button secondary" onClick={onBack}>Back</button>}
      {canEdit && onEdit && <button type="button" className="sales-doc-button secondary" onClick={onEdit}>Edit</button>}
      {onPrint && <button type="button" className="sales-doc-button primary" onClick={onPrint}>Print {kind}</button>}
    </div>
    <article className={`sales-document-sheet${isWorkOrder ? ' sales-work-order-sheet' : ''}`}>
      <div className="sales-doc-heading-grid">
        <div className="sales-doc-heading-left">
          <h1>{kind}</h1>
          <PartyDetails title="Bill to:" {...clientDetails} />
        </div>
        <div className="sales-doc-heading-right">
          <div className="sales-doc-company-info">
            <div className="sales-doc-company-copy">
              {companyDetails.gstin && <p><strong>GSTIN:</strong> {companyDetails.gstin}</p>}
              <p className="sales-doc-company-name">{companyDetails.name}</p>
              {companyDetails.address && <p><strong>Address:</strong><br />{companyDetails.address}</p>}
            </div>
            <CompanyBrand name={companyDetails.name} />
          </div>
          <div className="sales-doc-meta">
            <strong>{kind} No: {number || 'Draft'}</strong>
            <span>{kind === 'Invoice' ? 'Invoice Date' : 'Date'}: {formatDocumentDate(date)}</span>
            {record.dueDate && <span>Due Date: {formatDocumentDate(record.dueDate)}</span>}
            {record.validUntil && <span>Valid Until: {formatDocumentDate(record.validUntil)}</span>}
            {record.quotationId && <span>Quotation: {record.quotationId}</span>}
          </div>
        </div>
      </div>

      {isWorkOrder ? <div className="sales-doc-work-details">
        <div className="sales-doc-work-title">{record.project || 'Work order'}</div>
        {record.status && <p><strong>Status:</strong> {record.status}</p>}
        {(record.startDate || record.deadline || record.timeline) && <section>
          <h2>Project dates</h2>
          <p>{[record.startDate && `Start: ${formatDocumentDate(record.startDate)}`, record.deadline && `Target completion: ${formatDocumentDate(record.deadline)}`, record.timeline].filter(Boolean).join(' · ')}</p>
        </section>}
        <section><h2>Scope of work</h2><p>{record.scope || record.description || 'Scope details have not been entered.'}</p></section>
        {record.deliverables && <section><h2>Deliverables</h2><p>{record.deliverables}</p></section>}
        {record.paymentMilestones && <section><h2>Payment milestones</h2><p>{record.paymentMilestones}</p></section>}
      </div> : <>
        <table className="sales-doc-table">
          <thead><tr><th>Item</th><th>Description</th><th>Quantity</th><th>Unit Price (Rs.)</th><th>Total Price (Rs.)</th></tr></thead>
          <tbody>
            {items.length ? items.map((item, index) => <tr key={`${item.id || item.description}-${index}`}>
              <td>{index + 1}</td><td>{item.description || '—'}</td><td>{item.quantity ?? '—'}</td>
              <td>{item.rate === undefined ? '—' : formatCurrency(item.rate)}</td>
              <td>{formatCurrency(item.amount ?? Number(item.quantity || 0) * Number(item.rate || 0))}</td>
            </tr>) : <tr><td>1</td><td>{hasNoItemDetails ? 'Itemized details not recorded' : record.title || '—'}</td><td>—</td><td>—</td><td>{formatCurrency(total)}</td></tr>}
            <tr className="sales-doc-total-row"><td colSpan="3"></td><th>Taxable Value</th><td>{formatCurrency(taxable || total)}</td></tr>
            {record.gstEnabled && record.sgstEnabled && <tr className="sales-doc-tax-row"><td colSpan="3"></td><th>SGST ({Number(record.sgstRate) || 0}%)</th><td>{formatCurrency(sgst)}</td></tr>}
            {record.gstEnabled && record.cgstEnabled && <tr className="sales-doc-tax-row"><td colSpan="3"></td><th>CGST ({Number(record.cgstRate) || 0}%)</th><td>{formatCurrency(cgst)}</td></tr>}
            {discount > 0 && <tr className="sales-doc-tax-row"><td colSpan="3"></td><th>Discount</th><td>− {formatCurrency(discount)}</td></tr>}
            <tr className="sales-doc-total-row"><td colSpan="3"></td><th>Total Price</th><td>{formatCurrency(total)}</td></tr>
            {kind === 'Invoice' && <><tr className="sales-doc-tax-row"><td colSpan="3"></td><th>Amount Paid</th><td>{formatCurrency(paid)}</td></tr>
              <tr className="sales-doc-total-row"><td colSpan="3"></td><th>Balance Due</th><td>{formatCurrency(balance)}</td></tr></>}
          </tbody>
        </table>
        <div className="sales-doc-words"><strong>In Words:</strong> {amountInWords(total)}</div>
        {kind === 'Invoice' && payments.length > 0 && <section className="sales-doc-payment-details">
          <h2>Payment details</h2>{payments.map((payment) => <p key={payment.id}>
            {formatDocumentDate(payment.date)} · {payment.method || 'Payment'} · {formatCurrency(payment.amount)}
            {payment.reference ? ` · ${payment.reference}` : ''}
          </p>)}
        </section>}
      </>}

      {companyDetails.bankDetails && <div className="sales-doc-bank-sign">
        <section className="sales-doc-bank"><strong>BANK DETAILS:</strong><p>{companyDetails.bankDetails}</p></section>
        <div className="sales-doc-sign-off"><strong className="sales-doc-for">For {companyDetails.name}</strong>
          {isWorkOrder && <span className="sales-doc-acceptance">Client acceptance / signature</span>}
        </div>
        {!isWorkOrder && <div className="sales-doc-thanks">Thank You</div>}
      </div>}
      {!companyDetails.bankDetails && <div className="sales-doc-signature">
        <strong>For {companyDetails.name}</strong>
        {isWorkOrder && <span className="sales-doc-acceptance">Client acceptance / signature</span>}
        {!isWorkOrder && <span>Thank You</span>}
      </div>}
      {terms && <section className="sales-doc-terms"><h2>Terms and Conditions.</h2><p>{terms}</p></section>}
      <p className="sales-doc-note">Demo document only. Not a tax invoice, legal agreement, or proof of payment.</p>
    </article>
  </section>
}
