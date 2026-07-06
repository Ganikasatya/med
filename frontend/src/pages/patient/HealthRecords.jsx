import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, ScanLine, Eye, Upload, ShieldCheck, AlertCircle, HeartPulse } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { Banner } from '../../components/common/FormControls.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { patientsApi, fileUrl } from '../../api'
import { VitalsView } from '../../components/patient/VitalsPanel.jsx'
import { prettyDate } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.jsx'

const SEVERITY_TONE = {
  severe: 'bg-red-50 text-red-600',
  moderate: 'bg-amber-50 text-amber-600',
  mild: 'bg-yellow-50 text-yellow-700',
}

/** Health records — conditions, allergies and uploaded documents from the API. */
function HealthRecords() {
  const { t } = useI18n()
  const { patient } = usePatientCtx()
  const [docs, setDocs] = useState([])
  const [conditions, setConditions] = useState([])
  const [allergies, setAllergies] = useState([])
  const [vitals, setVitals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    if (!patient) return
    setLoading(true)
    try {
      const [d, h, a, v] = await Promise.all([
        patientsApi.documents(patient.patient_id).catch(() => []),
        patientsApi.medicalHistory(patient.patient_id).catch(() => []),
        patientsApi.allergies(patient.patient_id).catch(() => []),
        patientsApi.vitals(patient.patient_id).catch(() => []),
      ])
      setDocs(d || [])
      setConditions(h || [])
      setAllergies(a || [])
      setVitals(v || [])
    } finally {
      setLoading(false)
    }
  }, [patient])

  useEffect(() => {
    load()
  }, [load])

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !patient) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('patient_id', patient.patient_id)
      fd.append('document_type', 'report')
      fd.append('file', file)
      await patientsApi.uploadDocument(fd)
      await load()
    } catch (err) {
      setError(err.message || t('ppage.uploadFailed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.hrTitle')} subtitle={t('ppage.hrSubtitle')}>
        <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />
        <ToolButton icon={Upload} tone="primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? t('ppage.uploading') : t('ppage.uploadRecord')}
        </ToolButton>
      </PageHeading>

      {error && <Banner type="error">{error}</Banner>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Documents */}
        <Card className="p-5">
          <h3 className="mb-3 text-[16px] font-bold text-brand-navy">{t('ppage.medicalDocs')}</h3>
          {loading ? (
            <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>
          ) : docs.length === 0 ? (
            <p className="py-4 text-[13.5px] text-slate-400">{t('ppage.noDocsUploaded')}</p>
          ) : (
            <ul className="space-y-3">
              {docs.map((d) => {
                const isScan = /scan|x-?ray|mri|ct/i.test(d.document_type)
                const Icon = isScan ? ScanLine : FileText
                return (
                  <li key={d.document_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[14px] font-bold text-brand-navy">{d.file_name}</p>
                      <p className="truncate text-[12px] text-slate-400">
                        {d.document_type}{d.file_size_kb ? ` · ${d.file_size_kb} KB` : ''}
                      </p>
                    </div>
                    <a
                      href={fileUrl(d.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-brand-blueLight/40"
                    >
                      <Eye className="h-3.5 w-3.5" /> {t('pcommon.view')}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Vitals + conditions + allergies */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
              <HeartPulse className="h-4 w-4 text-rose-500" /> Latest Vitals
            </h3>
            <VitalsView vitals={vitals} />
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
              <HeartPulse className="h-4 w-4 text-brand-blue" /> {t('ppage.ongoingConditions')}
            </h3>
            {conditions.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">{t('ppage.noConditions')}</p>
            ) : (
              <ul className="space-y-2">
                {conditions.map((c) => (
                  <li key={c.history_id} className="rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] font-medium text-brand-navy">
                    {c.condition}
                    {c.is_chronic && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">{t('ppage.chronic')}</span>}
                    {c.diagnosed_date && <span className="ml-2 text-[11px] text-slate-400">{prettyDate(c.diagnosed_date)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
              <AlertCircle className="h-4 w-4 text-red-500" /> {t('ppage.allergies')}
            </h3>
            {allergies.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">{t('ppage.noAllergies')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allergies.map((a) => (
                  <span
                    key={a.allergy_id}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${SEVERITY_TONE[a.severity?.toLowerCase()] || 'bg-red-50 text-red-600'}`}
                    title={[a.allergy_type, a.severity, a.reaction].filter(Boolean).join(' · ')}
                  >
                    {a.allergen}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-[12.5px] text-green-700">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {t('ppage.dataSecure')}
      </div>
    </div>
  )
}

export default HealthRecords
