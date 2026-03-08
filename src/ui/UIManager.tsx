import { AnimatePresence, motion } from 'framer-motion'
import useStore, { type ViewId } from '../store/useStore'

// ── Shared animation variants ─────────────────────────────────────────────────
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.55, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.3,  ease: 'easeIn'  } },
}

// ── Hub Overlay ───────────────────────────────────────────────────────────────
function HubUI() {
  return (
    <motion.div key="HUB" {...fade} style={styles.hubRoot}>
      <div style={styles.hubLogo}>VK</div>
      <nav style={styles.hubNav}>
        {['Tech', 'Research', 'Drone', 'Design'].map((l) => (
          <span key={l} style={styles.hubNavItem}>{l}</span>
        ))}
      </nav>
      <p style={styles.hubTagline}>3D Portfolio Hub</p>
    </motion.div>
  )
}

// ── Drone / FPV Telemetry Overlay ─────────────────────────────────────────────
function DroneUI({ onBack }: { onBack: () => void }) {
  return (
    <motion.div key="DRONE" {...fade} style={styles.droneRoot}>
      {/* HUD corners */}
      <div style={{ ...styles.corner, top: 16, left: 16 }} />
      <div style={{ ...styles.corner, top: 16, right: 16, borderLeft: 'none', borderRight: '2px solid #00ff88' }} />
      <div style={{ ...styles.corner, bottom: 16, left: 16, borderTop: 'none', borderBottom: '2px solid #00ff88' }} />
      <div style={{ ...styles.corner, bottom: 16, right: 16, borderTop: 'none', borderBottom: '2px solid #00ff88', borderLeft: 'none', borderRight: '2px solid #00ff88' }} />

      {/* Top bar */}
      <div style={styles.droneTopBar}>
        <span style={styles.droneLabel}>FPV MODE</span>
        <span style={styles.droneBattery}>▮▮▮▮▯ 84%</span>
        <span style={styles.droneLabel}>GPS LOCK</span>
      </div>

      {/* Crosshair */}
      <div style={styles.crosshair}>
        <div style={styles.crosshairH} />
        <div style={styles.crosshairV} />
        <div style={styles.crosshairDot} />
      </div>

      {/* Side telemetry */}
      <div style={styles.droneTelemetry}>
        {[['ALT', '42 m'], ['SPD', '0 km/h'], ['PITCH', '0.0°'], ['ROLL', '0.0°'], ['YAW', '270°']].map(([k, v]) => (
          <div key={k} style={styles.telRow}>
            <span style={styles.telKey}>{k}</span>
            <span style={styles.telVal}>{v}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.droneFooter}>
        <span style={styles.droneLabel}>REC ● 00:03:42</span>
        <button style={styles.backBtnDrone} onClick={onBack}>✕ EXIT FPV</button>
      </div>
    </motion.div>
  )
}

// ── Design / Bauhaus Overlay ──────────────────────────────────────────────────
function DesignUI({ onBack }: { onBack: () => void }) {
  return (
    <motion.div key="DESIGN" {...fade} style={styles.designRoot}>
      <div style={styles.designGrid}>
        <div style={{ ...styles.designCell, background: '#e63946' }}>FORM</div>
        <div style={{ ...styles.designCell, background: '#f4a261' }}>COLOR</div>
        <div style={{ ...styles.designCell, background: '#2a9d8f' }}>SPACE</div>
        <div style={{ ...styles.designCell, background: '#264653' }}>TYPE</div>
      </div>
      <h1 style={styles.designTitle}>DESIGN</h1>
      <p style={styles.designSub}>Bauhaus · Visual Systems · Interaction</p>
      <button style={styles.backBtnDesign} onClick={onBack}>← BACK</button>
    </motion.div>
  )
}

// ── Tech / Terminal Overlay ───────────────────────────────────────────────────
function TechUI({ onBack }: { onBack: () => void }) {
  const lines = [
    '> initialising session...',
    '> loading modules: react · three · gsap',
    '> kernel: darwin 25.3.0',
    '> status: ALL SYSTEMS NOMINAL',
    '> █',
  ]
  return (
    <motion.div key="TECH" {...fade} style={styles.techRoot}>
      <div style={styles.terminalBar}>
        <span style={{ ...styles.termDot, background: '#ff5f57' }} />
        <span style={{ ...styles.termDot, background: '#febc2e' }} />
        <span style={{ ...styles.termDot, background: '#28c840' }} />
        <span style={styles.termTitle}>bash — portfolio</span>
      </div>
      <div style={styles.termBody}>
        {lines.map((l, i) => (
          <div key={i} style={styles.termLine}>{l}</div>
        ))}
      </div>
      <div style={styles.techFooter}>
        <span style={styles.techTag}>REACT</span>
        <span style={styles.techTag}>THREE.JS</span>
        <span style={styles.techTag}>GSAP</span>
        <span style={styles.techTag}>VITE</span>
      </div>
      <button style={styles.backBtnTech} onClick={onBack}>← EXIT</button>
    </motion.div>
  )
}

// ── Research / Document Overlay ───────────────────────────────────────────────
function ResearchUI({ onBack }: { onBack: () => void }) {
  return (
    <motion.div key="RESEARCH" {...fade} style={styles.researchRoot}>
      <div style={styles.researchDoc}>
        <p style={styles.researchLabel}>ABSTRACT — 2026</p>
        <h2 style={styles.researchTitle}>On Spatial Interfaces &amp; Embodied Interaction</h2>
        <p style={styles.researchBody}>
          This work explores the intersection of three-dimensional navigation paradigms
          and human spatial cognition. By embedding navigation cues within physical
          analogues, we reduce cognitive load and increase exploratory engagement.
        </p>
        <hr style={styles.researchRule} />
        <p style={styles.researchFootnote}>§ 1.0 — Introduction · Methodology · Findings · Discussion</p>
        <button style={styles.backBtnResearch} onClick={onBack}>← Back to Hub</button>
      </div>
    </motion.div>
  )
}

// ── UIManager ─────────────────────────────────────────────────────────────────
export default function UIManager() {
  const { currentView, setView } = useStore()
  const back = () => setView('HUB')

  const map: Record<ViewId, JSX.Element> = {
    HUB:              <HubUI />,
    PORTAL_DRONE:     <DroneUI     onBack={back} />,
    PORTAL_DESIGN:    <DesignUI    onBack={back} />,
    PORTAL_TECH:      <TechUI      onBack={back} />,
    PORTAL_RESEARCH:  <ResearchUI  onBack={back} />,
  }

  return (
    <div style={styles.managerRoot}>
      <AnimatePresence mode="wait">
        {map[currentView]}
      </AnimatePresence>
    </div>
  )
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  managerRoot: {
    position: 'fixed', inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily: 'sans-serif',
  },

  // HUB
  hubRoot: {
    position: 'absolute', top: 0, left: 0,
    padding: '2rem',
    pointerEvents: 'none',
  },
  hubLogo: {
    fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.1em',
    color: '#f5f0e8',
  },
  hubNav: {
    display: 'flex', gap: '2rem', marginTop: '1.2rem',
  },
  hubNavItem: {
    fontSize: '0.7rem', letterSpacing: '0.2em',
    textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)',
  },
  hubTagline: {
    position: 'fixed', bottom: '2rem', left: '2rem',
    fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase',
    color: 'rgba(245,240,232,0.25)', margin: 0,
  },

  // DRONE
  droneRoot: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'rgba(0,0,0,0.15)',
    pointerEvents: 'none',
  },
  corner: {
    position: 'absolute',
    width: 24, height: 24,
    borderTop: '2px solid #00ff88',
    borderLeft: '2px solid #00ff88',
  },
  droneTopBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.5rem 3rem',
    fontFamily: '"Courier New", monospace',
  },
  droneLabel: {
    fontSize: '0.65rem', letterSpacing: '0.3em', color: '#00ff88',
  },
  droneBattery: {
    fontSize: '0.7rem', letterSpacing: '0.15em', color: '#00ff88',
  },
  crosshair: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 60, height: 60,
  },
  crosshairH: {
    position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
    background: 'rgba(0,255,136,0.6)',
  },
  crosshairV: {
    position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
    background: 'rgba(0,255,136,0.6)',
  },
  crosshairDot: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 5, height: 5,
    borderRadius: '50%', background: '#00ff88',
  },
  droneTelemetry: {
    position: 'absolute', right: '2.5rem', top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
    fontFamily: '"Courier New", monospace',
  },
  telRow: { display: 'flex', justifyContent: 'space-between', gap: '1.5rem' },
  telKey: { fontSize: '0.6rem', color: 'rgba(0,255,136,0.5)', letterSpacing: '0.2em' },
  telVal: { fontSize: '0.6rem', color: '#00ff88', letterSpacing: '0.1em' },
  droneFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.5rem 3rem',
    fontFamily: '"Courier New", monospace',
    pointerEvents: 'auto',
  },
  backBtnDrone: {
    background: 'transparent',
    border: '1px solid #00ff88', color: '#00ff88',
    padding: '0.4rem 1rem',
    fontSize: '0.6rem', letterSpacing: '0.25em',
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // DESIGN
  designRoot: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    pointerEvents: 'none',
  },
  designGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 3, width: 200, height: 200,
    position: 'absolute', top: '2rem', right: '2rem',
  },
  designCell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.9)',
  },
  designTitle: {
    fontSize: '5rem', fontWeight: 900,
    letterSpacing: '-0.02em', color: '#f5f0e8',
    margin: 0, lineHeight: 1,
    textShadow: '0 0 60px rgba(255,200,80,0.3)',
  },
  designSub: {
    fontSize: '0.75rem', letterSpacing: '0.25em',
    color: 'rgba(245,240,232,0.4)', marginTop: '0.75rem',
  },
  backBtnDesign: {
    marginTop: '2rem', background: 'transparent',
    border: '1px solid rgba(245,240,232,0.3)', color: '#f5f0e8',
    padding: '0.5rem 1.5rem', fontSize: '0.65rem',
    letterSpacing: '0.2em', cursor: 'pointer',
    pointerEvents: 'auto',
  },

  // TECH
  techRoot: {
    position: 'absolute', bottom: '3rem', left: '2.5rem',
    width: 420, background: 'rgba(8,12,8,0.9)',
    border: '1px solid #28c84022',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
  },
  terminalBar: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid rgba(40,200,64,0.15)',
    background: 'rgba(20,28,20,0.9)',
  },
  termDot: { width: 10, height: 10, borderRadius: '50%' },
  termTitle: {
    fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
    marginLeft: '0.5rem', letterSpacing: '0.05em',
  },
  termBody: { padding: '0.75rem 1rem' },
  termLine: {
    fontFamily: '"Courier New", monospace',
    fontSize: '0.7rem', color: '#28c840',
    lineHeight: 1.8, letterSpacing: '0.03em',
  },
  techFooter: {
    display: 'flex', gap: '0.4rem',
    padding: '0.5rem 1rem',
    borderTop: '1px solid rgba(40,200,64,0.15)',
  },
  techTag: {
    fontSize: '0.5rem', letterSpacing: '0.15em',
    color: 'rgba(40,200,64,0.5)',
    border: '1px solid rgba(40,200,64,0.2)',
    padding: '0.15rem 0.4rem',
  },
  backBtnTech: {
    position: 'absolute', top: '2rem', right: '2.5rem',
    background: 'transparent',
    border: '1px solid rgba(40,200,64,0.3)', color: '#28c840',
    padding: '0.4rem 1rem', fontSize: '0.6rem',
    letterSpacing: '0.2em', cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    pointerEvents: 'auto',
  },

  // RESEARCH
  researchRoot: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  researchDoc: {
    maxWidth: 540, background: '#f5f0e8',
    padding: '3rem', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  researchLabel: {
    fontSize: '0.6rem', letterSpacing: '0.3em',
    color: '#999', margin: '0 0 1rem',
    fontFamily: '"Courier New", monospace',
  },
  researchTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '1.4rem', fontWeight: 400,
    color: '#1a1a1a', lineHeight: 1.35,
    margin: '0 0 1rem',
  },
  researchBody: {
    fontFamily: 'Georgia, serif',
    fontSize: '0.85rem', color: '#444',
    lineHeight: 1.75, margin: '0 0 1.5rem',
  },
  researchRule: { border: 'none', borderTop: '1px solid #ddd', margin: '1rem 0' },
  researchFootnote: {
    fontFamily: '"Courier New", monospace',
    fontSize: '0.6rem', color: '#aaa', letterSpacing: '0.1em',
  },
  backBtnResearch: {
    display: 'block', marginTop: '1.5rem',
    background: 'transparent', border: '1px solid #bbb',
    color: '#444', padding: '0.45rem 1.2rem',
    fontSize: '0.65rem', letterSpacing: '0.15em',
    cursor: 'pointer', fontFamily: 'Georgia, serif',
    pointerEvents: 'auto',
  },
}
