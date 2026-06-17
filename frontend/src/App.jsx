import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { I18nProvider } from './i18n/index.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ClinicLogin from './pages/ClinicLogin.jsx'
import ClinicSignup from './pages/ClinicSignup.jsx'

import PatientLayout from './components/patient/PatientLayout.jsx'
import PatientHome from './pages/patient/Dashboard.jsx'
import PatientAppointments from './pages/patient/Appointments.jsx'
import PatientBookAppointmentStart from './pages/patient/BookAppointmentStart.jsx'
import PatientBookAppointment from './pages/patient/BookAppointment.jsx'
import PatientBookByVoice from './pages/patient/BookByVoice.jsx'
import PatientPrescriptions from './pages/patient/Prescriptions.jsx'
import PatientDoctors from './pages/patient/Doctors.jsx'
import PatientClinics from './pages/patient/Clinics.jsx'
import PatientHealthRecords from './pages/patient/HealthRecords.jsx'
import PatientPayments from './pages/patient/Payments.jsx'
import PatientNotifications from './pages/patient/Notifications.jsx'
import PatientProfile from './pages/patient/Profile.jsx'
import PatientHelp from './pages/patient/Help.jsx'

import ClinicLayout from './components/clinic/ClinicLayout.jsx'
import ClinicHome from './pages/clinic/Dashboard.jsx'
import OpQueue from './pages/clinic/OpQueue.jsx'
import Appointments from './pages/clinic/Appointments.jsx'
import WalkIns from './pages/clinic/WalkIns.jsx'
import Doctors from './pages/clinic/Doctors.jsx'
import Departments from './pages/clinic/Departments.jsx'
import Staff from './pages/clinic/Staff.jsx'
import ComingSoon from './pages/assistant/ComingSoon.jsx'
import Availability from './pages/clinic/Availability.jsx'
import Reports from './pages/clinic/Reports.jsx'
import ClinicProfile from './pages/clinic/Profile.jsx'

import DoctorLayout from './components/doctor/DoctorLayout.jsx'
import DoctorHome from './pages/doctor/Dashboard.jsx'
import DoctorToday from './pages/doctor/Today.jsx'
import DoctorAllAppointments from './pages/doctor/AllAppointments.jsx'
import DoctorCancellations from './pages/doctor/Cancellations.jsx'
import DoctorLiveQueue from './pages/doctor/LiveQueue.jsx'
import DoctorTokenHistory from './pages/doctor/TokenHistory.jsx'
import DoctorDelayAlert from './pages/doctor/DelayAlert.jsx'
import DoctorAvailability from './pages/doctor/Availability.jsx'
import DoctorHolidays from './pages/doctor/Holidays.jsx'
import DoctorFees from './pages/doctor/Fees.jsx'
import DoctorPatients from './pages/doctor/Patients.jsx'
import DoctorReports from './pages/doctor/Reports.jsx'
import DoctorAnalytics from './pages/doctor/Analytics.jsx'
import DoctorNotifications from './pages/doctor/Notifications.jsx'
import DoctorMessages from './pages/doctor/Messages.jsx'
import DoctorProfile from './pages/doctor/Profile.jsx'
import DoctorStaff from './pages/doctor/Staff.jsx'
import DoctorSettings from './pages/doctor/Settings.jsx'

import RequireAuth from './components/common/RequireAuth.jsx'
import Approvals from './pages/admin/Approvals.jsx'
import AssistantLayout from './components/assistant/AssistantLayout.jsx'
import AssistantHome from './pages/assistant/Dashboard.jsx'
import AssistantQueue from './pages/assistant/Queue.jsx'
import AssistantWalkIn from './pages/assistant/WalkIn.jsx'
import AssistantAppointments from './pages/assistant/Appointments.jsx'
import AssistantPatients from './pages/assistant/Patients.jsx'
import AssistantNotifications from './pages/assistant/Notifications.jsx'

/**
 * Root application + routing.
 *
 * Patient & Doctor auth happens in a modal launched from the Navbar dropdown.
 * The clinic and doctor consoles are nested layouts (shared sidebar/topbar)
 * with pages swapped via <Outlet/>.
 */
