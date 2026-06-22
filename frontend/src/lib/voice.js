/**
 * Thin wrappers over the browser Web Speech API (free, on-device-ish). Used by
 * the patient voice login so prompts are read aloud and answers are captured by
 * voice. Everything degrades gracefully when the API is missing.
 */

import { voiceApi } from '../api'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const sttSupported = () => !!SR
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const FALLBACK_LANGS = {
  'te-IN': ['te-IN', 'te'],
  'hi-IN': ['hi-IN', 'hi', 'en-IN', 'en'],
  'en-IN': ['en-IN', 'en'],
}

function readVoices() {
  if (!ttsSupported()) return []
  try {
    return window.speechSynthesis.getVoices() || []
  } catch {
    return []
  }
}

function loadVoices() {
  return new Promise((resolve) => {
    const initial = readVoices()
    if (initial.length) return resolve(initial)

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve(readVoices())
    }

    try {
      window.speechSynthesis.onvoiceschanged = finish
      setTimeout(finish, 600)
    } catch {
      finish()
    }
  })
}

function voiceScore(voice, code, index) {
  const lang = (voice.lang || '').toLowerCase()
  const target = code.toLowerCase()
  if (lang === target) return 100 - index
  if (lang.startsWith(`${target.split('-')[0]}-`)) return 80 - index
  if (lang.startsWith(target)) return 70 - index
  return 0
}

function voiceMatchesLang(voice, lang) {
  if (!voice) return false
  const voiceLang = (voice.lang || '').toLowerCase()
  const target = lang.toLowerCase()
  const base = target.split('-')[0]
  return voiceLang === target || voiceLang.startsWith(`${base}-`) || voiceLang === base
}

function pickVoice(voices, lang) {
  const chain = FALLBACK_LANGS[lang] || [lang, lang.split('-')[0], 'en-IN', 'en']
  for (const code of chain) {
    let best = null
    let bestScore = 0
    voices.forEach((voice, index) => {
      const score = voiceScore(voice, code, index)
      if (score > bestScore) {
        best = voice
        bestScore = score
      }
    })
    if (best) return best
  }
  return voices.find((v) => v.default) || voices[0] || null
}

export async function nativeTtsVoiceAvailable(lang = 'en-IN') {
  if (!ttsSupported()) return false
  const voices = await loadVoices()
  return voices.some((voice) => voiceMatchesLang(voice, lang))
}

// ----------------------------------------------------------- cloud TTS -------
// Server-side text-to-speech (Cartesia Sonic) for Telugu/Hindi prompts. When
// configured, prompts route through Cartesia only; browser speech is used only
// when cloud TTS is not configured.

let _status = null
/** Backend voice status (STT + TTS), cached after the first probe. */
export async function voiceStatus() {
  if (_status !== null) return _status
  try {
    _status = await voiceApi.status()
  } catch {
    _status = { cloud_voice: false, cloud_tts: false }
  }
  return _status
}

/** Is Cartesia TTS configured server-side? */
export async function cloudTtsAvailable() {
  return !!(await voiceStatus()).cloud_tts
}

// One shared <audio> element so a new prompt cancels any still-playing one.
let _ttsAudio = null
let _ttsDone = null // resolves the in-flight speakCloud() promise when we stop it

// Monotonic token: every speak()/stopSpeaking() bumps it, so a prompt that was
// started before a newer one (or before a stop) aborts instead of overlapping.
// This is what prevents the cloud voice and the browser voice — which play on
// separate channels — from ever sounding at the same time.
let _speakSeq = 0

/** Stop any cloud-TTS audio that's currently playing. */
export function stopCloudSpeak() {
  if (_ttsDone) {
    try { _ttsDone(false) } catch { /* ignore */ }
    _ttsDone = null
  }
  if (_ttsAudio) {
    try { _ttsAudio.pause() } catch { /* ignore */ }
    _ttsAudio = null
  }
}

/**
 * Speak `text` via Cartesia and resolve `true` when playback ends. Resolves
 * `false` (never throws) if TTS is unavailable or playback fails. `lang` is a
 * short code (en/te/hi).
 */
export async function speakCloud(text, lang = 'en') {
  if (!text) return false
  const seq = _speakSeq // abort if a newer prompt/stop happens while we fetch
  let url = null
  try {
    const blob = await voiceApi.tts(text, lang)
    url = URL.createObjectURL(blob)
  } catch {
    return false
  }
  if (seq !== _speakSeq) { URL.revokeObjectURL(url); return false }
  stopCloudSpeak()
  return new Promise((resolve) => {
    const audio = new Audio(url)
    _ttsAudio = audio
    let settled = false
    const done = (ok) => {
      if (settled) return
      settled = true
      if (_ttsDone === done) _ttsDone = null
      if (_ttsAudio === audio) _ttsAudio = null
      URL.revokeObjectURL(url)
      resolve(ok)
    }
    _ttsDone = done
    audio.onended = () => done(true)
    audio.onerror = () => done(false)
    audio.onpause = () => {
      // Some browsers emit pause as part of natural completion. Do not report
      // that as a cloud failure, or speak() will repeat the prompt via the
      // browser fallback after Cartesia has already finished.
      if (audio.ended) done(true)
    }
    audio.play().catch(() => done(false))
  })
}

