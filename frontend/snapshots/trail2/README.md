# Landing page snapshot — "trail2"

Saved copy of the TapCure editorial (sweet-looker) landing page, teal+green brand.

## What's in this snapshot
- `LandingPage.jsx`  → restore to `src/pages/LandingPage.jsx`
- `index.css`        → restore to `src/index.css` (contains the `.theme-editorial` scope)
- `tailwind.config.js` → restore to `tailwind.config.js` (editorial color tokens + shadows)
- `ToolsAndJourney.jsx` → optional; `src/components/landing/ToolsAndJourney.jsx` (not used by current page)

## Also required (already in the project, not copied here)
- Hero image: `public/hero-family.jpg`
- Fonts: Inter + Instrument Serif link in `index.html`

## To restore this version
Copy the three files above back to their locations, then `npm run build`.

## State captured
- Full-width sweet-looker layout, hero locked to one viewport (calculators left rail,
  wider middle content spread evenly, fixed 440px family photo).
- Teal + green brand palette, Inter font (no serif/italics), teal→green gradient accents.
- Nav with Patient/Doctor login dropdown + For clinics + language switch + mobile hamburger.
- Sections: Hero, How it works, Feature band, past JourneySection, Lifeline, Testimonial, App banner, Footer.
