import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { landingT } from './dict/landing.js'
import { dashboardT } from './dict/dashboard.js'

/**
 * Lightweight i18n for the patient-facing surfaces. The selected language is
 * persisted and also exposes a BCP-47 `speech` code so the voice helpers read /
 * listen in the same language the UI is showing.
 */
export const LANGS = {
  en: { label: 'English', speech: 'en-IN' },
  te: { label: 'తెలుగు', speech: 'te-IN' },
  hi: { label: 'हिंदी', speech: 'hi-IN' },
}

const coreT = {
  // ---- Navbar ----
  'nav.findDoctors': { en: 'Find Doctors', te: 'డాక్టర్లను కనుగొనండి', hi: 'डॉक्टर खोजें' },
  'nav.findClinics': { en: 'Find Clinics', te: 'క్లినిక్‌లను కనుగొనండి', hi: 'क्लिनिक खोजें' },
  'nav.healthArticles': { en: 'Health Articles', te: 'ఆరోగ్య వ్యాసాలు', hi: 'स्वास्थ्य लेख' },
  'nav.changeCity': { en: 'Change City', te: 'నగరం మార్చండి', hi: 'शहर बदलें' },
  'nav.loginSignup': { en: 'Login / Sign up', te: 'లాగిన్ / సైన్ అప్', hi: 'लॉगिन / साइन अप' },
  'nav.patient': { en: 'Patient', te: 'రోగి', hi: 'मरीज़' },
  'nav.doctor': { en: 'Doctor', te: 'డాక్టర్', hi: 'डॉक्टर' },
  'nav.patientDesc': { en: 'Book doctors & get tokens', te: 'డాక్టర్లను బుక్ చేసి టోకెన్ పొందండి', hi: 'डॉक्टर बुक करें और टोकन पाएं' },
  'nav.doctorDesc': { en: 'Manage patients & schedule', te: 'రోగులు & షెడ్యూల్ నిర్వహించండి', hi: 'मरीज़ और शेड्यूल प्रबंधित करें' },
  'nav.forClinics': { en: 'For Clinics', te: 'క్లినిక్‌ల కోసం', hi: 'क्लिनिक के लिए' },

  // ---- Hero ----
  'hero.line1': { en: 'Book appointment.', te: 'అపాయింట్‌మెంట్ బుక్ చేయండి.', hi: 'अपॉइंटमेंट बुक करें।' },
  'hero.line2': { en: 'Get token.', te: 'టోకెన్ పొందండి.', hi: 'टोकन पाएं।' },
  'hero.line3': { en: 'Travel at the right time.', te: 'సరైన సమయంలో బయలుదేరండి.', hi: 'सही समय पर निकलें।' },
  'hero.subtitle': {
    en: 'Skip the long queues. Book with trusted doctors & clinics and get your token before you visit.',
    te: 'పొడవైన క్యూలను తప్పించుకోండి. నమ్మకమైన డాక్టర్లు & క్లినిక్‌లతో బుక్ చేసి, రాకముందే మీ టోకెన్ పొందండి.',
    hi: 'लंबी कतारों से बचें। भरोसेमंद डॉक्टरों और क्लिनिक के साथ बुक करें और आने से पहले अपना टोकन पाएं।',
  },
  'hero.searchPlaceholder': {
    en: 'Search doctors, specialties, clinics, hospitals...',
    te: 'డాక్టర్లు, స్పెషాలిటీలు, క్లినిక్‌లు, ఆసుపత్రులు వెతకండి...',
    hi: 'डॉक्टर, विशेषज्ञता, क्लिनिक, अस्पताल खोजें...',
  },
  'hero.search': { en: 'Search', te: 'వెతకండి', hi: 'खोजें' },
  'hero.popular': { en: 'Popular Searches:', te: 'ప్రముఖ శోధనలు:', hi: 'लोकप्रिय खोजें:' },
  'hero.bookTitle': { en: 'Book Appointment', te: 'అపాయింట్‌మెంట్ బుక్ చేయండి', hi: 'अपॉइंटमेंट बुक करें' },
  'hero.bookSub': { en: 'Book with ease', te: 'సులభంగా బుక్ చేయండి', hi: 'आसानी से बुक करें' },
  'hero.tokenTitle': { en: 'Get Token', te: 'టోకెన్ పొందండి', hi: 'टोकन पाएं' },
  'hero.tokenSub': { en: 'Save time at the clinic', te: 'క్లినిక్‌లో సమయం ఆదా చేయండి', hi: 'क्लिनिक में समय बचाएं' },

  // ---- Lifeline ----
  'life.title': { en: 'Lifeline — 24/7 Emergency Support', te: 'లైఫ్‌లైన్ — 24/7 అత్యవసర సహాయం', hi: 'लाइफलाइन — 24/7 आपातकालीन सहायता' },
  'life.services': { en: 'Ambulance · Doctor on call · Emergency helpline', te: 'అంబులెన్స్ · డాక్టర్ ఆన్ కాల్ · అత్యవసర హెల్ప్‌లైన్', hi: 'एम्बुलेंस · डॉक्टर ऑन कॉल · आपातकालीन हेल्पलाइन' },
  'life.available': { en: 'Available now', te: 'ఇప్పుడు అందుబాటులో', hi: 'अभी उपलब्ध' },
  'life.avg': { en: 'Avg response', te: 'సగటు ప్రతిస్పందన', hi: 'औसत प्रतिक्रिया' },
  'life.call': { en: 'Call Lifeline', te: 'లైఫ్‌లైన్‌కు కాల్ చేయండి', hi: 'लाइफलाइन को कॉल करें' },
  'life.ambulance': { en: 'Request Ambulance', te: 'అంబులెన్స్ అభ్యర్థించండి', hi: 'एम्बुलेंस मंगाएं' },

  // ---- Patient voice / OTP auth ----
  'auth.title': { en: 'Patient Login', te: 'రోగి లాగిన్', hi: 'मरीज़ लॉगिन' },
  'auth.subtitle': { en: 'Use your mobile number — we will send an OTP.', te: 'మీ మొబైల్ నంబర్ వాడండి — మేము OTP పంపుతాము.', hi: 'अपना मोबाइल नंबर इस्तेमाल करें — हम OTP भेजेंगे।' },
  'auth.loginTab': { en: 'Login', te: 'లాగిన్', hi: 'लॉगिन' },
  'auth.signupTab': { en: 'Register', te: 'నమోదు', hi: 'रजिस्टर' },
  'auth.nameLabel': { en: 'Your full name', te: 'మీ పూర్తి పేరు', hi: 'आपका पूरा नाम' },
  'auth.namePrompt': { en: 'Please say or type your full name.', te: 'దయచేసి మీ పూర్తి పేరు చెప్పండి లేదా టైప్ చేయండి.', hi: 'कृपया अपना पूरा नाम बोलें या टाइप करें।' },
  'auth.mobileLabel': { en: 'Mobile number', te: 'మొబైల్ నంబర్', hi: 'मोबाइल नंबर' },
  'auth.mobilePrompt': { en: 'Please say or type your 10 digit mobile number.', te: 'దయచేసి మీ 10 అంకెల మొబైల్ నంబర్ చెప్పండి లేదా టైప్ చేయండి.', hi: 'कृपया अपना 10 अंकों का मोबाइल नंबर बोलें या टाइप करें।' },
  'auth.sendOtp': { en: 'Send OTP', te: 'OTP పంపండి', hi: 'OTP भेजें' },
  'auth.otpLabel': { en: 'Enter OTP', te: 'OTP నమోదు చేయండి', hi: 'OTP दर्ज करें' },
  'auth.otpPrompt': { en: 'You will get an O T P. Please say or type the 6 digit code.', te: 'మీకు OTP వస్తుంది. దయచేసి 6 అంకెల కోడ్ చెప్పండి లేదా టైప్ చేయండి.', hi: 'आपको OTP मिलेगा। कृपया 6 अंकों का कोड बोलें या टाइप करें।' },
  'auth.otpSentDemo': { en: 'OTP sent to +91 {phone}. Demo OTP: {otp}', te: '+91 {phone} కు OTP పంపబడింది. డెమో OTP: {otp}', hi: '+91 {phone} पर OTP भेजा गया। डेमो OTP: {otp}' },
  'auth.verifyLogin': { en: 'Verify & Continue', te: 'ధృవీకరించి కొనసాగండి', hi: 'सत्यापित करें और जारी रखें' },
  'auth.createAccount': { en: 'Create account', te: 'ఖాతా సృష్టించండి', hi: 'खाता बनाएं' },
  'auth.cityLabel': { en: 'City (optional)', te: 'నగరం (ఐచ్ఛికం)', hi: 'शहर (वैकल्पिक)' },
  'auth.back': { en: 'Back', te: 'వెనుకకు', hi: 'वापस' },
  'auth.listening': { en: 'Listening…', te: 'వింటోంది…', hi: 'सुन रहा है…' },
  'auth.tapMic': { en: 'Tap the mic and speak', te: 'మైక్ నొక్కి మాట్లాడండి', hi: 'माइक दबाएं और बोलें' },
  'auth.voiceUnsupported': { en: 'Voice is not supported on this browser — please type.', te: 'ఈ బ్రౌజర్‌లో వాయిస్ మద్దతు లేదు — దయచేసి టైప్ చేయండి.', hi: 'इस ब्राउज़र में वॉइस समर्थित नहीं है — कृपया टाइप करें।' },
  'auth.invalidMobile': { en: 'Enter a valid 10-digit mobile number.', te: 'సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.', hi: 'सही 10 अंकों का मोबाइल नंबर दर्ज करें।' },
  'auth.success': { en: 'Success! Taking you to your dashboard…', te: 'విజయం! మీ డ్యాష్‌బోర్డ్‌కు తీసుకెళ్తున్నాం…', hi: 'सफल! आपको डैशबोर्ड पर ले जा रहे हैं…' },
  'auth.notRegistered': { en: 'This number is not registered. Please register.', te: 'ఈ నంబర్ నమోదు కాలేదు. దయచేసి నమోదు చేయండి.', hi: 'यह नंबर पंजीकृत नहीं है। कृपया रजिस्टर करें।' },
  'auth.doctorEmail': { en: 'Doctors log in with email & password.', te: 'డాక్టర్లు ఇమెయిల్ & పాస్‌వర్డ్‌తో లాగిన్ అవుతారు.', hi: 'डॉक्टर ईमेल और पासवर्ड से लॉगिन करते हैं।' },
  'auth.staffNumber': { en: 'This number belongs to a staff account. Please use the clinic/staff login.', te: 'ఈ నంబర్ సిబ్బంది ఖాతాకు చెందినది. దయచేసి క్లినిక్/సిబ్బంది లాగిన్ వాడండి.', hi: 'यह नंबर स्टाफ खाते का है। कृपया क्लिनिक/स्टाफ लॉगिन का उपयोग करें।' },
}

// Core (navbar/hero/lifeline/auth) merged with the Phase-2 landing + dashboard dicts.
const T = { ...coreT, ...landingT, ...dashboardT }

const Ctx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('dm.lang')
    return saved && LANGS[saved] ? saved : 'en'
  })
  const setLang = useCallback((l) => {
    if (LANGS[l]) {
      setLangState(l)
      try { localStorage.setItem('dm.lang', l) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key, vars) => {
      const entry = T[key]
      let str = (entry && (entry[lang] ?? entry.en)) ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v)
      return str
    },
    [lang],
  )

  return <Ctx.Provider value={{ lang, setLang, t, speech: LANGS[lang].speech }}>{children}</Ctx.Provider>
}

export function useI18n() {
  return useContext(Ctx) || { lang: 'en', setLang: () => {}, t: (k) => k, speech: 'en-IN' }
}
