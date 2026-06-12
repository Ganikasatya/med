import {
  Activity, Bell, CalendarDays, ClipboardList, FlaskConical, HeartPulse,
  Home, MessageSquare, PackageCheck, Search, Users, UsersRound,
} from 'lucide-react'

export const COMPOUNDER = {
  name: 'Anita Devi',
  initials: 'AD',
  role: 'Nurse / Compounder',
  clinic: 'Sri Sai Ram Clinic',
  location: 'Karimnagar, Telangana',
  notifications: 5,
}

export const COMPOUNDER_NAV = [
  { label: 'Dashboard', to: '', icon: Home, end: true },
  { section: 'Appointments' },
  { label: "Today's Queue", to: 'queue', icon: CalendarDays },
  { label: 'Upcoming Appointments', to: 'appointments', icon: ClipboardList },
  { section: 'Patient Management' },
  { label: 'Patient Search', to: 'patient-search', icon: Search },
  { label: 'Patient List', to: 'patients', icon: UsersRound },
  { section: 'Clinical' },
  { label: 'Vitals & Measurements', to: 'vitals', icon: HeartPulse },
  { label: 'Lab Test Orders', to: 'lab-orders', icon: FlaskConical },
  { label: 'Prescriptions (History)', to: 'prescriptions', icon: ClipboardList },
  { label: 'Medicine Dispensed', to: 'medicines', icon: PackageCheck },
  { section: 'Communication' },
  { label: 'Messages', to: 'messages', icon: MessageSquare },
  { label: 'Notifications', to: 'notifications', icon: Bell },
]

export const QUEUE = [
  { token: 18, patient: 'Ravi Kumar', pid: 'P123456', age: '45 Y / Male', status: 'In Consultation', wait: '-', doctor: 'Dr. Ramesh Kumar' },
  { token: 19, patient: 'Sunita Devi', pid: 'P123457', age: '38 Y / Female', status: 'Waiting', wait: '~10 mins', doctor: 'Dr. Ramesh Kumar' },
  { token: 20, patient: 'Mohd. Imran', pid: 'P123458', age: '30 Y / Male', status: 'Waiting', wait: '~20 mins', doctor: 'Dr. Ramesh Kumar' },
  { token: 21, patient: 'Laxmi Bai', pid: 'P123459', age: '52 Y / Female', status: 'Waiting', wait: '~30 mins', doctor: 'Dr. Ramesh Kumar' },
  { token: 22, patient: 'Ramesh Babu', pid: 'P123460', age: '60 Y / Male', status: 'Scheduled', wait: '-', doctor: 'Dr. Ramesh Kumar' },
  { token: 23, patient: 'Prakash Singh', pid: 'P123461', age: '55 Y / Male', status: 'Scheduled', wait: '-', doctor: 'Dr. Ramesh Kumar' },
]

export const PATIENTS = [
  { patient: 'Ravi Kumar', pid: 'P123456', age: '45 Y / Male', mobile: '98765XXXXXX', blood: 'B+', lastVisit: '24 May 2025, 09:05 AM', visits: 3, status: 'Active' },
  { patient: 'Sunita Devi', pid: 'P123457', age: '38 Y / Female', mobile: '98765XXXXXX', blood: 'O+', lastVisit: '24 May 2025, 09:20 AM', visits: 2, status: 'Active' },
  { patient: 'Mohd. Imran', pid: 'P123458', age: '30 Y / Male', mobile: '98765XXXXXX', blood: 'A+', lastVisit: '24 May 2025, 09:35 AM', visits: 1, status: 'Active' },
  { patient: 'Laxmi Bai', pid: 'P123459', age: '52 Y / Female', mobile: '98765XXXXXX', blood: 'AB+', lastVisit: '24 May 2025, 09:50 AM', visits: 4, status: 'Active' },
  { patient: 'Ramesh Babu', pid: 'P123460', age: '60 Y / Male', mobile: '98765XXXXXX', blood: 'B+', lastVisit: '24 May 2025, 10:30 AM', visits: 2, status: 'Active' },
  { patient: 'Prakash Singh', pid: 'P123461', age: '55 Y / Male', mobile: '98765XXXXXX', blood: 'O-', lastVisit: '24 May 2025, 11:15 AM', visits: 1, status: 'Inactive' },
]

export const APPOINTMENTS = QUEUE.slice(1).map((p, index) => ({
  ...p,
  time: ['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM'][index],
  type: index % 2 ? 'Follow-up' : 'New Patient',
}))

