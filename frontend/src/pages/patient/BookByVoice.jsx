import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Square, Volume2, ArrowLeft, CheckCircle2, Stethoscope,
  CalendarDays, Clock, Sparkles, RotateCcw, Loader2, Languages, BadgeCheck, Info,
} from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { useI18n, LANGS } from '../../i18n/index.jsx'
import { appointmentsApi, tokensApi } from '../../api'
import { prettyTime, prettyDate, todayISO, clockIST } from '../../lib/format.js'
import { speak, stopSpeaking, ttsSupported } from '../../lib/voice.js'
import {
  canRecord, cloudVoiceAvailable, startRecording, transcribe, listenOnce,
  interpretChoice, interpretDate, interpretYesNo, speechCode, cloudTtsAvailable,
} from '../../lib/voiceAgent.js'
import { getCurrentPosition, travelMinutesBetween } from '../../lib/geo.js'

const STEPS = ['symptom', 'preference', 'particular', 'location', 'doctor', 'date', 'slot', 'confirm']

const SYMPTOM_SPECIALTIES = [
  { specialty: ['dentist', 'dental', 'orthodont', 'oral'], symptoms: ['tooth', 'teeth', 'gum', 'jaw', 'cavity', 'dental', 'toothache', 'tooth ache', 'pallu', 'పంటి', 'పళ్ళు', 'దంత', 'दांत', 'दाँत', 'मसूड़ा'] },
  { specialty: ['cardio', 'heart'], symptoms: ['chest pain', 'heart', 'palpitation', 'bp', 'blood pressure', 'cardiac', 'గుండె', 'ఛాతి', 'दिल', 'सीने'] },
  { specialty: ['dermat', 'skin'], symptoms: ['skin', 'rash', 'itch', 'pimple', 'acne', 'allergy', 'చర్మ', 'దద్దుర్లు', 'त्वचा', 'खुजली'] },
  { specialty: ['ortho', 'bone', 'joint'], symptoms: ['bone', 'joint', 'knee', 'back pain', 'fracture', 'leg pain', 'ఎముక', 'మోకాలి', 'हड्डी', 'जोड़'] },
  { specialty: ['ent', 'ear', 'nose', 'throat'], symptoms: ['ear', 'nose', 'throat', 'hearing', 'sinus', 'చెవి', 'ముక్కు', 'గొంతు', 'कान', 'नाक', 'गला'] },
  { specialty: ['pediatric', 'paediatric', 'child'], symptoms: ['child', 'baby', 'kid', 'children', 'పిల్ల', 'బాబు', 'बच्चा'] },
  { specialty: ['gynec', 'gynaec', 'obstetric'], symptoms: ['pregnancy', 'period', 'women', 'uterus', 'గర్భం', 'నెలసరి', 'प्रेगनेंसी', 'माहवारी'] },
  { specialty: ['ophthal', 'eye'], symptoms: ['eye', 'vision', 'sight', 'కన్ను', 'చూపు', 'आंख', 'नज़र'] },
  { specialty: ['general physician', 'general medicine', 'physician'], symptoms: ['fever', 'cough', 'cold', 'headache', 'stomach', 'vomit', 'diarrhea', 'జ్వరం', 'దగ్గు', 'కడుపు', 'बुखार', 'खांसी', 'पेट'] },
]

const norm = (value) => String(value || '').toLowerCase()

const locationOf = (affiliation, resolveHospital) => {
  const hospital = affiliation?.hospital_id ? resolveHospital(affiliation.hospital_id) : null
  return affiliation?.city || hospital?.city || ''
}

