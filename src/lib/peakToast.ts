import toast from 'react-hot-toast'

const baseStyle: React.CSSProperties = {
  background: '#0B0F1A',
  color: '#E2E8F0',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  fontSize: '13px',
  fontWeight: 500,
  padding: '14px 18px',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3)',
  maxWidth: '400px',
  lineHeight: 1.5,
}

type PeakToastType = 'insight' | 'achievement' | 'warning' | 'info'

const iconMap: Record<PeakToastType, string> = {
  insight: '🧠',
  achievement: '⚡',
  warning: '⚠️',
  info: '💡',
}

export function peakToast(message: string, type: PeakToastType = 'info', duration = 6000) {
  toast(message, {
    icon: iconMap[type],
    duration,
    position: 'top-right',
    style: baseStyle,
    className: 'peak-toast',
  })
}