/** A voice that genuinely speaks the target language (same family), or null. */
function pickNativeVoice(voices, lang) {
  let best = null
  let bestScore = 0
  voices.forEach((voice, index) => {
    if (!voiceMatchesLang(voice, lang)) return
    // Prefer an exact lang match, then same base language; later voices lose ties.
    const score = voiceScore(voice, lang, index) || 1
    if (score > bestScore) { best = voice; bestScore = score }
  })
  return best
}


/**
 * Speak `text` in the given BCP-47 language; resolves when done (or instantly if
 * unsupported).
 *
 * Telugu should stay Telugu: no romanized/English browser fallback is used.
 */
export async function speak(text, lang = 'en-IN', options = {}) {
  if (!text) return

  // Cancel anything currently speaking (cloud or browser) and claim this turn.
  // If a newer speak()/stopSpeaking() happens while we await below, `seq` goes
  // stale and we bail out — so only the latest prompt is ever heard.
  stopSpeaking()
  const seq = _speakSeq

  // 0) Prefer cloud TTS (Cartesia). If it is configured, do not repeat the same
  //    prompt through browser speech if playback fails or finishes oddly.
  const shortLang = (options.lang || String(lang).split('-')[0] || 'en').toLowerCase()
  const isTelugu = String(lang).toLowerCase().startsWith('te') || shortLang === 'te'
  if (await cloudTtsAvailable()) {
    if (seq !== _speakSeq) return
    await speakCloud(text, shortLang)
    return
  }
  if (isTelugu) return

  if (!ttsSupported() || seq !== _speakSeq) return
  const voices = await loadVoices()
  if (seq !== _speakSeq) return

  // 1) A real voice for this language reads the native-script text best.
  const native = pickNativeVoice(voices, lang)
  const voice = native || pickVoice(voices, lang)
  const speakText = text
  const rate = 0.95

  return new Promise((resolve) => {
    if (!ttsSupported() || !speakText) return resolve()
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(speakText)
      if (voice) {
        u.voice = voice
        u.lang = voice.lang || lang
      } else {
        u.lang = lang
      }
      u.rate = rate
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    } catch {
      resolve()
    }
  })
}

export function stopSpeaking() {
  _speakSeq += 1 // invalidate any in-flight speak() so it won't start a 2nd voice
  stopCloudSpeak()
  if (ttsSupported()) {
    try { window.speechSynthesis.cancel() } catch { /* ignore */ }
  }
}

/**
 * Listen once and resolve with the recognised transcript (string), or reject
 * with an Error. Caller decides how to parse (name vs digits).
 */
export function listen(lang = 'en-IN') {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('unsupported'))
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false
    let done = false
    rec.onresult = (e) => {
      done = true
      resolve(e.results[0][0].transcript || '')
    }
    rec.onerror = (e) => {
      done = true
      reject(new Error(e.error || 'speech-error'))
    }
    rec.onend = () => {
      if (!done) reject(new Error('no-speech'))
    }
    try { rec.start() } catch { reject(new Error('start-failed')) }
    return rec
  })
}

// Spoken number words → digits, across en / hi / te, so "nine eight…" or
// "నైన్" or "नौ" all collapse to digits. Also strips spaces from "9 8 7…".
const WORD_DIGITS = {
  zero: '0', oh: '0', o: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', double: '', triple: '',
  // Hindi
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5',
  'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  // Telugu
  'సున్నా': '0', 'ఒకటి': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4', 'ఐదు': '5',
  'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9',
}

/** Pull just the digits out of a spoken phrase (handles words + numerals). */
export function parseDigits(transcript) {
  if (!transcript) return ''
  let out = ''
  // First, any literal digits already present.
  const tokens = String(transcript).toLowerCase().split(/[\s,.-]+/)
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      out += tok
    } else if (tok in WORD_DIGITS) {
      out += WORD_DIGITS[tok]
    } else {
      // mixed token like "98765" already handled; ignore others
      const onlyDigits = tok.replace(/\D/g, '')
      if (onlyDigits) out += onlyDigits
    }
  }
  return out
}

/** Tidy a spoken name: collapse spaces, capitalise words. */
export function parseName(transcript) {
  return String(transcript || '')
    .replace(/[^\p{L}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}
