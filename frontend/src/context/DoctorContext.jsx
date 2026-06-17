import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { doctorsApi, hospitalsApi, patientsApi } from '../api'
import { useAuth } from './AuthContext.jsx'

/**
 * Shared data for the doctor console, loaded once in <DoctorLayout/>:
 *  - `doctor`      : the logged-in doctor's own record (matched by user_id)
 *  - `hospital`    : their clinic
 *  - `doctorsById` : all doctors in the tenant (for the staff view)
 *  - `patientsById`: hospital patients (to resolve patient_id -> name on rows)
 *
 * A DOCTOR user has no "/doctors/me"; the doctor list is tenant-scoped, so we
 * find our own record by matching `user_id`. Pages read it via `useDoctorCtx()`.
 */
const DoctorContext = createContext(null)

export function DoctorProvider({ children }) {
  const { user } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [hospital, setHospital] = useState(null)
  const [doctorsById, setDoctorsById] = useState({})
  const [patientsById, setPatientsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [doctors, patients] = await Promise.all([
        doctorsApi.list().catch(() => []),
        patientsApi.list({ size: 200 }).catch(() => []),
      ])
      const mine =
        (user && (doctors || []).find((d) => d.user_id === user.user_id)) || doctors?.[0] || null
      setDoctor(mine)
      setDoctorsById(Object.fromEntries((doctors || []).map((d) => [d.doctor_id, d])))
      setPatientsById(Object.fromEntries((patients || []).map((p) => [p.patient_id, p])))
      if (mine?.hospital_id) {
        const h = await hospitalsApi.get(mine.hospital_id).catch(() => null)
        setHospital(h)
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const resolvePatient = useCallback((id) => patientsById[id] || null, [patientsById])

  return (
    <DoctorContext.Provider
      value={{
        doctor,
        doctorId: doctor?.doctor_id,
        hospital,
        doctorsById,
        patientsById,
        resolvePatient,
        loading,
        error,
        reload: load,
        setDoctor,
      }}
    >
      {children}
    </DoctorContext.Provider>
  )
}

export function useDoctorCtx() {
  const ctx = useContext(DoctorContext)
  if (!ctx) throw new Error('useDoctorCtx must be used inside <DoctorProvider>')
  return ctx
}
