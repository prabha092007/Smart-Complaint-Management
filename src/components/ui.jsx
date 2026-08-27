export function Card({ children, className = '' }) {
  return <div className={`bg-panel border border-line rounded-xl p-5 ${className}`}>{children}</div>
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-accent text-white hover:opacity-90',
    ghost: 'bg-transparent border border-line text-muted hover:border-accent hover:text-white',
    danger: 'bg-breach text-white hover:opacity-90',
    success: 'bg-safe text-[#06170E] hover:opacity-90'
  }
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-panel2 text-muted border-line',
    accent: 'bg-panel2 text-accent border-line',
    safe: 'bg-[#122419] text-safe border-safe/30',
    warn: 'bg-[#2b2418] text-warn border-warn/30',
    crit: 'bg-[#2b1a18] text-crit border-crit/30',
    breach: 'bg-breach text-white border-breach'
  }
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent ${props.className || ''}`}
    />
  )
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-y min-h-[90px] ${props.className || ''}`}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent ${props.className || ''}`}
    >
      {children}
    </select>
  )
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="text-center py-16 text-muted">
      <p className="text-sm font-medium text-white mb-1">{title}</p>
      {subtitle && <p className="text-xs">{subtitle}</p>}
    </div>
  )
}

export function Toast({ message, tone = 'default', onClose }) {
  const tones = { default: 'border-line', success: 'border-safe', error: 'border-breach' }
  return (
    <div className={`fixed bottom-6 right-6 bg-panel border ${tones[tone]} rounded-lg px-4 py-3 text-sm shadow-lg z-50 flex items-center gap-3`}>
      {message}
      <button onClick={onClose} className="text-muted hover:text-white">✕</button>
    </div>
  )
}
