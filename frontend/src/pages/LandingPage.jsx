import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, MapPin, CalendarDays, Ticket, ChevronRight, ChevronDown,
  Stethoscope, ShieldCheck, Clock, Users, Sparkles, HeartPulse,
  Phone, Ambulance, Star, Quote, Apple, Play, Download,
  Calculator, IndianRupee, Headphones, ArrowRight, User, Menu, X, BookOpen,
} from 'lucide-react'
import { HEALTH_CALCULATORS, BRAND } from '../data/landingData.js'
import { CALCULATORS } from '../lib/calculators.js'
import CalculatorModal from '../components/landing/CalculatorModal.jsx'
import JourneySection from '../components/landing/JourneySection.jsx'
import LandingGuide from '../components/landing/LandingGuide.jsx'
import { AuthModalProvider, useAuthModal } from '../context/AuthModalContext.jsx'
import { useI18n, LANGS } from '../i18n/index.jsx'

/**
 * TapCure landing page — a faithful port of the "sweet-looker" editorial
 * reference (warm cream paper, deep-forest ink, sage/clay accents, Instrument
 * Serif display type), wired to med's real flows: the search / CTA / auth
 * buttons open the patient auth modal, the health-tool list opens the existing
 * CalculatorModal, and the language switcher drives i18n.
 *
 * The one addition kept from the previous design is our detailed 6-step
 * <JourneySection /> ("the past one"), inserted below the quick how-it-works.
 */
const POPULAR = ['General Physician', 'Pediatrician', 'Dermatologist', 'Cardiologist', 'Dentist']

const FEATURES = [
  { icon: ShieldCheck, title: 'Verified doctors', desc: 'Every clinician is credential-checked before joining TapCure.' },
  { icon: Clock, title: 'Live token tracking', desc: 'Know your exact turn — no waiting rooms, no guesswork.' },
  { icon: HeartPulse, title: 'Family health record', desc: 'One place for prescriptions, reports and vitals across your family.' },
  { icon: Users, title: 'Multi-lingual care', desc: 'Search, book and talk to doctors in Hindi, Telugu, Tamil and English.' },
  { icon: Sparkles, title: 'Follow-up reminders', desc: 'Gentle WhatsApp nudges so no dose or check-up gets missed.' },
  { icon: Stethoscope, title: 'Trusted clinics', desc: 'From your neighbourhood GP to specialty hospitals — all in one app.' },
]

const STEPS = [
  { n: '01', title: 'Search', icon: Search, desc: 'Find doctors, clinics or specialties near you in seconds.' },
  { n: '02', title: 'Book', icon: BookOpen, desc: 'Pick a slot that fits your day — instant confirmation.' },
  { n: '03', title: 'Get token', icon: Ticket, desc: 'Live queue position, right in your pocket.' },
  { n: '04', title: 'Visit on time', icon: Clock, desc: 'Walk in, get seen, walk out — the day stays yours.' },
]

// Testimonials for the hover-accordion row.
const TESTIMONIALS = [
  { name: 'Ramya S.', city: 'Hyderabad', quote: "Booking Amma's cardiology check-up is now a two-minute thing — and I actually know when she'll be seen." },
  { name: 'Arjun K.', city: 'Vijayawada', quote: 'The live token saved me a whole morning at the clinic. No more waiting rooms, no guesswork.' },
  { name: 'Meera P.', city: 'Guntur', quote: "All my family's prescriptions and reports live in one place. It's the calmest we've felt about our health." },
  { name: 'Sanjay R.', city: 'Visakhapatnam', quote: 'Booked a pediatrician for my son in Telugu, in seconds. Beautifully simple for my parents too.' },
  { name: 'Divya N.', city: 'Chennai', quote: 'The WhatsApp reminders mean we never miss a follow-up or a dose anymore. Total peace of mind.' },
  { name: 'Kiran V.', city: 'Bengaluru', quote: 'From our neighbourhood GP to a specialty hospital — everything we need is in one calm little app.' },
]

