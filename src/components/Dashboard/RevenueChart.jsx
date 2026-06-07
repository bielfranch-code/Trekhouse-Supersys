import { useState, useMemo, useRef } from 'react'

const fmt = n => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const fmtShort = n => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'jt'
  if (n >= 1_000) return Math.round(n / 1_000) + 'rb'
  return String(Math.round(n))
}

// Catmull-Rom -> cubic bezier smoothing for a natural curve
function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

export default function RevenueChart({ data }) {
  // data: [{ label, val }]
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)

  const W = 640, H = 220
  const padX = 8, padTop = 24, padBottom = 28

  const { pts, areaPath, linePath, max, gridY } = useMemo(() => {
    const vals = data.map(d => d.val)
    const max = Math.max(1, ...vals)
    const innerW = W - padX * 2
    const innerH = H - padTop - padBottom
    const step = data.length > 1 ? innerW / (data.length - 1) : 0
    const pts = data.map((d, i) => ({
      x: padX + (data.length > 1 ? i * step : innerW / 2),
      y: padTop + innerH - (d.val / max) * innerH,
      ...d,
    }))
    const linePath = smoothPath(pts)
    const areaPath = pts.length
      ? `${linePath} L ${pts[pts.length - 1].x},${padTop + innerH} L ${pts[0].x},${padTop + innerH} Z`
      : ''
    const gridY = [0, 0.25, 0.5, 0.75, 1].map(t => ({
      y: padTop + innerH - t * innerH,
      v: max * t,
    }))
    return { pts, areaPath, linePath, max, gridY }
  }, [data])

  function handleMove(e) {
    if (!pts.length) return
    const rect = wrapRef.current.getBoundingClientRect()
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const x = (clientX / rect.width) * W
    let nearest = 0, dist = Infinity
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - x)
      if (d < dist) { dist = d; nearest = i }
    })
    setHover(nearest)
  }

  const hp = hover != null ? pts[hover] : null

  return (
    <div ref={wrapRef} className="relative w-full select-none"
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}
      onTouchStart={handleMove} onTouchMove={handleMove}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="rcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rcStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* grid */}
        {gridY.map((g, i) => (
          <line key={i} x1={padX} y1={g.y} x2={W - padX} y2={g.y}
            stroke="#f1f5f9" strokeWidth="1" />
        ))}

        {/* area + line */}
        <path d={areaPath} fill="url(#rcFill)" className="rc-area" />
        <path d={linePath} fill="none" stroke="url(#rcStroke)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="rc-line" />

        {/* hover crosshair + marker */}
        {hp && (
          <g>
            <line x1={hp.x} y1={padTop - 6} x2={hp.x} y2={H - padBottom}
              stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <circle cx={hp.x} cy={hp.y} r="7" fill="#10b981" opacity="0.18" />
            <circle cx={hp.x} cy={hp.y} r="4" fill="#fff" stroke="#059669" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {/* y-axis labels */}
      <div className="absolute inset-0 pointer-events-none">
        {gridY.map((g, i) => (
          <span key={i} className="absolute left-0 text-[9px] text-slate-300 font-semibold"
            style={{ top: `${(g.y / H) * 100}%`, transform: 'translateY(-50%)' }}>
            {fmtShort(g.v)}
          </span>
        ))}
      </div>

      {/* x-axis labels */}
      <div className="flex justify-between px-1 -mt-5">
        {data.map((d, i) => (
          <span key={i}
            className={`text-[9px] sm:text-[10px] font-medium transition-colors ${hover === i ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
            style={{ flex: '1', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            {d.label}
          </span>
        ))}
      </div>

      {/* floating tooltip */}
      {hp && (
        <div className="absolute z-20 pointer-events-none transition-all"
          style={{
            left: `${(hp.x / W) * 100}%`,
            top: `${(hp.y / H) * 100}%`,
            transform: `translate(${hp.x > W * 0.7 ? '-110%' : '12%'}, -120%)`,
          }}>
          <div className="bg-slate-800 text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
            <p className="text-[10px] text-slate-300 font-semibold mb-0.5">{hp.label}</p>
            <p className="text-sm font-extrabold">{fmt(hp.val)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
