import { CalendarDays, Ticket, MapPin, FileText } from 'lucide-react'
import DashboardStub from './DashboardStub.jsx'

function PatientDashboard() {
  return (
    <DashboardStub
      title="Welcome to TapCure"
      subtitle="Book appointments, manage tokens, and track your health."
      cards={[
        { icon: CalendarDays, label: 'Book Appointment' },
        { icon: Ticket, label: 'My Tokens' },
        { icon: MapPin, label: 'Nearby Clinics' },
        { icon: FileText, label: 'Health Records' },
      ]}
    />
  )
}

export default PatientDashboard