function LandingPage() {
  return (
    <AuthModalProvider>
      <div className="theme-editorial editorial-grain relative isolate h-screen w-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-emerald-50 via-background to-teal-50 text-foreground">
        {/* Fixed colour blobs behind everything — give the frosted glass surfaces
            something to blur as the page scrolls over them. */}
        <div aria-hidden="true" className="pointer-events-none fixed -left-40 top-8 -z-10 h-[34rem] w-[34rem] rounded-full bg-teal-300/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none fixed -right-32 top-1/3 -z-10 h-[36rem] w-[36rem] rounded-full bg-emerald-300/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none fixed -bottom-24 left-1/3 -z-10 h-[30rem] w-[30rem] rounded-full bg-green-200/30 blur-3xl" />

        <LandingGuide />
        <Nav />
        <main>
          <Hero />
          <HowItWorks />
          <FeatureBand />
          <JourneySection />
          <Testimonial />
          <AppBanner />
        </main>
        <Footer />
      </div>
    </AuthModalProvider>
  )
}

const ROLES = [
  { role: 'patient', icon: User, label: 'Patient', desc: 'Book & track your visits' },
  { role: 'doctor', icon: Stethoscope, label: 'Doctor', desc: 'Manage your queue' },
]
const NAV_LINKS = [
  { key: 'why', label: `Why ${BRAND.name}`, href: '#features' },
  { key: 'doctors', label: 'Find doctors', role: 'patient' },
  { key: 'clinics', label: 'Find clinics', role: 'patient' },
  { key: 'tools', label: 'Health tools', href: '#calculators' },
  { key: 'how', label: 'How it works', href: '#journey' },
  { key: 'app', label: 'Get the app', href: '#app' },
]