function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/clinic-login" element={<ClinicLogin />} />
          <Route path="/clinic-signup" element={<ClinicSignup />} />

          {/* Patient console */}
          <Route
            path="/patient-dashboard"
            element={
              <RequireAuth roles={['PATIENT']} loginPath="/">
                <PatientLayout />
              </RequireAuth>
            }
          >
            <Route index element={<PatientHome />} />
            <Route path="appointments/book" element={<PatientBookAppointmentStart />} />
            <Route path="appointments/voice" element={<PatientBookByVoice />} />
            <Route path="appointments/new" element={<PatientBookAppointment />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="prescriptions" element={<PatientPrescriptions />} />
            <Route path="doctors" element={<PatientDoctors />} />
            <Route path="clinics" element={<PatientClinics />} />
            <Route path="health-records" element={<PatientHealthRecords />} />
            <Route path="payments" element={<PatientPayments />} />
            <Route path="notifications" element={<PatientNotifications />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="help" element={<PatientHelp />} />
          </Route>

          {/* Clinic console — admin only */}
          <Route
            path="/clinic-dashboard"
            element={
              <RequireAuth roles={['HOSPITAL_ADMIN', 'SUPER_ADMIN']} loginPath="/clinic-login">
                <ClinicLayout />
              </RequireAuth>
            }
          >
            <Route index element={<ClinicHome />} />
            <Route path="op-queue" element={<OpQueue />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="walk-ins" element={<WalkIns />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="departments" element={<Departments />} />
            <Route path="staff" element={<Staff />} />
            <Route path="availability" element={<Availability />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<ClinicProfile />} />
          </Route>

          {/* Super-Admin clinic approvals */}
          <Route
            path="/admin/approvals"
            element={
              <RequireAuth roles={['SUPER_ADMIN']} loginPath="/clinic-login">
                <Approvals />
              </RequireAuth>
            }
          />

          {/* Assistant (front-desk / receptionist) console */}
          <Route
            path="/assistant-dashboard"
            element={
              <RequireAuth roles={['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']} loginPath="/clinic-login">
                <AssistantLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AssistantHome />} />
            <Route path="queue" element={<AssistantQueue />} />
            <Route path="walk-in" element={<AssistantWalkIn />} />
            <Route path="appointments" element={<AssistantAppointments />} />
            <Route path="patient-search" element={<AssistantPatients />} />
            <Route path="patients" element={<AssistantPatients />} />
            <Route path="vitals" element={<ComingSoon title="Vitals & Measurements" subtitle="Record and track patient vitals." />} />
            <Route path="lab-tests" element={<ComingSoon title="Lab Test Orders" subtitle="Order and track lab tests." />} />
            <Route path="medicines" element={<ComingSoon title="Medicine Dispensed" subtitle="Dispense and track medicines." />} />
            <Route path="messages" element={<ComingSoon title="Messages" subtitle="Patient and team messaging." />} />
            <Route path="notifications" element={<AssistantNotifications />} />
          </Route>

          {/* Doctor console */}
          <Route
            path="/doctor-dashboard"
            element={
              <RequireAuth roles={['DOCTOR']} loginPath="/">
                <DoctorLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DoctorHome />} />
            <Route path="today" element={<DoctorToday />} />
            <Route path="appointments" element={<DoctorAllAppointments />} />
            <Route path="cancellations" element={<DoctorCancellations />} />
            <Route path="queue" element={<DoctorLiveQueue />} />
            <Route path="token-history" element={<DoctorTokenHistory />} />
            <Route path="delay-alert" element={<DoctorDelayAlert />} />
            <Route path="availability" element={<DoctorAvailability />} />
            <Route path="holidays" element={<DoctorHolidays />} />
            <Route path="fees" element={<DoctorFees />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="reports" element={<DoctorReports />} />
            <Route path="analytics" element={<DoctorAnalytics />} />
            <Route path="notifications" element={<DoctorNotifications />} />
            <Route path="messages" element={<DoctorMessages />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="staff" element={<DoctorStaff />} />
            <Route path="settings" element={<DoctorSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </I18nProvider>
  )
}

export default App
