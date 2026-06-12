import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ClinicLogin from './pages/ClinicLogin.jsx'
import ClinicSignup from './pages/ClinicSignup.jsx'

import PatientLayout from './components/patient/PatientLayout.jsx'
import PatientHome from './pages/patient/Dashboard.jsx'
import PatientAppointments from './pages/patient/Appointments.jsx'
import PatientTokens from './pages/patient/Tokens.jsx'
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
import Availability from './pages/clinic/Availability.jsx'
import Reports from './pages/clinic/Reports.jsx'

import DoctorLayout from './components/doctor/DoctorLayout.jsx'
import DoctorHome from './pages/doctor/Dashboard.jsx'
import DoctorToday from './pages/doctor/Today.jsx'
import DoctorAllAppointments from './pages/doctor/AllAppointments.jsx'
import DoctorWalkIn from './pages/doctor/WalkIn.jsx'
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
import CompounderLayout from './components/compounder/CompounderLayout.jsx'
import CompounderHome from './pages/compounder/Dashboard.jsx'
import CompounderWorkspace from './pages/compounder/Workspace.jsx'

/**
 * Root application + routing.
 *
 * Patient & Doctor auth happens in a modal launched from the Navbar dropdown.
 * The clinic and doctor consoles are nested layouts (shared sidebar/topbar)
 * with pages swapped via <Outlet/>.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/clinic-login" element={<ClinicLogin />} />
          <Route path="/clinic-signup" element={<ClinicSignup />} />

          {/* Patient console */}
          <Route path="/patient-dashboard" element={<PatientLayout />}>
            <Route index element={<PatientHome />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="tokens" element={<PatientTokens />} />
            <Route path="prescriptions" element={<PatientPrescriptions />} />
            <Route path="doctors" element={<PatientDoctors />} />
            <Route path="clinics" element={<PatientClinics />} />
            <Route path="health-records" element={<PatientHealthRecords />} />
            <Route path="payments" element={<PatientPayments />} />
            <Route path="notifications" element={<PatientNotifications />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="help" element={<PatientHelp />} />
          </Route>

          {/* Clinic console */}
          <Route path="/clinic-dashboard" element={<ClinicLayout />}>
            <Route index element={<ClinicHome />} />
            <Route path="op-queue" element={<OpQueue />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="walk-ins" element={<WalkIns />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="availability" element={<Availability />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Doctor console */}
          <Route path="/doctor-dashboard" element={<DoctorLayout />}>
            <Route index element={<DoctorHome />} />
            <Route path="today" element={<DoctorToday />} />
            <Route path="appointments" element={<DoctorAllAppointments />} />
            <Route path="walk-in" element={<DoctorWalkIn />} />
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

          {/* Compounder / nurse console */}
          <Route path="/compounder-dashboard" element={<CompounderLayout />}>
            <Route index element={<CompounderHome />} />
            <Route path="queue" element={<CompounderWorkspace type="queue" />} />
            <Route path="appointments" element={<CompounderWorkspace type="appointments" />} />
            <Route path="patient-search" element={<CompounderWorkspace type="patient-search" />} />
            <Route path="patients" element={<CompounderWorkspace type="patients" />} />
            <Route path="vitals" element={<CompounderWorkspace type="vitals" />} />
            <Route path="lab-orders" element={<CompounderWorkspace type="lab-orders" />} />
            <Route path="prescriptions" element={<CompounderWorkspace type="prescriptions" />} />
            <Route path="medicines" element={<CompounderWorkspace type="medicines" />} />
            <Route path="messages" element={<CompounderWorkspace type="messages" />} />
            <Route path="notifications" element={<CompounderWorkspace type="notifications" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