function Nav() {
  const navigate = useNavigate()
  const { openAuth } = useAuthModal()
  const { lang, setLang } = useI18n()
  const [langOpen, setLangOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setLangOpen(false)
        setRoleOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const go = (role) => { setRoleOpen(false); setMobileOpen(false); openAuth(role) }
  const clinic = () => { setMobileOpen(false); navigate('/clinic-login') }

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100/70 bg-gradient-to-r from-emerald-50/85 via-teal-50/75 to-emerald-50/85 backdrop-blur">
      <div ref={wrapRef} className="mx-auto flex h-20 max-w-none items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="h-6 w-6" />
          </span>
          <span className="font-serif text-3xl tracking-tight">{BRAND.name}</span>
        </a>

        <nav className="hidden items-center gap-2 text-sm lg:flex">
          {NAV_LINKS.map((l) => (
            l.href ? (
              <a key={l.key} href={l.href} className="nav-pill whitespace-nowrap">{l.label}</a>
            ) : (
              <button key={l.key} onClick={() => go(l.role)} className="nav-pill whitespace-nowrap">{l.label}</button>
            )
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <button
              onClick={() => { setLangOpen((o) => !o); setRoleOpen(false) }}
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100"
            >
              {LANGS[lang].label} <ChevronDown className={`h-4 w-4 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <ul className="absolute right-0 top-full z-40 mt-1 w-32 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lift">
                {Object.entries(LANGS).map(([code, meta]) => (
                  <li key={code}>
                    <button
                      onClick={() => { setLang(code); setLangOpen(false) }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted ${code === lang ? 'font-semibold text-sage-deep' : 'text-ink-soft'}`}
                    >
                      {meta.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={clinic} className="btn-ghost rounded-full px-4 py-2 text-sm font-medium">
            For clinics
          </button>

          <div className="relative">
            <button
              onClick={() => { setRoleOpen((o) => !o); setLangOpen(false) }}
              className="btn-sweep inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
            >
              Log in / Sign up <ChevronDown className={`h-4 w-4 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
            </button>
            {roleOpen && (
              <ul className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-card py-1.5 shadow-lift">
                {ROLES.map(({ role, icon: Icon, label, desc }) => (
                  <li key={role}>
                    <button onClick={() => go(role)} className="btn-sweep-menu flex w-full items-center gap-3 px-4 py-2.5 text-left">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/50 text-sage-deep"><Icon className="h-5 w-5" /></span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{label}</span>
                        <span className="block text-[11px] text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 lg:hidden">
          <div className="grid gap-2">
            {ROLES.map(({ role, icon: Icon, label }) => (
              <button key={role} onClick={() => go(role)} className="btn-sweep-menu flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/50 text-sage-deep"><Icon className="h-5 w-5" /></span>
                <span className="text-sm font-semibold">{label} — log in / sign up</span>
              </button>
            ))}
            <button onClick={clinic} className="btn-sweep-menu flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/50 text-sage-deep"><HeartPulse className="h-5 w-5" /></span>
              <span className="text-sm font-semibold">For clinics</span>
            </button>
          </div>

          <div className="mt-3 grid gap-1 border-t border-border pt-3 text-sm">
            {NAV_LINKS.map((l) => (
              l.href ? (
                <a key={l.key} href={l.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-2 py-2 text-ink-soft hover:bg-muted">
                  {l.label}
                </a>
              ) : (
                <button key={l.key} onClick={() => go(l.role)} className="rounded-lg px-2 py-2 text-left text-ink-soft hover:bg-muted">
                  {l.label}
                </button>
              )
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            {Object.entries(LANGS).map(([code, meta]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${code === lang ? 'border-sage-deep bg-sage/30 text-sage-deep' : 'border-border text-ink-soft'}`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  const { openAuth } = useAuthModal()
  const start = () => openAuth('patient')
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-100/70 via-teal-50/50 to-transparent">
      <div className="pointer-events-none absolute -left-32 top-16 -z-10 h-96 w-96 rounded-full bg-teal-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/4 -z-10 h-[26rem] w-[26rem] rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-2/3 -z-10 h-72 w-72 rounded-full bg-green-200/40 blur-3xl" />

      <div className="mx-auto grid max-w-none items-center gap-8 px-4 pb-10 pt-8 sm:px-6 lg:items-stretch lg:px-6 lg:h-[calc(100vh-5rem)] lg:grid-cols-[260px_1fr] lg:gap-8 lg:pb-6 lg:pt-6">
        <CalculatorRail />
        <div className="order-1 grid items-stretch gap-8 lg:order-2 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10">
        <div className="relative flex h-full flex-col justify-center gap-5 lg:justify-between lg:py-3">
          <span className="trust-glow inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-deep" />
            Trusted by 40,000+ families across South India
          </span>

          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.03]">
            Care your family
            <br />
            can actually <em className="grad-text">count on.</em>
          </h1>

          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
            Find the right doctor, book an appointment, and skip the waiting room —
            all in one calm, unhurried place built for real families.
          </p>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3 px-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Doctor, specialty or symptom"
                onKeyDown={(e) => e.key === 'Enter' && start()}
                className="w-full bg-transparent py-3 text-[15px] placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="hidden items-center gap-2 border-l border-border px-4 sm:flex">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{BRAND.city}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <button onClick={start} className="sparkle-btn shrink-0 self-center">
              <svg className="sparkle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="path" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                <path className="path" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                <path className="path" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
              </svg>
              <span className="text_button">Search</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Popular:</span>
            {POPULAR.map((p) => (
              <button key={p} onClick={start} className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-ink-soft transition-colors hover:border-sage-deep hover:text-sage-deep">
                {p}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CtaCard icon={CalendarDays} title="Book appointment" sub="Choose a slot in seconds" tone="sage" onClick={start} />
            <CtaCard icon={Ticket} title="Get a live token" sub="Track your turn in real time" tone="clay" onClick={start} />
          </div>
        </div>

        <div className="relative lg:flex lg:items-center">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift lg:h-[76vh]">
            <img
              src="/hero-family.jpg"
              alt="A family checking their doctor appointment together"
              width={1280}
              height={1280}
              className="aspect-square h-full w-full object-cover lg:aspect-auto"
            />
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-background/85 p-4 backdrop-blur">
              <div>
                <p className="font-serif text-lg leading-tight">Dr. Priya Menon</p>
                <p className="text-xs text-muted-foreground">General Physician · Today 4:30 PM</p>
              </div>
              <span className="rounded-full bg-sage-deep px-3 py-1 text-xs font-medium text-primary-foreground">
                Token #12
              </span>
            </div>
          </div>

          <div className="absolute -right-3 bottom-24 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-lift lg:block">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-clay/30">
                <Star className="h-4 w-4 fill-clay text-clay" />
              </span>
              <div className="text-xs">
                <p className="font-semibold">4.9 · 12k reviews</p>
                <p className="text-muted-foreground">Loved by families</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}

function CalculatorRail() {
  const { t } = useI18n()
  const [active, setActive] = useState(null)
  return (
    <aside id="calculators" className="order-2 lg:order-1 lg:h-full">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft lg:flex lg:h-full lg:flex-col">
        <div className="mb-2 flex items-center gap-3 border-b border-border pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage/40 text-sage-deep">
            <Calculator className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-serif text-lg leading-none">{t('calc.sidebarTitle')}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('calc.promoLine1')}</p>
          </div>
        </div>
        <ul className="flex flex-col lg:flex-1 lg:justify-around lg:py-2">
          {HEALTH_CALCULATORS.map(({ label, short, icon: Icon }) => (
            <li key={label}>
              <button
                onClick={() => CALCULATORS[label] && setActive(label)}
                className="calc-item group flex w-full items-center gap-2.5 rounded-xl pl-3 pr-2 py-2 text-left transition-colors hover:bg-sage/25"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-[10px] font-bold tracking-tight text-sage-deep">
                  {short ? short : <Icon className="h-4 w-4" />}
                </span>
                <span className="calc-label flex-1 text-[13px] font-medium transition-colors">{t(`calc.label.${label}`)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-2xl bg-sage/30 p-3">
          <p className="text-[13px] font-medium leading-snug">
            {t('calc.promoLine1')}<br />{t('calc.promoLine2')}
          </p>
          <button
            onClick={() => setActive('BMI Calculator')}
            className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-sage-deep hover:gap-1.5"
          >
            {t('calc.explore')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <CalculatorModal name={active} onClose={() => setActive(null)} />
    </aside>
  )
}

function CtaCard({ icon: Icon, title, sub, tone, onClick }) {
  const toneCls = tone === 'sage'
    ? 'border-sage/60 bg-sage/25 hover:border-transparent hover:bg-gradient-to-br hover:from-teal-500 hover:to-teal-700'
    : 'border-clay/40 bg-clay/10 hover:border-transparent hover:bg-gradient-to-br hover:from-green-500 hover:to-green-700'
  const iconCls = tone === 'sage' ? 'text-sage-deep' : 'text-clay'
  return (
    <button onClick={onClick} className={`group relative flex items-center gap-3 rounded-2xl border p-4 text-left backdrop-blur-md transition-all hover:shadow-lift ${toneCls}`}>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-background">
        <Icon className={`h-5 w-5 ${iconCls}`} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold group-hover:text-white">{title}</span>
        <span className="block text-xs text-muted-foreground group-hover:text-white/85">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
    </button>
  )
}

function FeatureBand() {
  return (
    <section id="features" className="border-y border-white/40 bg-white/20">
      <div className="mx-auto max-w-none px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-sage-deep sm:text-lg">Why {BRAND.name}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              A quieter kind of healthcare —
              <br />
              <em className="grad-text">designed around your family</em>.
            </h2>
          </div>
          <a href="#journey" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-sage-deep hover:gap-2 md:inline-flex">
            See how it works <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <FeatureCard key={title} Icon={Icon} title={title} desc={desc} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ Icon, title, desc }) {
  return (
    <div className="feat-card group">
      <div className="background" />
      <div className="feat-fill" />
      <span className="box box1" />
      <span className="box box2" />
      <span className="box box3" />
      <span className="box box4" />
      <div className="feat-logo">
        <Icon className="h-8 w-8" />
        <span className="feat-title">{title}</span>
      </div>
      <p className="feat-desc">{desc}</p>
    </div>
  )
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-none px-6 py-20 sm:px-10 lg:px-16 lg:py-24">
      <div id="journey">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-deep">How it works</p>
        <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
          From symptom to see-the-doctor
          <br />
          <em className="grad-text">in four calm steps.</em>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <StepCard key={s.n} {...s} index={i} />
          ))}
        </div>

        <SocialProof />
      </div>
    </section>
  )
}

function StepCard({ n, title, desc, icon: Icon }) {
  return (
    <div className="flip-card">
      <div className="flip-content">
        {/* Resting face — glowing ring + icon/title */}
        <div className="flip-back">
          <div className="flip-back-content">
            <span className="flip-back-icon"><Icon className="h-7 w-7" /></span>
            <span className="font-serif text-2xl leading-tight">{title}</span>
            <span className="flip-step">Step {n}</span>
          </div>
        </div>
        {/* Hover face — floating blobs + detail */}
        <div className="flip-front">
          <span className="flip-circle" />
          <span className="flip-circle" id="flip-bottom" />
          <span className="flip-circle" id="flip-right" />
          <div className="flip-front-content">
            <span className="flip-badge">Step {n}</span>
            <div className="flip-description">
              <div className="flip-title">
                <Icon className="h-4 w-4" /> {title}
              </div>
              <p className="flip-footer">{desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialProof() {
  const { openAuth } = useAuthModal()
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-green-500/70 bg-card p-5 shadow-[0_0_22px_rgba(34,197,94,0.3)]">
      <div className="flex -space-x-2">
        {['P', 'R', 'M'].map((c) => (
          <span key={c} className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-sage/60 text-xs font-bold text-sage-deep">
            {c}
          </span>
        ))}
      </div>
      <p className="flex-1 text-sm text-ink-soft">
        <strong className="text-foreground">40,000+ families</strong> booked care through {BRAND.name} this month.
      </p>
      <button onClick={() => openAuth('patient')} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-600 to-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.02]">
        Get started <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Lifeline() {
  return (
    <section className="mx-auto max-w-none px-6 pb-20 sm:px-10 lg:px-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-green-600 px-8 py-10 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-ember/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-emerald-300/25 blur-2xl" />

        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ember text-primary-foreground">
              <HeartPulse className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage">Lifeline · 24 / 7</p>
              <h2 className="mt-1 font-serif text-3xl leading-tight text-primary-foreground sm:text-4xl">
                Emergency support, one tap away.
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="tel:108" className="inline-flex items-center gap-2 rounded-xl bg-ember px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.03]">
              <Ambulance className="h-5 w-5" /> Call ambulance
            </a>
            <a href="tel:104" className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-primary-foreground/5 px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary-foreground/10">
              <Phone className="h-5 w-5" /> Talk to a doctor now
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Testimonial() {
  return (
    <section className="border-y border-white/40 bg-white/20">
      <div className="mx-auto grid max-w-none items-center gap-12 px-6 py-20 sm:px-10 lg:px-16 lg:py-28 md:grid-cols-[1fr_1.55fr]">
        {/* Header (left) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-deep">Loved by families</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
            "{BRAND.name} changed how we take care of my parents."
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="font-serif text-5xl leading-none text-foreground">4.9</span>
            <div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">from 12,000+ families</p>
            </div>
          </div>
        </div>

        {/* All reviews (right) — hover accordion on md+, stacked cards on mobile */}
        <div>
          <div className="review-acc hidden md:flex">
            {TESTIMONIALS.map((r) => (
              <div key={`${r.name}-${r.city}`} className="review-panel">
                <span className="review-label">{r.name}</span>
                <div className="review-body">
                  <Quote className="h-8 w-8 rotate-180 fill-sage-deep/15 text-sage-deep/70" />
                  <p className="font-serif text-lg leading-snug text-foreground">{r.quote}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-green-600 text-sm font-bold text-white">{r.name.charAt(0)}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.city}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:hidden">
            {TESTIMONIALS.map((r) => (
              <figure key={`${r.name}-${r.city}`} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="font-serif text-lg leading-snug text-foreground">{r.quote}</p>
                <figcaption className="mt-3 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-green-600 text-sm font-bold text-white">{r.name.charAt(0)}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.city}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AppBanner() {
  return (
    <section id="app" className="mx-auto max-w-none px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-lift sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sage/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-clay/20 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-deep">Get the app</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              {BRAND.name} lives best <em className="grad-text">in your pocket.</em>
            </h2>
            <p className="mt-4 max-w-md text-base text-ink-soft">
              Live tokens, prescription refills and WhatsApp reminders — all in one
              gentle little app. Free to download.
            </p>

            <ul className="iso-list mt-10">
              <li className="iso-pro">
                <span></span>
                <span></span>
                <span></span>
                <a href="#" aria-label="Get it on Google Play">
                  <Play className="svg" />
                </a>
                <div className="text">Google Play</div>
              </li>
              <li className="iso-pro">
                <span></span>
                <span></span>
                <span></span>
                <a href="#" aria-label="Download on the App Store">
                  <Apple className="svg" />
                </a>
                <div className="text">App Store</div>
              </li>
            </ul>
          </div>

          <div className="group relative mx-auto hidden aspect-[9/16] w-56 lg:block">
            <div className="absolute inset-0 rotate-[6deg] rounded-[2.2rem] border-[10px] border-primary bg-background shadow-lift transition-all duration-500 ease-out group-hover:rotate-0 group-hover:scale-[1.03] group-hover:border-green-400 group-hover:shadow-[0_0_32px_rgba(34,197,94,0.6)]">
              <div className="flex h-full flex-col p-4">
                <div className="mx-auto h-1 w-10 rounded-full bg-border" />
                <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Today</p>
                <p className="font-serif text-xl leading-tight">Your appointments</p>
                <div className="mt-3 space-y-2">
                  {['Dr. Menon · 4:30 PM', 'Anaya vaccines · 6:00 PM'].map((x) => (
                    <div key={x} className="flex items-center gap-2 rounded-xl bg-sage/30 p-2.5">
                      <span className="h-2 w-2 rounded-full bg-sage-deep" />
                      <span className="text-[11px] font-medium">{x}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto rounded-xl bg-primary p-3 text-[11px] font-semibold text-primary-foreground">
                  Live token #12 · 8 mins away
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StoreBtn({ icon: Icon, top, bottom }) {
  return (
    <a href="#" className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-600 to-green-600 px-6 py-3 text-white transition-transform hover:scale-[1.02]">
      <Icon className="h-6 w-6" />
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wider opacity-80">{top}</span>
        <span className="block text-sm font-bold">{bottom}</span>
      </span>
    </a>
  )
}

function Footer() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/40 bg-white/25 backdrop-blur-md">
      <div className="mx-auto flex max-w-none flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-4 w-4" />
          </span>
          <span className="font-serif text-xl">{BRAND.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {year} {BRAND.name} Health Technologies. Made with care in Hyderabad.
        </p>
        <div className="flex gap-5 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <button onClick={() => navigate('/clinic-login')} className="hover:text-foreground">For clinics</button>
        </div>
      </div>
    </footer>
  )
}

export default LandingPage