function rankDoctorsForSymptom(text, doctors, clinicNameOf) {
  const complaint = norm(text)
  if (!complaint.trim()) return []
  const matchedGroups = SYMPTOM_SPECIALTIES.filter((group) =>
    group.symptoms.some((word) => complaint.includes(norm(word))),
  )
  if (!matchedGroups.length) return []

  return doctors
    .map((doctor) => {
      const searchable = [doctor.name, doctor.specialization, doctor.qualification, clinicNameOf(doctor)].map(norm).join(' ')
      const score = matchedGroups.reduce((total, group) => (
        total + (group.specialty.some((word) => searchable.includes(norm(word))) ? 10 : 0)
      ), 0)
      return { doctor, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.doctor.name).localeCompare(String(b.doctor.name)))
    .map((item) => item.doctor)
}

function nextDays(n, t) {
  const out = []
  const base = new Date(`${todayISO()}T00:00:00`)
  for (let i = 0; i < n; i += 1) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = i === 0 ? t('pcommon.today') || 'Today'
      : i === 1 ? t('pcommon.tomorrow') || 'Tomorrow'
      : prettyDate(iso)
    out.push({ iso, label })
  }
  return out
}

function BookByVoice() {
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const { patient, doctorsById, affiliationsByDoctor, resolveHospital, loading: ctxLoading } = usePatientCtx()

  const [started, setStarted] = useState(false)
  const [step, setStep] = useState('symptom')
  const [phase, setPhase] = useState('idle') // idle | listening | thinking | speaking
  const [heard, setHeard] = useState('')
  const [hint, setHint] = useState('') // small helper line (e.g. "didn't catch that")
  const [cloud, setCloud] = useState(false)
  const [cloudTts, setCloudTts] = useState(false) // Cartesia voices available

  // Selections gathered across the flow.
  const [doctorShortlist, setDoctorShortlist] = useState([])
  const [symptomDoctors, setSymptomDoctors] = useState([])
  const [preferredDoctors, setPreferredDoctors] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [affiliationId, setAffiliationId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotTime, setSlotTime] = useState('')
  const [result, setResult] = useState(null) // { token_number, leave_by, doctorName }
  const [symptom, setSymptom] = useState('')

  const recRef = useRef(null)        // active MediaRecorder handle (cloud mode)
  const originRef = useRef(null)     // {lat,lng} captured quietly for leave-by

  const bookableDoctors = useMemo(
    () => Object.values(doctorsById).filter((d) => d.status === 'active' || d.is_available_today),
    [doctorsById],
  )
  const doctor = doctorId ? doctorsById[doctorId] : null
  const affiliations = doctorId ? affiliationsByDoctor[doctorId] || [] : []
  const affiliation = affiliations.find((a) => String(a.affiliation_id) === String(affiliationId)) || affiliations[0] || null
  const clinic = affiliation?.hospital_id ? resolveHospital(affiliation.hospital_id) : doctor ? resolveHospital(doctor.hospital_id) : null
  const destination = affiliation?.latitude != null && affiliation?.longitude != null
    ? { ...affiliation, latitude: affiliation.latitude, longitude: affiliation.longitude }
    : clinic
  const clinicNameOf = useCallback((d) => resolveHospital(d?.hospital_id)?.name || '', [resolveHospital])
  const affiliationsOf = useCallback((d) => affiliationsByDoctor[d?.doctor_id] || [], [affiliationsByDoctor])
  const doctorLocations = useCallback((d) => {
    const values = affiliationsOf(d).map((a) => locationOf(a, resolveHospital)).filter(Boolean)
    const hospitalCity = resolveHospital(d?.hospital_id)?.city
    if (hospitalCity) values.push(hospitalCity)
    return [...new Set(values)]
  }, [affiliationsOf, resolveHospital])
  const availableLocations = useMemo(() => {
    const source = preferredDoctors.length ? preferredDoctors : symptomDoctors
    return [...new Set(source.flatMap(doctorLocations))].sort((a, b) => a.localeCompare(b))
  }, [doctorLocations, preferredDoctors, symptomDoctors])
  const docLabel = useCallback((d) => {
    const clinicName = clinicNameOf(d)
    const city = doctorLocations(d)[0]
    return `${d.name} - ${d.specialization}${clinicName ? `, ${clinicName}` : ''}${city ? `, ${city}` : ''}`
  }, [clinicNameOf, doctorLocations])

  // Probe cloud voice once, and quietly try to get the patient's location so the
  // leave-by reminder can be computed (non-blocking; failure is fine).
  useEffect(() => {
    cloudVoiceAvailable().then(setCloud)
    cloudTtsAvailable().then(setCloudTts)
    getCurrentPosition().then((p) => { originRef.current = p }).catch(() => {})
    return () => stopSpeaking()
  }, [])

  // -- Speak a prompt in the chosen language. `speak()` prefers Cartesia and,
  //    for Telugu, never falls back to English/romanized browser narration.
  const say = useCallback(async (text) => {
    if (!text) return
    setPhase('speaking')
    await speak(text, speechCode(lang))
    setPhase('idle')
  }, [lang])

  // -- Capture one spoken reply, cloud (push-to-talk) or browser (auto-stop). --
  const captureSpeech = useCallback(async () => {
    stopSpeaking()
    setHint('')
    if (cloud && canRecord()) {
      // Push-to-talk: first call starts, second call (via the same button) stops.
      if (recRef.current) {
        const blob = await recRef.current.stop()
        recRef.current = null
        setPhase('thinking')
        try {
          return await transcribe(blob, lang)
        } catch {
          return ''
        }
      }
      try {
        recRef.current = await startRecording()
        setPhase('listening')
        return null // signal: recording started, await the second tap
      } catch {
        setHint(t('vbook.micDenied'))
        return ''
      }
    }
    // Browser fallback: one-shot recognition that stops on its own.
    setPhase('listening')
    const text = await listenOnce(lang)
    setPhase('thinking')
    return text
  }, [cloud, lang, t])

  // ---- Step handlers: each takes the transcript and advances the flow. ------
  const handleSymptom = useCallback(async (text) => {
    setSymptom(text)
    const options = bookableDoctors.map((d) => ({ id: String(d.doctor_id), label: docLabel(d) }))
    if (!options.length) { setHint(t('vbook.noDoctors')); setPhase('idle'); return }
    const symptomMatches = rankDoctorsForSymptom(text, bookableDoctors, clinicNameOf)
    if (symptomMatches.length) {
      setSymptomDoctors(symptomMatches)
      setPreferredDoctors(symptomMatches)
      setStep('preference')
      await say(t('vbook.askPreference'))
      return
    }
    const { id } = await interpretChoice(
      text, lang, options,
      'The text is the patient\'s complaint/symptom. Choose the doctor whose specialization best treats it; prefer a General Physician for general complaints.',
    )
    const matched = id ? bookableDoctors.find((d) => String(d.doctor_id) === id) : null
    if (!matched) { setHint(t('vbook.noDoctors')); setPhase('idle'); return }
    setSymptomDoctors([matched])
    setPreferredDoctors([matched])
    setStep('preference')
    await say(t('vbook.askPreference'))
  }, [bookableDoctors, clinicNameOf, docLabel, lang, say, t])

  const handlePreference = useCallback(async (text) => {
    const options = [
      { id: 'suitable', label: t('vbook.findSuitable') },
      { id: 'particular', label: t('vbook.particularDoctor') },
    ]
    const { id } = await interpretChoice(text, lang, options, 'Choose whether the patient wants a particular doctor or clinic, or wants us to find a suitable doctor.')
    if (!id) { setHint(t('vbook.didntCatch')); await say(t('vbook.askPreference')); return }
    if (id === 'particular') {
      setStep('particular')
      await say(t('vbook.askParticular'))
      return
    }
    setPreferredDoctors(symptomDoctors)
    setStep('location')
    await say(t('vbook.askLocation'))
  }, [lang, say, symptomDoctors, t])

  const handleParticular = useCallback(async (text) => {
    const wanted = norm(text).trim()
    const matches = symptomDoctors.filter((d) => {
      const hospital = resolveHospital(d.hospital_id)
      const terms = [d.name, hospital?.name, ...affiliationsOf(d).map((a) => a.name)]
        .map(norm).filter((term) => term.length >= 2)
      return terms.some((term) => wanted.includes(term) || term.includes(wanted))
    })
    setPreferredDoctors(matches.length ? matches : symptomDoctors)
    if (!matches.length) {
      setHint(t('vbook.noParticular'))
      await say(t('vbook.noParticular'))
    }
    setStep('location')
    await say(t('vbook.askLocation'))
  }, [affiliationsOf, resolveHospital, say, symptomDoctors, t])

  const handleLocation = useCallback(async (text) => {
    const source = preferredDoctors.length ? preferredDoctors : symptomDoctors
    const options = availableLocations.map((city) => ({ id: city, label: city }))
    const { id } = await interpretChoice(text, lang, options, 'Pick the city or locality where the patient wants the check-up.')
    const requested = id || text.trim()
    if (!requested) { setHint(t('vbook.didntCatch')); await say(t('vbook.askLocation')); return }
    setSelectedLocation(requested)
    const local = source.filter((d) => doctorLocations(d).some((city) => {
      const a = norm(city); const b = norm(requested)
      return a === b || a.includes(b) || b.includes(a)
    }))
    const shortlist = (local.length ? local : source).slice(0, 6)
    setDoctorShortlist(shortlist)
    setStep('doctor')
    if (!local.length) {
      setHint(t('vbook.noDoctorsInLocation', { location: requested }))
      await say(t('vbook.noDoctorsInLocation', { location: requested }))
    }
    await say(t('vbook.askDoctor'))
  }, [availableLocations, doctorLocations, lang, preferredDoctors, say, symptomDoctors, t])

  const selectDoctor = useCallback(async (id) => {
    setDoctorId(String(id))
    const doctorAffiliations = affiliationsByDoctor[id] || []
    const locationMatch = doctorAffiliations.find((a) => norm(locationOf(a, resolveHospital)) === norm(selectedLocation))
    const selectedAffiliation = locationMatch || doctorAffiliations[0]
    setAffiliationId(selectedAffiliation ? String(selectedAffiliation.affiliation_id) : '')
    setStep('date')
    await say(t('vbook.askDate'))
  }, [affiliationsByDoctor, resolveHospital, say, selectedLocation, t])

  const handleDoctor = useCallback(async (text) => {
    const options = doctorShortlist.map((d) => ({ id: String(d.doctor_id), label: docLabel(d) }))
    const { id } = await interpretChoice(text, lang, options, 'Pick the doctor the patient chose.')
    if (!id) { setHint(t('vbook.didntCatch')); await say(t('vbook.askDoctor')); return }
    await selectDoctor(id)
  }, [doctorShortlist, docLabel, lang, say, selectDoctor, t])

  const loadSlots = useCallback(async (iso) => {
    setPhase('thinking')
    try {
      const selectedAffiliationId = affiliationId || affiliations[0]?.affiliation_id
      const res = await appointmentsApi.availableSlots(doctorId, iso, selectedAffiliationId)
      const s = res?.slots || []
      setSlots(s)
      if (!s.length) {
        setHint(t('vbook.noSlots'))
        setStep('date')
        await say(t('vbook.noSlots'))
        return
      }
      setStep('slot')
      await say(t('vbook.askSlot'))
    } catch {
      setHint(t('vbook.noSlots'))
      setStep('date')
      await say(t('vbook.noSlots'))
    }
  }, [affiliationId, affiliations, doctorId, say, t])

  const handleDate = useCallback(async (text) => {
    const { value } = await interpretDate(text, lang)
    if (!value) { setHint(t('vbook.didntCatch')); await say(t('vbook.askDate')); return }
    setDate(value)
    await loadSlots(value)
  }, [lang, loadSlots, say, t])

  const handleSlot = useCallback(async (text) => {
    const options = slots.map((s) => ({ id: s.time, label: s.label || prettyTime(s.time) }))
    const { id } = await interpretChoice(text, lang, options, 'Pick the appointment time the patient chose.')
    if (!id) { setHint(t('vbook.didntCatch')); await say(t('vbook.askSlot')); return }
    setSlotTime(id)
    setStep('confirm')
    const details = { doctor: doctorsById[doctorId]?.name || '', date: prettyDate(date), time: prettyTime(id) }
    await say(t('vbook.confirm', details))
  }, [slots, lang, date, doctorId, doctorsById, say, t])

  const doBooking = useCallback(async () => {
    setStep('booking')
    setPhase('thinking')
    await say(t('vbook.booking'))
    try {
      const origin = originRef.current
      const travelMin = origin ? travelMinutesBetween(origin, destination) : null
      const appt = await appointmentsApi.book({
        doctor_id: Number(doctorId),
        affiliation_id: Number(affiliationId || affiliation?.affiliation_id),
        patient_id: patient.patient_id,
        appointment_date: date,
        slot_time: slotTime,
        appointment_type: 'regular',
        notes: symptom || 'Booked by voice assistant',
        source: 'app',
        origin_lat: origin?.lat ?? null,
        origin_lng: origin?.lng ?? null,
        origin_label: origin ? 'Voice booking location' : '',
        travel_minutes: travelMin,
      })
      let est = null
      try { est = await tokensApi.estimate({ appointment_id: appt.appointment_id }) } catch { /* token may lag */ }
      const leaveBy = est?.leave_by ? clockIST(est.leave_by) : ''
      const tokenNo = est?.token_number || est?.display_code || ''
      setResult({ tokenNo, leaveBy, doctorName: doctorsById[doctorId]?.name || '' })
      setStep('done')
      await say(leaveBy ? t('vbook.doneSpoken', { token: tokenNo, leave: leaveBy }) : t('vbook.doneTitle'))
    } catch {
      setHint(t('vbook.bookFailed'))
      setStep('confirm')
      await say(t('vbook.bookFailed'))
    }
  }, [affiliation, affiliationId, doctorId, patient, date, slotTime, symptom, destination, doctorsById, say, t])

  const handleConfirm = useCallback(async (text) => {
    const { value } = await interpretYesNo(text, lang)
    if (value === 'yes') return doBooking()
    if (value === 'no') {
      // Step back to the doctor list to try again.
      setSlotTime('')
      setStep('doctor')
      await say(t('vbook.askDoctor'))
      return
    }
    setHint(t('vbook.didntCatch'))
  }, [lang, doBooking, say, t])

  const dispatch = useCallback(async (text) => {
    if (text == null) return // recording just started (cloud push-to-talk)
    setHeard(text)
    if (!text) { setPhase('idle'); setHint(t('vbook.didntCatch')); return }
    if (step === 'symptom') return handleSymptom(text)
    if (step === 'preference') return handlePreference(text)
    if (step === 'particular') return handleParticular(text)
    if (step === 'location') return handleLocation(text)
    if (step === 'doctor') return handleDoctor(text)
    if (step === 'date') return handleDate(text)
    if (step === 'slot') return handleSlot(text)
    if (step === 'confirm') return handleConfirm(text)
  }, [step, handleSymptom, handlePreference, handleParticular, handleLocation, handleDoctor, handleDate, handleSlot, handleConfirm, t])

  // Mic button: in cloud push-to-talk mode the same button starts then stops.
  const onMic = useCallback(async () => {
    const text = await captureSpeech()
    await dispatch(text)
  }, [captureSpeech, dispatch])

  // Tapping an option is the always-available fallback to speaking.
  const pickPreference = (id) => async () => {
    setHeard('')
    if (id === 'particular') { setStep('particular'); await say(t('vbook.askParticular')); return }
    setPreferredDoctors(symptomDoctors); setStep('location'); await say(t('vbook.askLocation'))
  }
  const pickLocation = (city) => async () => { setHeard(''); await handleLocation(city) }
  const pickDoctor = (id) => async () => { setHeard(''); await selectDoctor(id) }
  const pickDate = (iso) => async () => { setHeard(''); setDate(iso); await loadSlots(iso) }
  const pickSlot = (time) => async () => {
    setHeard(''); setSlotTime(time); setStep('confirm')
    const details = { doctor: doctorsById[doctorId]?.name || '', date: prettyDate(date), time: prettyTime(time) }
    await say(t('vbook.confirm', details))
  }

  const begin = async () => {
    setStarted(true)
    setStep('symptom')
    await say(t('vbook.askSymptom'))
  }

  const restart = () => {
    setStarted(false); setStep('symptom'); setHeard(''); setHint(''); setResult(null)
    setDoctorId(''); setAffiliationId(''); setDate(''); setSlots([]); setSlotTime(''); setDoctorShortlist([])
    setSymptomDoctors([]); setPreferredDoctors([]); setSelectedLocation(''); setSymptom('')
  }

  const replay = () => {
    const prompt = {
      symptom: 'vbook.askSymptom', preference: 'vbook.askPreference', particular: 'vbook.askParticular',
      location: 'vbook.askLocation', doctor: 'vbook.askDoctor', date: 'vbook.askDate',
      slot: 'vbook.askSlot',
    }[step]
    if (step === 'confirm') {
      const details = { doctor: doctorsById[doctorId]?.name || '', date: prettyDate(date), time: prettyTime(slotTime) }
      say(t('vbook.confirm', details))
    } else if (prompt) say(t(prompt))
  }

  if (ctxLoading) return <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>

  const listening = phase === 'listening'
  const busy = phase === 'thinking' || step === 'booking'
  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('vbook.title')} subtitle={t('vbook.subtitle')}>
        <button
          type="button"
          onClick={() => navigate('/patient-dashboard')}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> {t('ppage.backToDashboard')}
        </button>
      </PageHeading>

      <Card className="p-6">
        {/* Language + voice-quality badges */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-slate-400" />
            {Object.entries(LANGS).map(([code, { label }]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors ${
                  lang === code ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold ${
            cloud || cloudTts ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <BadgeCheck className="h-3.5 w-3.5" />
            {cloud || cloudTts ? t('vbook.voiceHigh') : t('vbook.voiceOnDevice')}
          </span>
        </div>

        {/* Telugu voice usage instructions — shown only when Telugu is selected. */}
        {lang === 'te' && (
          <div className="mb-5 rounded-2xl border border-brand-blue/15 bg-brand-blueLight/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-brand-navy">
              <Info className="h-4 w-4 text-brand-blue" /> {t('vbook.guideTitle')}
            </p>
            <ol className="list-decimal space-y-1.5 pl-6 text-[13.5px] leading-relaxed text-slate-600">
              <li>{t('vbook.guideStep1')}</li>
              <li>{t('vbook.guideStep2')}</li>
              <li>{t('vbook.guideStep3')}</li>
              <li>{t('vbook.guideStep4')}</li>
            </ol>
          </div>
        )}

        {!started ? (
          // ---- Intro / start ----
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
              <Sparkles className="h-10 w-10" />
            </span>
            <div>
              <p className="text-[20px] font-extrabold text-brand-navy">{t('vbook.cardTitle')}</p>
              <p className="mt-1 text-[14px] text-slate-500">{t('vbook.cardSub')}</p>
            </div>
            <button
              type="button"
              onClick={begin}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-blue px-8 py-4 text-[16px] font-extrabold text-white shadow-[0_16px_35px_rgba(37,99,235,0.28)] hover:bg-brand-blueDark"
            >
              <Mic className="h-5 w-5" /> {t('vbook.start')}
            </button>
            {!ttsSupported() && (
              <p className="text-[12px] text-amber-600">{t('auth.voiceUnsupported')}</p>
            )}
          </div>
        ) : step === 'done' ? (
          // ---- Success ----
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
            </span>
            <p className="text-[22px] font-extrabold text-brand-navy">{t('vbook.doneTitle')}</p>
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 px-6 py-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-green-600">{t('vbook.tokenNo')}</p>
                <p className="text-[34px] font-black leading-tight text-green-700">{result?.tokenNo || '—'}</p>
              </div>
              {result?.leaveBy && (
                <div className="rounded-2xl border border-brand-blue/15 bg-brand-blueLight/50 px-6 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-brand-blue">{t('vbook.leaveBy')}</p>
                  <p className="text-[34px] font-black leading-tight text-brand-navy">{result.leaveBy}</p>
                </div>
              )}
            </div>
            <p className="text-[14px] text-slate-500">{result?.doctorName} · {prettyDate(date)} · {prettyTime(slotTime)}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigate('/patient-dashboard/appointments')} className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-brand-blueDark">
                {t('vbook.viewAppts')}
              </button>
              <button onClick={restart} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-brand-navy hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> {t('vbook.bookAnother')}
              </button>
            </div>
          </div>
        ) : (
          // ---- Active conversation ----
          <div className="flex flex-col gap-5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
              {t('vbook.stepOf', { n: stepIndex + 1, total: STEPS.length })}
            </p>

            {/* Assistant prompt */}
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
                <Volume2 className="h-4.5 w-4.5" />
              </span>
              <p className="text-[15px] font-semibold leading-relaxed text-brand-navy">{currentPromptText(step, t, { doctorsById, doctorId, date, slotTime, prettyDate, prettyTime })}</p>
            </div>

            {heard && (
              <p className="text-[13px] text-slate-500">
                <span className="font-bold">{t('vbook.youSaid')}:</span> “{heard}”
              </p>
            )}
            {hint && <p className="text-[13px] font-semibold text-amber-600">{hint}</p>}

            {/* Big mic button */}
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                type="button"
                onClick={onMic}
                disabled={busy || phase === 'speaking'}
                className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:opacity-50 ${
                  listening ? 'bg-red-500 animate-pulse' : 'bg-brand-blue hover:bg-brand-blueDark hover:scale-105'
                }`}
              >
                {busy ? <Loader2 className="h-10 w-10 animate-spin" />
                  : listening ? <Square className="h-9 w-9" />
                  : <Mic className="h-10 w-10" />}
                {listening && <span className="absolute -inset-1.5 animate-ping rounded-full border-2 border-red-300" />}
              </button>
              <p className="text-[14px] font-bold text-brand-navy">
                {busy ? t('vbook.thinking')
                  : listening ? (cloud && canRecord() ? t('vbook.tapToStop') : t('vbook.listening'))
                  : t('vbook.tapToSpeak')}
              </p>
              <button type="button" onClick={replay} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-blue hover:underline">
                <Volume2 className="h-3.5 w-3.5" /> {t('vbook.repeat')}
              </button>
            </div>

            {/* Tappable options (fallback + accessibility) */}
            <Options
              step={step}
              t={t}
              doctorShortlist={doctorShortlist}
              locations={availableLocations}
              docLabel={docLabel}
              days={nextDays(5, t)}
              slots={slots}
              pickPreference={pickPreference}
              pickLocation={pickLocation}
              pickDoctor={pickDoctor}
              pickDate={pickDate}
              pickSlot={pickSlot}
              onConfirmYes={doBooking}
              onConfirmNo={async () => { setSlotTime(''); setStep('doctor'); await say(t('vbook.askDoctor')) }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

// The prompt text shown for the current step (kept out of JSX for clarity).
function currentPromptText(step, t, ctx) {
  if (step === 'symptom') return t('vbook.askSymptom')
  if (step === 'preference') return t('vbook.askPreference')
  if (step === 'particular') return t('vbook.askParticular')
  if (step === 'location') return t('vbook.askLocation')
  if (step === 'doctor') return t('vbook.askDoctor')
  if (step === 'date') return t('vbook.askDate')
  if (step === 'slot') return t('vbook.askSlot')
  if (step === 'confirm') {
    return t('vbook.confirm', {
      doctor: ctx.doctorsById[ctx.doctorId]?.name || '',
      date: ctx.prettyDate(ctx.date),
      time: ctx.prettyTime(ctx.slotTime),
    })
  }
  if (step === 'booking') return t('vbook.booking')
  return ''
}

function Options({ step, t, doctorShortlist, locations, docLabel, days, slots, pickPreference, pickLocation, pickDoctor, pickDate, pickSlot, onConfirmYes, onConfirmNo }) {
  const grid = 'grid grid-cols-1 gap-2 sm:grid-cols-2'
  if (step === 'preference') {
    return (
      <div>
        <p className='mb-2 text-[12.5px] font-semibold text-slate-400'>{t('vbook.orTap')}</p>
        <div className={grid}>
          <button onClick={pickPreference('suitable')} className='rounded-xl border border-slate-200 bg-white p-3 text-left text-[14px] font-bold text-brand-navy'>
            {t('vbook.findSuitable')}
          </button>
          <button onClick={pickPreference('particular')} className='rounded-xl border border-slate-200 bg-white p-3 text-left text-[14px] font-bold text-brand-navy'>
            {t('vbook.particularDoctor')}
          </button>
        </div>
      </div>
    )
  }
  if (step === 'location' && locations.length) {
    return (
      <div>
        <p className='mb-2 text-[12.5px] font-semibold text-slate-400'>{t('vbook.orTap')}</p>
        <div className='flex flex-wrap gap-2'>
          {locations.map((city) => (
            <button key={city} onClick={pickLocation(city)} className='rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-brand-navy'>
              {city}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step === 'doctor' && doctorShortlist.length) {
    return (
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-slate-400">{t('vbook.orTap')}</p>
        <div className={grid}>
          {doctorShortlist.map((d, i) => (
            <button key={d.doctor_id} onClick={pickDoctor(d.doctor_id)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-blue/40 hover:bg-brand-blue/5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-[13px] font-black text-brand-blue">{i + 1}</span>
              <span className="flex items-center gap-2 text-[14px] font-bold text-brand-navy"><Stethoscope className="h-4 w-4 text-slate-400" />{docLabel(d)}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step === 'date') {
    return (
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-slate-400">{t('vbook.orTap')}</p>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button key={d.iso} onClick={pickDate(d.iso)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-brand-navy hover:border-brand-blue/40 hover:bg-brand-blue/5">
              <CalendarDays className="h-4 w-4 text-slate-400" />{d.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step === 'slot' && slots.length) {
    return (
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-slate-400">{t('vbook.orTap')}</p>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <button key={s.time} onClick={pickSlot(s.time)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-brand-navy hover:border-brand-blue/40 hover:bg-brand-blue/5">
              <Clock className="h-4 w-4 text-slate-400" />{s.label || prettyTime(s.time)}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step === 'confirm') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={onConfirmYes} className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-[15px] font-bold text-white hover:opacity-90">
          <CheckCircle2 className="h-5 w-5" /> {t('pcommon.confirm')}
        </button>
        <button onClick={onConfirmNo} className="rounded-xl border border-slate-200 px-6 py-3 text-[15px] font-semibold text-brand-navy hover:bg-slate-50">
          {t('pcommon.cancel')}
        </button>
      </div>
    )
  }
  return null
}

export default BookByVoice
