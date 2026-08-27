/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ---- legacy dark-blue theme (agent / manager dashboards still use this) ----
        bg: '#0F1319',
        panel: '#171D26',
        panel2: '#1E2530',
        line: '#2A3240',
        muted: '#8B93A1',
        accent: '#5B8CFF',
        safe: '#33C17F',
        warn: '#F5A623',
        crit: '#FF5D3B',
        breach: '#FF2E4D',

        // ---- ComplaintOps theme (warm dark + rose panels) ----
        night: '#241619',      // page background base
        night2: '#301c21',     // page background glow
        rail: '#1b1013',       // sidebar
        railline: '#3a2530',   // sidebar / dark borders
        ink: '#2c1a24',        // primary text on rose panels
        inkmute: '#9a7080',    // muted text on rose panels
        panelline: '#e7b9cb',  // border inside a rose panel
        hot: '#ff4d87',        // primary accent / CTA
        hot2: '#ff86b4',       // accent gradient tail
        flame: '#e23d63',      // breached / danger
        ember: '#e8803c',      // warning / critical countdown
        leaf: '#2fa774'        // safe / healthy
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
