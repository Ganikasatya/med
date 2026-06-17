import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { patientsApi, doctorsApi, hospitalsApi } from '../api'

/**
 * Loads the data shared by every patient page exactly once:
 *  - `patient`      : the logged-in patient's own record (id, name, contact…)
 *  - `doctorsById`  : { [doctor_id]: DoctorOut }  — to resolve names on appointments
 *  - `hospitalsById`: { [hospital_id]: HospitalOut }
 *
 * Mounted inside <PatientLayout/> so it covers the whole console. Pages read it
 * via `usePatientCtx()`; appointment rows use `resolveDoctor`/`resolveHospital`
 * to turn the foreign keys the API returns into display names.
 */
const PatientContext = createContext(null)

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState(null)
  const [doctorsById, setDoctorsById] = useState({})
  const [affiliationsByDoctor, setAffiliationsByDoctor] = useState({})
  const [affiliationsById, setAffiliationsById] = useState({})
  const [hospitalsById, setHospitalsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [me, doctors, hospitals, affiliations] = await Promise.all([
        patientsApi.me(),
        doctorsApi.list().catch(() => []),
        hospitalsApi.list().catch(() => []),
        doctorsApi.affiliations().catch(() => []),
      ])
      setPatient(me)
      setDoctorsById(Object.fromEntries((doctors || []).map((d) => [d.doctor_id, d])))
      setAffiliationsByDoctor((affiliations || []).reduce((acc, aff) => {
        const key = aff.doctor_id
        acc[key] = [...(acc[key] || []), aff]
        return acc
      }, {}))
      setAffiliationsById(Object.fromEntries((affiliations || []).map((a) => [a.affiliation_id, a])))
      setHospitalsById(Object.fromEntries((hospitals || []).map((h) => [h.hospital_id, h])))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resolveDoctor = useCallback((id) => doctorsById[id] || null, [doctorsById])
  const resolveHospital = useCallback((id) => hospitalsById[id] || null, [hospitalsById])
  const resolveAffiliation = useCallback((id) => (id != null ? affiliationsById[id] || null : null), [affiliationsById])

  return (
    <PatientContext.Provider
      value={{
        patient,
        setPatient,
        doctorsById,
        affiliationsByDoctor,
        affiliationsById,
        hospitalsById,
        resolveDoctor,
        resolveHospital,
        resolveAffiliation,
        loading,
        error,
        reload: load,
      }}
    >
      {children}
    </PatientContext.Provider>
  )
}

export function usePatientCtx() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatientCtx must be used inside <PatientProvider>')
  return ctx
}
