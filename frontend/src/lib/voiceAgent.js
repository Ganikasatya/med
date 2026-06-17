/**
 * Voice-agent layer for the patient "Book by Voice" guide.
 *
 * Hearing the patient has two backends:
 *   1. Cloud (preferred): record a short clip with MediaRecorder and send it to
 *      the backend /voice/transcribe (OpenAI Whisper) — far better for Telugu /
 *      Hindi and noisy phones.
 *   2. On-device fallback: the browser Web Speech API (lib/voice.js `listen`),
 *      used automatically when no key is configured / the device can record but
 *      the server says cloud voice is off, or when recording isn't supported.
 *
 * Understanding the patient (mapping messy speech to a choice / yes-no / date)
 * goes through /voice/nlu, and every task has a pure local fallback so the flow
 * still works fully offline — just a little less forgiving of free-form phrasing.
 */
import { voiceApi } from '../api'
import { listen as browserListen, parseDigits } from './voice.js'
import { todayISO } from './format.js'

const SPEECH_CODE = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }
export const speechCode = (lang) => SPEECH_CODE[lang] || 'en-IN'

export const canRecord = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder !== 'undefined'

/** Has the backend got a cloud-voice key? Cached after the first probe. */
let _cloudVoice = null
export async function cloudVoiceAvailable() {
  if (_cloudVoice !== null) return _cloudVoice
  try {
    const { cloud_voice } = await voiceApi.status()
    _cloudVoice = !!cloud_voice
  } catch {
    _cloudVoice = false
  }
  return _cloudVoice
}

/** Pick the recorder MIME type the browser actually supports. */
function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const t of types) {
    if (window.MediaRecorder?.isTypeSupported?.(t)) return t
  }
  return ''
}

/**
 * Start a microphone recording. Returns a handle with `stop()` -> Promise<Blob>
 * so the caller controls how long to listen (tap-to-stop, or auto-stop on a
 * timer). Always release the mic via the stream tracks when done.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = pickMime()
  const rec = new window.MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks = []
  rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data)
  rec.start()

  const stop = () =>
    new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        resolve(new Blob(chunks, { type: mime || 'audio/webm' }))
      }
      if (rec.state !== 'inactive') rec.stop()
      else resolve(new Blob(chunks, { type: mime || 'audio/webm' }))
    })

  return { stop }
}

/**
 * Transcribe a recorded clip. Tries the cloud (Whisper); if that's unavailable
 * the caller should have used `listenOnce` instead — but we still surface a
 * clear error so the UI can degrade.
 */
export async function transcribe(blob, lang) {
  const { text } = await voiceApi.transcribe(blob, lang)
  return (text || '').trim()
}

/**
 * One-shot browser speech recognition (the on-device fallback). Resolves with
 * the transcript or '' if nothing was heard.
 */
export async function listenOnce(lang) {
  try {
    return (await browserListen(speechCode(lang))) || ''
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------- intent ----
// Each interpret helper hits /voice/nlu, then falls back to local heuristics if
// the cloud is off or errors. Local matching is intentionally simple but covers
// the common cases in all three languages.

const YES_WORDS = [
  'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'confirm', 'book',
  'avunu', 'అవును', 'సరే', ' సరి', 'haan', 'haa', 'हां', 'हाँ', 'जी', 'ठीक',
]
const NO_WORDS = [
  'no', 'nope', 'cancel', 'wrong', 'change', 'back',
  'kaadu', 'వద్దు', 'కాదు', 'nahi', 'nahin', 'नहीं', 'मत',
]

function localYesNo(text) {
  const t = (text || '').toLowerCase()
  if (YES_WORDS.some((w) => t.includes(w))) return 'yes'
  if (NO_WORDS.some((w) => t.includes(w))) return 'no'
  return ''
}

/** Cheap token-overlap score between a spoken phrase and an option label. */
function scoreMatch(text, label) {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
  const spoken = new Set(norm(text))
  const words = norm(label)
  if (!words.length || !spoken.size) return 0
  let hit = 0
  for (const w of words) if (spoken.has(w)) hit += 1
  return hit / words.length
}

/** Resolve "yes/no" from speech. */
export async function interpretYesNo(transcript, lang) {
  const local = localYesNo(transcript)
  try {
    if (await cloudVoiceAvailable()) {
      const r = await voiceApi.nlu({ transcript, language: lang, task: 'yes_no' })
      if (r.value === 'yes' || r.value === 'no') return { value: r.value, reply: r.reply }
    }
  } catch { /* fall through to local */ }
  return { value: local, reply: '' }
}

/**
 * Pick the best option (e.g. a doctor or a time slot) for a spoken reply.
 * `options` = [{ id, label }]. Also understands "first/second/third" and a
 * spoken ordinal number as a position into the list.
 */
export async function interpretChoice(transcript, lang, options, hint) {
  try {
    if (await cloudVoiceAvailable()) {
      const r = await voiceApi.nlu({ transcript, language: lang, task: 'match_option', options, hint })
      if (r.value && options.some((o) => String(o.id) === String(r.value))) {
        return { id: String(r.value), reply: r.reply }
      }
    }
  } catch { /* fall through to local */ }

  // Local fallback: ordinal words, a spoken position number, then word overlap.
  const t = (transcript || '').toLowerCase()
  const ORD = [
    ['first', 'one', 'modati', 'మొదటి', 'pehla', 'pehli', 'पहला', 'पहली'],
    ['second', 'two', 'rendava', 'రెండవ', 'dusra', 'dusri', 'दूसरा', 'दूसरी'],
    ['third', 'three', 'moodava', 'మూడవ', 'teesra', 'tisri', 'तीसरा', 'तीसरी'],
  ]
  for (let i = 0; i < ORD.length && i < options.length; i += 1) {
    if (ORD[i].some((w) => t.includes(w))) return { id: String(options[i].id), reply: '' }
  }
  const digits = parseDigits(transcript)
  if (digits) {
    const pos = parseInt(digits, 10)
    if (pos >= 1 && pos <= options.length) return { id: String(options[pos - 1].id), reply: '' }
  }
  let best = null
  let bestScore = 0
  for (const o of options) {
    const s = scoreMatch(transcript, o.label)
    if (s > bestScore) {
      bestScore = s
      best = o
    }
  }
  if (best && bestScore >= 0.34) return { id: String(best.id), reply: '' }
  return { id: '', reply: '' }
}

/** Resolve a spoken day ("today", "tomorrow", a weekday) to an ISO date. */
export async function interpretDate(transcript, lang, today = todayISO()) {
  try {
    if (await cloudVoiceAvailable()) {
      const r = await voiceApi.nlu({ transcript, language: lang, task: 'pick_date', today })
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.value) && r.value >= today) {
        return { value: r.value, reply: r.reply }
      }
    }
  } catch { /* fall through to local */ }

  const t = (transcript || '').toLowerCase()
  const base = new Date(`${today}T00:00:00`)
  const iso = (d) => d.toISOString().slice(0, 10)
  const TODAY = ['today', 'ivvala', 'ఈరోజు', 'ఇవాళ', 'aaj', 'आज']
  const TOMORROW = ['tomorrow', 'repu', 'రేపు', 'kal', 'कल']
  if (TODAY.some((w) => t.includes(w))) return { value: today, reply: '' }
  if (TOMORROW.some((w) => t.includes(w))) {
    const d = new Date(base)
    d.setDate(d.getDate() + 1)
    return { value: iso(d), reply: '' }
  }
  return { value: '', reply: '' }
}
