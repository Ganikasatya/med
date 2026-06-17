import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ShieldCheck, User, MapPin, Mic, ArrowLeft } from 'lucide-react'
import { Banner } from '../common/FormControls.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useI18n, LANGS } from '../../i18n/index.jsx'
import { speak, listen, parseDigits, parseName, sttSupported } from '../../lib/voice.js'

const mobileRe = /^\d{10}$/

/** Input with a mic button that speaks the prompt then captures a spoken answer. */
function VoiceField({ icon: Icon, label, prompt, value, onChange, kind = 'text', placeholder, maxLength, onVoiceError }) {
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

  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-semibold text-slate-600">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10">
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
            listening ? 'animate-pulse bg-red-500 text-white' : 'bg-brand-blueLight text-brand-blue hover:bg-brand-blue hover:text-white'
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>
      {listening && <p className="mt-1 text-[11.5px] font-medium text-brand-blue">{t('auth.listening')}</p>}
    </div>
  )
}

/**
 * Patient login/registration by mobile number + OTP, with optional voice for
 * every field. Demo mode: the OTP comes back in the API response and is shown
 * on screen. The voice language follows the selected UI language.
 */
function PatientVoiceAuth({ onClose }) {
  const { t, lang, setLang } = useI18n()
  const { requestOtp, loginOtp, registerOtp, homeFor } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [step, setStep] = useState('mobile') // 'mobile' | 'details' | 'otp'
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [otp, setOtp] = useState('')
  const [banner, setBanner] = useState(null) // { type, msg }
  const [busy, setBusy] = useState(false)

  const reset = (m) => { setMode(m); setStep(m === 'register' ? 'details' : 'mobile'); setOtp(''); setBanner(null) }

  const finish = (u) => {
    setBanner({ type: 'success', msg: t('auth.success') })
    setTimeout(() => { onClose(); navigate(homeFor(u.role_name)) }, 700)
  }

  const sendOtp = async () => {
    if (!mobileRe.test(phone)) { setBanner({ type: 'error', msg: t('auth.invalidMobile') }); return }
    if (mode === 'register' && !name.trim()) { setBanner({ type: 'error', msg: t('auth.nameLabel') }); return }
    setBusy(true)
    try {
      const res = await requestOtp(phone)
      // Mobile-OTP is patient-only: a staff/doctor/admin number can't use it.
      if (res.is_staff) {
        setBanner({ type: 'error', msg: t('auth.staffNumber') })
        return
      }
      // Login but the number isn't registered → guide them to register.
      if (mode === 'login' && res.registered === false) {
        setMode('register'); setStep('details')
        setBanner({ type: 'error', msg: t('auth.notRegistered') })
        return
      }
      // Register but the number already exists → just log them in.
      if (mode === 'register' && res.registered === true) setMode('login')
      setStep('otp')
      const msg = t('auth.otpSentDemo', { phone, otp: res.dev_otp || '------' })
      setBanner({ type: 'success', msg })
      speak(t('auth.otpPrompt'), LANGS[lang].speech)
    } catch (e) {
      setBanner({ type: 'error', msg: e.message || 'Could not send OTP' })
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (otp.length < 4) { setBanner({ type: 'error', msg: t('auth.otpLabel') }); return }
    setBusy(true)
    try {
      const u = mode === 'register'
        ? await registerOtp({ phone, otp, name: name.trim(), city: city.trim() || null })
        : await loginOtp(phone, otp)
      finish(u)
    } catch (e) {
      setBanner({ type: 'error', msg: e.message || 'Verification failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Language picker — drives both the UI and the voice prompts. */}
      <div className="flex justify-center gap-1.5">
        {Object.entries(LANGS).map(([code, meta]) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
              lang === code ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Login / Register toggle */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => reset('login')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500'}`}>{t('auth.loginTab')}</button>
        <button type="button" onClick={() => reset('register')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'register' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500'}`}>{t('auth.signupTab')}</button>
      </div>

      {banner && <Banner type={banner.type}>{banner.msg}</Banner>}

      {step !== 'otp' ? (
        <>
          {mode === 'register' && (
            <VoiceField icon={User} kind="name" label={t('auth.nameLabel')} prompt={t('auth.namePrompt')} value={name} onChange={setName} placeholder={t('auth.nameLabel')} onVoiceError={(m) => setBanner({ type: 'error', msg: m })} />
          )}
          <VoiceField icon={Phone} kind="digits" maxLength={10} label={t('auth.mobileLabel')} prompt={t('auth.mobilePrompt')} value={phone} onChange={setPhone} placeholder="9876543210" onVoiceError={(m) => setBanner({ type: 'error', msg: m })} />
          {mode === 'register' && (
            <VoiceField icon={MapPin} kind="text" label={t('auth.cityLabel')} prompt={t('auth.cityLabel')} value={city} onChange={setCity} placeholder={t('auth.cityLabel')} onVoiceError={(m) => setBanner({ type: 'error', msg: m })} />
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