export const VITALS = [
  { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', tone: 'rose' },
  { label: 'Heart Rate', value: '78', unit: 'bpm', tone: 'red' },
  { label: 'SpO2', value: '98', unit: '%', tone: 'blue' },
  { label: 'Temperature', value: '98.6', unit: '°F', tone: 'purple' },
  { label: 'Respiratory Rate', value: '18', unit: 'breaths/min', tone: 'green' },
  { label: 'BMI', value: '24.7', unit: 'kg/m²', tone: 'orange' },
  { label: 'Weight', value: '70.2', unit: 'kg', tone: 'cyan' },
]

export const VITAL_HISTORY = [
  { date: '24 May 2025, 09:05 AM', bp: '120/80', heart: 78, spo2: 98, temp: 98.6, respiratory: 18, weight: 70.2, bmi: 24.7 },
  { date: '10 May 2025, 10:30 AM', bp: '118/76', heart: 72, spo2: 99, temp: 98.4, respiratory: 17, weight: 69.8, bmi: 24.5 },
  { date: '26 Apr 2025, 11:15 AM', bp: '122/82', heart: 80, spo2: 97, temp: 99.1, respiratory: 18, weight: 70.5, bmi: 24.9 },
  { date: '12 Apr 2025, 09:40 AM', bp: '116/74', heart: 75, spo2: 98, temp: 98.4, respiratory: 16, weight: 69.5, bmi: 24.3 },
]

export const PRESCRIPTIONS = [
  { date: '24 May 2025, 09:05 AM', doctor: 'Dr. Ramesh Kumar', type: 'Consultation', diagnosis: 'Fever, Headache', medicines: '4 Medicines', duration: '5 Days', status: 'Active' },
  { date: '10 May 2025, 10:30 AM', doctor: 'Dr. Ramesh Kumar', type: 'Consultation', diagnosis: 'Cough, Cold', medicines: '3 Medicines', duration: '5 Days', status: 'Completed' },
  { date: '26 Apr 2025, 11:15 AM', doctor: 'Dr. Ramesh Kumar', type: 'Follow-up', diagnosis: 'BP Check', medicines: '2 Medicines', duration: '10 Days', status: 'Completed' },
  { date: '12 Apr 2025, 09:40 AM', doctor: 'Dr. Ramesh Kumar', type: 'Consultation', diagnosis: 'Acidity', medicines: '3 Medicines', duration: '5 Days', status: 'Completed' },
]

export const MEDICINES = [
  { date: '24 May 2025, 09:15 AM', patient: 'Ravi Kumar', pid: 'P123456', doctor: 'Dr. Ramesh Kumar', medicines: 'Paracetamol 650mg, Cetirizine 10mg', items: 4, status: 'Dispensed' },
  { date: '24 May 2025, 09:40 AM', patient: 'Sunita Devi', pid: 'P123457', doctor: 'Dr. Ramesh Kumar', medicines: 'Amoxicillin 500mg, Pantoprazole 40mg', items: 3, status: 'Dispensed' },
  { date: '24 May 2025, 10:00 AM', patient: 'Mohd. Imran', pid: 'P123458', doctor: 'Dr. Ajay Sharma', medicines: 'Ibuprofen 400mg, Dolo 650mg', items: 3, status: 'Dispensed' },
  { date: '23 May 2025, 06:20 PM', patient: 'Laxmi Bai', pid: 'P123459', doctor: 'Dr. Ramesh Kumar', medicines: 'Metformin 500mg, Glimepiride 1mg', items: 3, status: 'Dispensed' },
]

export const NOTIFICATIONS = [
  { title: 'New appointment scheduled', desc: 'Ravi Kumar with Dr. Ramesh Kumar at 11:30 AM', time: '10:15 AM', tone: 'green' },
  { title: 'Prescription ready', desc: 'Prescription for Sunita Devi is ready for dispensing.', time: '09:50 AM', tone: 'orange' },
  { title: 'Lab report uploaded', desc: 'Lab report for Mohd. Imran has been uploaded.', time: '09:20 AM', tone: 'purple' },
  { title: 'New message', desc: 'You have a new message from Dr. Ramesh Kumar.', time: '09:10 AM', tone: 'blue' },
  { title: 'Medicine stock low', desc: 'Amoxicillin 500mg stock is running low.', time: 'Yesterday', tone: 'red' },
]

export const DASHBOARD_STATS = [
  { label: "Today's Appointments", value: 42, sub: 'Total', icon: CalendarDays, tone: 'blue' },
  { label: 'Arrived', value: 24, sub: '57% of total', icon: Users, tone: 'green' },
  { label: 'In Queue / Waiting', value: 9, sub: '21% of total', icon: UsersRound, tone: 'orange' },
  { label: 'Consulted', value: 7, sub: '17% of total', icon: Activity, tone: 'purple' },
]
