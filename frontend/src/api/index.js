/**
 * Endpoint helpers grouped by domain. Thin wrappers over `api` (client.js) so
 * components call e.g. `tokensApi.queue(doctorId)` instead of raw paths.
 */
import { api, clearTokens, setTokens } from './client.js'

const qs = (params = {}) => {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v)
  })
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const authApi = {
  login: async (identifier, password) => {
    const d = await api.post('/auth/login', { identifier, password }, { auth: false })
    setTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
    return d
  },
  register: async (payload) => {
    const d = await api.post('/auth/register', payload, { auth: false })
    setTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
    return d
  },
  me: () => api.get('/auth/me'),
  logout: () => clearTokens(),
  // Public clinic onboarding (creates a pending hospital + owner admin).
  registerClinic: (payload) => api.post('/auth/register-clinic', payload, { auth: false }),
  // Mobile-OTP (patient, demo mode — request returns dev_otp).
  otpRequest: (phone) => api.post('/auth/otp/request', { phone }, { auth: false }),
  otpLogin: async (phone, otp) => {
    const d = await api.post('/auth/otp/login', { phone, otp }, { auth: false })
    setTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
    return d
  },
  otpRegister: async (payload) => {
    const d = await api.post('/auth/otp/register', payload, { auth: false })
    setTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
    return d
  },
}

export const hospitalsApi = {
  list: () => api.get('/hospitals'),
  get: (id) => api.get(`/hospitals/${id}`),
  update: (id, body) => api.put(`/hospitals/${id}`, body),
  doctors: (clinicId) => api.get(`/clinics/${clinicId}/doctors`),
  pending: () => api.get('/hospitals/pending'),
  approve: (id) => api.post(`/hospitals/${id}/approve`),
  reject: (id, reason = '') => api.post(`/hospitals/${id}/reject`, { reason }),
}

export const doctorsApi = {
  list: (params) => api.get(`/doctors${qs(params)}`),
  get: (id) => api.get(`/doctors/${id}`),
  update: (id, body) => api.put(`/doctors/${id}`, body),
  availability: (id, date) => api.get(`/doctors/${id}/availability${qs({ date })}`),
  onboard: (payload) => api.post('/doctors/onboard', payload),
  // Weekly schedule (sessions).
  schedule: (id, affiliationId) => api.get(`/doctor-schedule${qs({ doctor_id: id, affiliation_id: affiliationId })}`),
  addSchedule: (body) => api.post('/doctor-schedule', body),
  editSchedule: (scheduleId, body) => api.put(`/doctor-schedule/${scheduleId}`, body),
  removeSchedule: (scheduleId) => api.del(`/doctor-schedule/${scheduleId}`),
  // Holidays + leave.
  holidays: (id) => api.get(`/doctor-holidays${qs({ doctor_id: id })}`),
  addHoliday: (body) => api.post('/doctor-holidays', body),
  removeHoliday: (holidayId) => api.del(`/doctor-holidays/${holidayId}`),
  leave: (id) => api.get(`/doctor-leave${qs({ doctor_id: id })}`),
  submitLeave: (body) => api.post('/doctor-leave', body),
  // Delay alerts + presence.
  delays: (id) => api.get(`/doctor-delay${qs({ doctor_id: id })}`),
  logDelay: (body) => api.post('/doctor-delay', body),
  affiliations: (params) => api.get(`/doctor-affiliations${qs(params)}`),
  addAffiliation: (body) => api.post('/doctor-affiliations', body),
  updateAffiliation: (id, body) => api.put(`/doctor-affiliations/${id}`, body),
  status: (id) => api.get(`/doctor-status${qs({ doctor_id: id })}`),
  setStatus: (id, body) => api.put(`/doctor-status${qs({ doctor_id: id })}`, body),
}

export const departmentsApi = {
  list: (params) => api.get(`/departments${qs(params)}`),
  create: (body) => api.post('/departments', body),
  update: (id, body) => api.put(`/departments/${id}`, body),
  remove: (id) => api.del(`/departments/${id}`),
}

export const receptionApi = {
  list: (params) => api.get(`/receptionists${qs(params)}`),
  onboard: (body) => api.post('/receptionists/onboard', body),
  update: (id, body) => api.put(`/receptionists/${id}`, body),
  remove: (id) => api.del(`/receptionists/${id}`),
}

