import { useEffect, useRef } from 'react'

export default function CursorSpotlight() {
  const spotlightRef = useRef(null)

  useEffect(() => {
    // Don't attach on touch devices
    if ('ontouchstart' in window) return

    const el = spotlightRef.current
    if (!el) return

    const handleMouseMove = (e) => {
      el.style.setProperty('--mouse-x', `${e.clientX}px`)
      el.style.setProperty('--mouse-y', `${e.clientY}px`)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Don't render on touch devices
  if ('ontouchstart' in window) return null

  return (
    <div
      ref={spotlightRef}
      data-testid="cursor-spotlight"
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background: `radial-gradient(
          600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(139, 92, 246, 0.08),
          transparent 80%
        )`,
      }}
    />
  )
}
