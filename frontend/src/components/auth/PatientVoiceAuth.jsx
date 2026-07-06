import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ShieldCheck, User, MapPin, Fingerprint, Mic, ArrowLeft, ArrowDown, Volume2, Sparkles, Square } from 'lucide-react'
import { Banner } from '../common/FormControls.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useI18n, LANGS } from '../../i18n/index.jsx'
import { speak, listen, stopSpeaking, speakTurn, parseDigits, parseName, sttSupported } from '../../lib/voice.js'
import { canRecord, cloudVoiceAvailable, startRecording, transcribe } from '../../lib/voiceAgent.js'

const mobileRe = /^\d{10}$/

/** Input with a mic button that speaks the prompt then captures a spoken answer.
 *  When `active` (driven by the guided walkthrough) it shows a pulsing arrow +
 *  bubble pointing at the field and reflects the guide's speak/listen phase. */
function VoiceField({ icon: Icon, label, prompt, value, onChange, kind = 'text', placeholder, maxLength, onVoiceError, active = false, bubble, phase = null }) {
  const { speech, t } = useI18n()
  const [listening, setListening] = useState(false)

  const handleMic = async () => {
    if (!sttSupported()) {
      onVoiceError?.(t('auth.voiceUnsupported'))
      return
    }
    setListening(true)
    try {
      await speak(prompt, speech)
      const transcript = await listen(speech)
      const parsed =
        kind === 'digits' ? parseDigits(transcript).slice(0, maxLength || 32)
        : kind === 'name' ? parseName(transcript)
        : transcript.trim()
      if (parsed) onChange(parsed)
    } catch {
      onVoiceError?.(t('auth.voiceUnsupported'))
    } finally {
      setListening(false)
    }
  }

  const micActive = listening || phase === 'listening'

  return (
    <div className="relative">
      {/* Guide arrow + bubble pointing at this field */}
      <AnimatePresence>
        {active && bubble && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-1.5 flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
              <Volume2 className="h-3.5 w-3.5" />
              {bubble}
            </span>
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
              className="text-brand-blue"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <label className="mb-1 block text-[12.5px] font-semibold text-slate-600">{label}</label>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-3 transition-shadow ${
          active
            ? 'border-brand-blue ring-2 ring-brand-blue/30'
            : 'border-slate-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10'
        }`}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        <input
          value={value}
          onChange={(e) => onChange(kind === 'digits' ? e.target.value.replace(/\D/g, '').slice(0, maxLength || 32) : e.target.value)}
          placeholder={placeholder}
          inputMode={kind === 'digits' ? 'numeric' : 'text'}
          maxLength={maxLength}
          className="w-full bg-transparent py-2.5 text-sm text-brand-navy outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={handleMic}
          title={t('auth.tapMic')}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            micActive ? 'animate-pulse bg-red-500 text-white' : 'bg-brand-blueLight text-brand-blue hover:bg-brand-blue hover:text-white'
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>
      {(micActive || (active && phase === 'speaking')) && (
        <p className="mt-1 text-[11.5px] font-medium text-brand-blue">
          {phase === 'speaking' ? t('guide.speaking') : t('auth.listening')}
        </p>
      )}
    </div>
  )
}

/**
 * Patient login/registration by mobile number + OTP, with optional voice for
 * every field. Demo mode: the OTP comes back in the API response and is shown
 * on screen. The voice language follows the selected UI language.
 *
 * Guided walkthrough: when the UI language is Telugu (or the user taps "Voice
 * guide") an assistant auto-runs — it speaks each prompt, points an animated
 * arrow at the field, listens, and fills it in, then sends the OTP. All speech
 * goes through lib/voice.js `speak()`, which uses cloud TTS (Cartesia Sonic) when
 * configured and the browser voice otherwise.
 */
function PatientVoiceAuth({ onClose }) {
  const { t, lang, setLang, speech } = useI18n()
  const { requestOtp, loginOtp, registerOtp, homeFor } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [step, setStep] = useState('mobile') // 'mobile' | 'details' | 'otp'
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [abhaNumber, setAbhaNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [banner, setBanner] = useState(null) // { type, msg }
  const [busy, setBusy] = useState(false)

  // Guided walkthrough state
  const [guideOn, setGuideOn] = useState(false)
  const [guideField, setGuideField] = useState(null) // 'tab' | 'name' | 'mobile' | 'city' | null
  const [guidePhase, setGuidePhase] = useState(null) // 'speaking' | 'listening' | null
  const cancelRef = useRef(false)
  const autoStarted = useRef(false)

  const reset = (m) => { setMode(m); setStep(m === 'register' ? 'details' : 'mobile'); setOtp(''); setBanner(null) }

  const finish = (u) => {
    setBanner({ type: 'success', msg: t('auth.success') })
    setTimeout(() => { onClose(); navigate(homeFor(u.role_name)) }, 700)
  }

  // Self-contained OTP request — takes explicit values so the guided runner
  // never trips over stale React state in its async closure.
  const submitDetails = useCallback(async ({ phone: p, name: n, register }) => {
    if (!mobileRe.test(p)) { setBanner({ type: 'error', msg: t('auth.invalidMobile') }); return false }
    if (register && !n.trim()) { setBanner({ type: 'error', msg: t('auth.nameLabel') }); return false }
    setBusy(true)
    try {
      const res = await requestOtp(p)
      if (res.is_staff) { setBanner({ type: 'error', msg: t('auth.staffNumber') }); return false }
      if (!register && res.registered === false) {
        setMode('register'); setStep('details')
        setBanner({ type: 'error', msg: t('auth.notRegistered') })
        return false
      }
      if (register && res.registered === true) setMode('login')
      setStep('otp')
      setBanner({ type: 'success', msg: t('auth.otpSentDemo', { phone: p, otp: res.dev_otp || '------' }) })
      return true
    } catch (e) {
      setBanner({ type: 'error', msg: e.message || 'Could not send OTP' })
      return false
    } finally {
      setBusy(false)
    }
  }, [requestOtp, t])

  const sendOtp = () => submitDetails({ phone, name, register: mode === 'register' }).then((ok) => {
    if (ok) speak(t('auth.otpPrompt'), speech)
  })

  const verify = async () => {
    if (otp.length < 4) { setBanner({ type: 'error', msg: t('auth.otpLabel') }); return }
    setBusy(true)
    try {
      const u = mode === 'register'
        ? await registerOtp({ phone, otp, name: name.trim(), city: city.trim() || null, abha_number: abhaNumber.trim() || null })
        : await loginOtp(phone, otp)
      finish(u)
    } catch (e) {
      setBanner({ type: 'error', msg: e.message || 'Verification failed' })
    } finally {
      setBusy(false)
    }
  }

  // ----------------------------------------------------------- guided runner --
  const stopGuide = useCallback(() => {
    cancelRef.current = true
    stopSpeaking()
    setGuideOn(false)
    setGuideField(null)
    setGuidePhase(null)
  }, [])

  const runGuide = useCallback(async () => {
    cancelRef.current = false
    const cloudListening = await cloudVoiceAvailable()
    if (lang === 'te' && !cloudListening) {
      setGuideOn(false)
      setGuideField(null)
      setGuidePhase(null)
      setBanner({ type: 'error', msg: t('guide.listenUnavailable') })
      return
    }
    if (!cloudListening && !sttSupported()) {
      setGuideOn(false)
      setGuideField(null)
      setGuidePhase(null)
      setBanner({ type: 'error', msg: t('auth.voiceUnsupported') })
      return
    }
    setGuideOn(true)
    setMode('register')
    setStep('details')
    setBanner({ type: 'success', msg: t('guide.running') })

    const cancelled = () => cancelRef.current
    const say = async (key) => {
      if (cancelled()) return
      setGuidePhase('speaking')
      const before = speakTurn()
      await speak(t(key), speech)
      setGuidePhase(null)
      // If a newer voice took over while we were speaking (e.g. the user pressed
      // a field mic or switched language), abort the guide instead of talking
      // over it — the existing cancelled() checks after each step do the rest.
      if (speakTurn() !== before + 1) cancelRef.current = true
    }
    const hear = async (parse, ms = 8000) => {
      if (cancelled()) return ''
      setGuidePhase('listening')
      try {
        if (cloudListening && canRecord()) {
          const recorder = await startRecording()
          await new Promise((resolve) => setTimeout(resolve, ms))
          const blob = await recorder.stop()
          if (blob.size < 1000) {
            setBanner({ type: 'error', msg: `Microphone recorded almost no audio (${blob.size} bytes). Check Windows/browser input device, then try again.` })
            return ''
          }
          const tr = await transcribe(blob, lang)
          const parsed = parse ? parse(tr) : (tr || '').trim()
          if (tr) setBanner({ type: 'success', msg: `Heard: ${tr}` })
          if (!parsed) setBanner({ type: 'error', msg: tr ? `Heard but could not use it: ${tr}` : t('guide.didntHear') })
          return parsed
        }
        if (!sttSupported()) return ''
        const tr = await listen(speech)
        const parsed = parse ? parse(tr) : (tr || '').trim()
        if (tr) setBanner({ type: 'success', msg: `Heard: ${tr}` })
        if (!parsed) setBanner({ type: 'error', msg: tr ? `Heard but could not use it: ${tr}` : t('guide.didntHear') })
        return parsed
      } catch (e) {
        setBanner({ type: 'error', msg: `Listening failed: ${e?.message || 'check backend /voice/transcribe and microphone permission'}` })
        return ''
      } finally {
        setGuidePhase(null)
      }
    }

    // 0) Welcome + point at the Register tab ("sign up here").
    setGuideField('tab')
    await say('guide.welcome')
    if (cancelled()) return stopGuide()

    // 1) Name — speak, listen, fill (one retry).
    setGuideField('name')
    let collectedName = ''
    for (let i = 0; i < 2 && !collectedName && !cancelled(); i += 1) {
      await say(i === 0 ? 'guide.namePrompt' : 'guide.retry')
      const v = await hear(parseName)
      if (v) { collectedName = v; setName(v); await say('guide.gotIt') }
    }
    if (cancelled()) return stopGuide()

    // 2) Mobile — need 10 digits (one retry).
    setGuideField('mobile')
    let collectedPhone = ''
    for (let i = 0; i < 2 && collectedPhone.length < 10 && !cancelled(); i += 1) {
      await say(i === 0 ? 'guide.mobilePrompt' : 'guide.retry')
      const v = await hear((tr) => parseDigits(tr).slice(0, 10), 10000)
      if (v) { collectedPhone = v; setPhone(v) }
      if (v.length === 10) await say('guide.gotIt')
    }
    if (cancelled()) return stopGuide()

    // 3) City — optional, single try.
    setGuideField('city')
    await say('guide.cityPrompt')
    const c = await hear((tr) => parseName(tr))
    if (c) setCity(c)
    if (cancelled()) return stopGuide()

    // 4) Send the OTP automatically if we have a valid number.
    setGuideField(null)
    if (mobileRe.test(collectedPhone) && collectedName.trim()) {
      await say('guide.sendingOtp')
      const ok = await submitDetails({ phone: collectedPhone, name: collectedName, register: true })
      if (ok && !cancelled()) await say('auth.otpPrompt')
    }
    setGuideOn(false)
    setGuidePhase(null)
  }, [speech, t, submitDetails, stopGuide])

  // Auto-launch the guide once when the language is Telugu.
  useEffect(() => {
    if (lang === 'te' && !autoStarted.current && (sttSupported() || canRecord())) {
      autoStarted.current = true
      const id = setTimeout(() => runGuide(), 450)
      return () => clearTimeout(id)
    }
  }, [lang, runGuide])

  // Stop the guide + narration if the modal unmounts (tab closed / navigated away).
  // stopSpeaking() alone only cancels the clip that's playing right now — the async
  // runGuide loop would carry on to its next prompt and start talking again. Setting
  // the cancel flag makes the loop bail at its next checkpoint.
  useEffect(() => () => { cancelRef.current = true; stopSpeaking() }, [])

  // Stop the voice guide when the browser tab is hidden (user switched tabs or
  // minimised the window) — otherwise the narration keeps playing in the
  // background tab. pagehide covers navigating away / closing the tab.
  useEffect(() => {
    const onHidden = () => { if (document.hidden) stopGuide() }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', stopGuide)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', stopGuide)
    }
  }, [stopGuide])

  const guideTarget = (f) => guideOn && guideField === f

  return (
    <div className="space-y-3">
      {/* Language picker — drives both the UI and the voice prompts. */}
      <div className="flex justify-center gap-1.5">
        {Object.entries(LANGS).map(([code, meta]) => (
          <button
            key={code}
            type="button"
            onClick={() => { stopSpeaking(); if (guideOn) stopGuide(); setLang(code) }}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
              lang === code ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Guided voice walkthrough control — registration helper only. Hidden
          once the OTP has been sent so it can't restart the guide (and wipe the
          user's OTP progress) after registration. */}
      {step !== 'otp' && (
        <button
          type="button"
          onClick={() => (guideOn ? stopGuide() : runGuide())}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-[13px] font-semibold transition-colors ${
            guideOn
              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              : 'border-brand-blue/30 bg-brand-blueLight text-brand-blue hover:bg-brand-blue hover:text-white'
          }`}
        >
          {guideOn ? <Square className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {guideOn ? t('guide.stop') : t('guide.start')}
        </button>
      )}

      {/* Login / Register toggle */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => reset('login')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500'}`}>{t('auth.loginTab')}</button>
        <button
          type="button"
          onClick={() => reset('register')}
          className={`relative flex-1 rounded-lg py-2 text-sm font-semibold transition-shadow ${
            mode === 'register' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500'
          } ${guideTarget('tab') ? 'ring-2 ring-brand-blue ring-offset-1' : ''}`}
        >
          {t('auth.signupTab')}
          {guideTarget('tab') && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-blue px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm"
            >
              {t('guide.signupHere')}
            </motion.span>
          )}
        </button>
      </div>

      {banner && <Banner type={banner.type}>{banner.msg}</Banner>}

      {step !== 'otp' ? (
        <>
          {mode === 'register' && (
            <VoiceField icon={User} kind="name" label={t('auth.nameLabel')} prompt={t('auth.namePrompt')} value={name} onChange={setName} placeholder={t('auth.nameLabel')} onVoiceError={(m) => setBanner({ type: 'error', msg: m })} active={guideTarget('name')} bubble={t('guide.nameBubble')} phase={guideTarget('name') ? guidePhase : null} />
          )}
          <VoiceField icon={Phone} kind="digits" maxLength={10} label={t('auth.mobileLabel')} prompt={t('auth.mobilePrompt')} value={phone} onChange={setPhone} placeholder="9876543210" onVoiceError={(m) => setBanner({ type: 'error', msg: m })} active={guideTarget('mobile')} bubble={t('guide.mobileBubble')} phase={guideTarget('mobile') ? guidePhase : null} />
          {mode === 'register' && (
            <VoiceField icon={MapPin} kind="text" label={t('auth.cityLabel')} prompt={t('auth.cityLabel')} value={city} onChange={setCity} placeholder={t('auth.cityLabel')} onVoiceError={(m) => setBanner({ type: 'error', msg: m })} active={guideTarget('city')} bubble={t('guide.cityBubble')} phase={guideTarget('city') ? guidePhase : null} />
          )}
          {mode === 'register' && (
            <VoiceField icon={Fingerprint} kind="digits" maxLength={14} label={t('auth.abhaLabel')} prompt={t('auth.abhaPrompt')} value={abhaNumber} onChange={setAbhaNumber} placeholder="12-3456-7890-1234" onVoiceError={(m) => setBanner({ type: 'error', msg: m })} />
          )}
          <button type="button" disabled={busy} onClick={sendOtp} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60">
            {t('auth.sendOtp')}
          </button>
        </>
      ) : (
        <>
          <VoiceField icon={ShieldCheck} kind="digits" maxLength={6} label={t('auth.otpLabel')} prompt={t('auth.otpPrompt')} value={otp} onChange={setOtp} placeholder="••••••" onVoiceError={(m) => setBanner({ type: 'error', msg: m })} />
          <button type="button" disabled={busy} onClick={verify} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60">
            {mode === 'register' ? t('auth.createAccount') : t('auth.verifyLogin')}
          </button>
          <button type="button" onClick={() => { setStep(mode === 'register' ? 'details' : 'mobile'); setBanner(null) }} className="flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-brand-blue">
            <ArrowLeft className="h-4 w-4" /> {t('auth.back')}
          </button>
        </>
      )}
    </div>
  )
}

export default PatientVoiceAuth