export const patientsApi = {
  list: (params) => api.get(`/patients${qs(params)}`),
  get: (id) => api.get(`/patients/${id}`),
  search: (q) => api.get(`/patients/search${qs({ q })}`),
  create: (body) => api.post('/patients', body),
  update: (id, body) => api.put(`/patients/${id}`, body),
  appointments: (id, params) => api.get(`/patients/${id}/appointments${qs(params)}`),
  // For a logged-in PATIENT, GET /patients is auto-scoped to their own record(s)
  // server-side (user_id == me). The first row is "my" patient profile.
  me: async () => (await api.get('/patients'))[0] || null,
  // Health-record sub-resources.
  allergies: (id) => api.get(`/patients/${id}/allergies`),
  addAllergy: (body) => api.post('/allergies', body),
  removeAllergy: (allergyId) => api.del(`/allergies/${allergyId}`),
  medicalHistory: (id) => api.get(`/patients/${id}/medical-history`),
  addHistory: (body) => api.post('/medical-history', body),
  documents: (id) => api.get(`/patients/${id}/documents`),
  uploadDocument: (formData) => api.post('/documents', formData, { isForm: true }),
  family: (id) => api.get(`/patients/${id}/family`),
}

// Absolute URL for a server-stored file path (e.g. a document's file_url).
export const fileUrl = (path) =>
  path?.startsWith('http') ? path : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${path || ''}`

export const appointmentsApi = {
  list: (params) => api.get(`/appointments${qs(params)}`),
  get: (id) => api.get(`/appointments/${id}`),
  book: (body) => api.post('/appointments', body),
  availableSlots: (doctorId, date, affiliationId) =>
    api.get(`/appointments/available-slots${qs({ doctor_id: doctorId, date, affiliation_id: affiliationId })}`),
  today: (doctorId) => api.get(`/appointments/today${qs({ doctor_id: doctorId })}`),
  upcoming: (patientId, days) =>
    api.get(`/appointments/upcoming${qs({ patient_id: patientId, days_ahead: days })}`),
  walkIn: (body) => api.post('/appointments/walk-in', body),
  reschedule: (body) => api.post('/appointments/reschedule', body),
  cancel: (body) => api.post('/appointments/cancel', body),
  cancellations: (params) => api.get(`/appointments/cancellations${qs(params)}`),
}

export const tokensApi = {
  generate: (appointmentId, priority = 'normal') =>
    api.post('/tokens/generate', { appointment_id: appointmentId, priority }),
  queue: (doctorId, date, affiliationId) => api.get(`/tokens/queue${qs({ doctor_id: doctorId, date, affiliation_id: affiliationId })}`),
  // Live ETA + leave-by hints. Look up by token_id or, for patients, appointment_id.
  estimate: (params) => api.get(`/tokens/estimate${qs(params)}`),
  current: (doctorId, date, affiliationId) => api.get(`/tokens/current${qs({ doctor_id: doctorId, date, affiliation_id: affiliationId })}`),
  liveDisplay: (doctorId, date, affiliationId) => api.get(`/tokens/live-display${qs({ doctor_id: doctorId, date, affiliation_id: affiliationId })}`),
  stats: (doctorId, date, affiliationId) => api.get(`/tokens/stats${qs({ doctor_id: doctorId, date, affiliation_id: affiliationId })}`),
  history: (doctorId, date) => api.get(`/tokens/history${qs({ doctor_id: doctorId, date })}`),
  next: (doctorId, affiliationId) => api.post(`/tokens/next${qs({ doctor_id: doctorId, affiliation_id: affiliationId })}`),
  complete: (tokenId) => api.post('/tokens/complete', { token_id: tokenId }),
  recall: (tokenId, method = 'display') =>
    api.post('/tokens/recall', { token_id: tokenId, recall_method: method }),
  missed: (tokenId) => api.post('/tokens/missed', { token_id: tokenId }),
  skip: (tokenId, reason = '') => api.post('/tokens/skip', { token_id: tokenId, reason }),
}

export const reportsApi = {
  dashboard: (params) => api.get(`/reports/dashboard${qs(params)}`),
  daily: (params) => api.get(`/reports/daily${qs(params)}`),
  doctor: (params) => api.get(`/reports/doctor${qs(params)}`),
  revenue: (params) => api.get(`/reports/revenue${qs(params)}`),
  peakHours: (params) => api.get(`/reports/peak-hours${qs(params)}`),
  waitTime: (params) => api.get(`/reports/wait-time${qs(params)}`),
  noShow: (params) => api.get(`/reports/no-show${qs(params)}`),
  cancellations: (params) => api.get(`/reports/cancellations${qs(params)}`),
  patientFlow: (params) => api.get(`/reports/patient-flow${qs(params)}`),
}

export const notificationsApi = {
  history: (params) => api.get(`/notification-history${qs(params)}`),
  stats: (params) => api.get(`/notification-stats${qs(params)}`),
}

// Voice assistant proxy (keeps the OpenAI key server-side). `status` reports
// whether cloud voice is configured; transcribe/nlu throw ApiError(503) when
// it isn't, which the voice agent treats as "use the on-device fallback".
export const voiceApi = {
  status: () => api.get('/voice/status'),
  transcribe: (audioBlob, language = 'en') => {
    const fd = new FormData()
    fd.append('audio', audioBlob, 'speech.webm')
    fd.append('language', language)
    return api.post('/voice/transcribe', fd, { isForm: true })
  },
  nlu: (body) => api.post('/voice/nlu', body),
}
