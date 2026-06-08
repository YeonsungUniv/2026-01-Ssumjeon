import { useMemo } from 'react'

type Season = 'spring' | 'summer' | 'autumn' | 'winter'

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

interface SeasonConfig {
  emojis: string[]
  anim: 'season-fall' | 'season-rise'
  count: number
  /** 화면 하단/상단 데코레이션 */
  decor?: React.ReactNode
  /** 은은한 분위기 그라데이션 */
  tint?: string
}

const SEASONS: Record<Season, SeasonConfig> = {
  spring: {
    emojis: ['🌸', '🌸', '🌷', '💮', '🌸'],
    anim: 'season-fall',
    count: 18,
    tint: 'radial-gradient(120% 80% at 50% -10%, rgba(255,182,193,0.18), transparent 60%)',
  },
  summer: {
    emojis: ['🫧', '🐚', '🌊', '⭐', '🫧'],
    anim: 'season-rise',
    count: 16,
    tint: 'linear-gradient(180deg, rgba(135,206,235,0.10) 0%, transparent 30%, rgba(64,164,223,0.10) 100%)',
    decor: (
      <>
        {/* 햇살 글로우 */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(255,214,120,0.55), transparent 70%)' }}
        />
        {/* 해변 데코 */}
        <div className="absolute bottom-3 left-4 text-4xl" style={{ animation: 'season-bob 4s ease-in-out infinite' }}>🏖️</div>
        <div className="absolute bottom-5 right-6 text-3xl" style={{ animation: 'season-bob 5s ease-in-out infinite 0.6s' }}>🌴</div>
        {/* 잔물결 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(99,179,237,0.22))',
            animation: 'season-wave 6s ease-in-out infinite',
          }}
        />
      </>
    ),
  },
  autumn: {
    emojis: ['🍁', '🍂', '🍂', '🍁', '🌰'],
    anim: 'season-fall',
    count: 18,
    tint: 'radial-gradient(120% 90% at 50% -10%, rgba(217,119,66,0.16), transparent 60%)',
  },
  winter: {
    emojis: ['❄️', '❄️', '🌨️', '✦', '❄️'],
    anim: 'season-fall',
    count: 22,
    tint: 'linear-gradient(180deg, rgba(200,225,255,0.16), transparent 50%)',
    decor: <div className="absolute bottom-2 left-5 text-5xl" style={{ animation: 'season-bob 5s ease-in-out infinite' }}>⛄</div>,
  },
}

export default function SeasonalBackground() {
  const season = getSeason(new Date().getMonth() + 1)
  const cfg = SEASONS[season]

  const particles = useMemo(() => {
    return Array.from({ length: cfg.count }).map((_, i) => {
      const left = Math.random() * 100
      const duration = 8 + Math.random() * 9          // 8~17초
      const delay = -Math.random() * 17               // 음수 지연으로 첫 화면부터 분산
      const size = 14 + Math.random() * 18            // 14~32px
      const sway = (Math.random() * 80 - 40).toFixed(0) + 'px'
      const spin = (Math.random() * 540 - 90).toFixed(0) + 'deg'
      const op = (0.45 + Math.random() * 0.4).toFixed(2)
      const emoji = cfg.emojis[i % cfg.emojis.length]
      return { i, left, duration, delay, size, sway, spin, op, emoji }
    })
    // 계절이 바뀌지 않는 한 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {cfg.tint && <div className="absolute inset-0" style={{ background: cfg.tint }} />}
      {particles.map((p) => (
        <span
          key={p.i}
          className="absolute top-0 select-none"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            // CSS 변수로 흔들림/회전/투명도 전달
            ['--sway' as string]: p.sway,
            ['--spin' as string]: p.spin,
            ['--op' as string]: p.op,
            animation: `${cfg.anim} ${p.duration}s linear ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        >
          {p.emoji}
        </span>
      ))}
      {cfg.decor}
    </div>
  )
}
