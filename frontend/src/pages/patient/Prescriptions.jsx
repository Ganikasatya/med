import { useEffect, useRef, useState } from 'react'
import { FileText, FlaskConical, Eye, Download, Upload, ShieldCheck, X, Pill } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { prescriptionsApi, patientsApi, fileUrl } from '../../api'
import { useI18n } from '../../i18n/index.jsx'

const TAB_KEYS = {
  All: 'ppage.tabAll',
  Prescriptions: 'ppage.tabPrescriptions',
  Reports: 'ppage.tabReports',
  'Lab Results': 'ppage.tabLabResults',
}
const TABS = ['All', 'Prescriptions', 'Reports', 'Lab Results']

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

// Map an uploaded document_type → one of our display tabs.
const DOC_TYPE_TAB = { lab_report: 'Lab Results', scan: 'Reports', prescription: 'Prescriptions' }

/** Detail modal for a single prescription (diagnosis + medicines + advice). */
function RxModal({ rx, onClose, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-[17px] font-bold text-brand-navy">{rx.doctor_name || 'Prescription'}</h3>
            <p className="text-[12px] text-slate-400">
              {[rx.doctor_specialty, rx.hospital_name].filter(Boolean).join(' · ')} · {fmtDate(rx.created_at)}
            </p>
            {rx.family_member_name && (
              <span className="mt-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-600">For {rx.family_member_name}</span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {rx.diagnosis && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diagnosis</p>
            <p className="text-[14px] text-brand-navy">{rx.diagnosis}</p>
          </div>
        )}

        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Medicines</p>
        <ul className="space-y-2">
          {(rx.items || []).map((it) => (
            <li key={it.item_id} className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue"><Pill className="h-4 w-4" /></span>
              <div className="leading-tight">
                <p className="text-[14px] font-bold text-brand-navy">{it.drug_name} {it.dosage && <span className="font-normal text-slate-500">· {it.dosage}</span>}</p>
                <p className="text-[12px] text-slate-500">{[it.frequency, it.duration].filter(Boolean).join(' · ')}</p>
                {it.instructions && <p className="text-[12px] text-slate-400">{it.instructions}</p>}
              </div>
            </li>
          ))}
          {(rx.items || []).length === 0 && <li className="text-[13px] text-slate-400">No medicines listed.</li>}
        </ul>

        {rx.advice && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Advice</p>
            <p className="text-[14px] text-brand-navy">{rx.advice}</p>
          </div>
        )}
        {rx.follow_up_date && (
          <p className="mt-3 rounded-xl bg-brand-blueLight/40 px-3 py-2 text-[13px] font-semibold text-brand-blue">
            Follow-up: {fmtDate(rx.follow_up_date)}
          </p>
        )}
      </div>
    </div>
  )
}

/** Health records & prescriptions, filterable by type. */
function Prescriptions() {
  const { t } = useI18n()
  const [tab, setTab] = useState('All')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [active, setActive] = useState(null)     // prescription open in the modal
  const [me, setMe] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const patient = await patientsApi.me()
      setMe(patient)
      const [rxs, docs] = await Promise.all([
        prescriptionsApi.list(),
        patient ? patientsApi.documents(patient.patient_id) : Promise.resolve([]),
      ])
      const rxItems = rxs.map((r) => ({
        key: `rx-${r.prescription_id}`,
        kind: 'rx',
        type: 'Prescriptions',
        title: r.doctor_name || 'Prescription',
        sub: [r.doctor_specialty, r.hospital_name].filter(Boolean).join(' · ') || 'Prescription',
        forMember: r.family_member_name || null,
        date: r.created_at,
        rx: r,
      }))
      const docItems = (docs || []).map((d) => ({
        key: `doc-${d.document_id}`,
        kind: 'lab',
        type: DOC_TYPE_TAB[d.document_type] || 'Reports',
        title: d.file_name || 'Document',
        sub: (d.document_type || 'document').replace('_', ' '),
        date: d.created_at,
        url: d.file_url,
      }))
      setItems([...rxItems, ...docItems].sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (e) {
      setErr(e.message || 'Could not load records')
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !me) return
    setUploading(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('patient_id', me.patient_id)
      fd.append('document_type', 'lab_report')
      fd.append('file', file)
      await patientsApi.uploadDocument(fd)
      await load()
    } catch (e2) {
      setErr(e2.message || 'Upload failed')
    }
    setUploading(false)
  }

  const shown = tab === 'All' ? items : items.filter((p) => p.type === tab)

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.rxTitle')} subtitle={t('ppage.rxSubtitle')}>
        <input ref={fileRef} type="file" className="hidden" onChange={onUpload}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic" />
        <ToolButton icon={Upload} tone="primary" onClick={() => fileRef.current?.click()} disabled={uploading || !me}>
          {uploading ? '…' : t('ppage.uploadNew')}
        </ToolButton>
      </PageHeading>

      <Card className="p-5">
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100">
          {TABS.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`-mb-px border-b-2 px-3 pb-2 text-[13px] font-semibold transition-colors ${
                tab === tabName ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-brand-navy'
              }`}
            >
              {t(TAB_KEYS[tabName] || 'pcommon.noData')}
            </button>
          ))}
        </div>

        {err && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-600">{err}</p>}

        {loading ? (
          <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {shown.map((p) => {
              const Icon = p.kind === 'lab' ? FlaskConical : FileText
              return (
                <li key={p.key} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="flex items-center gap-2 truncate text-[14px] font-bold text-brand-navy">
                      {p.title}
                      {p.forMember && (
                        <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">For {p.forMember}</span>
                      )}
                    </p>
                    <p className="truncate text-[12px] text-slate-400">{p.sub} · {TAB_KEYS[p.type] ? t(TAB_KEYS[p.type]) : p.type}</p>
                  </div>
                  <span className="hidden text-[12px] text-slate-400 sm:block">{fmtDate(p.date)}</span>
                  <div className="flex items-center gap-2">
                    {p.kind === 'rx' ? (
                      <button onClick={() => setActive(p.rx)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
                        <Eye className="h-3.5 w-3.5" /> {t('pcommon.view')}
                      </button>
                    ) : (
                      <>
                        <a href={fileUrl(p.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
                          <Eye className="h-3.5 w-3.5" /> {t('pcommon.view')}
                        </a>
                        <a href={fileUrl(p.url)} download className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                          <Download className="h-3.5 w-3.5" /> {t('pcommon.download')}
                        </a>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
            {shown.length === 0 && (
              <li className="py-8 text-center text-[13px] text-slate-400">{t('ppage.noDocsCategory')}</li>
            )}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-[12.5px] text-green-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {t('ppage.dataSecure')}
        </div>
      </Card>

      {active && <RxModal rx={active} onClose={() => setActive(null)} t={t} />}
    </div>
  )
}

export default Prescriptions
