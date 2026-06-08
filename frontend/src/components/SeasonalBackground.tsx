import { useMemo } from 'react'

type Season = 'spring' | 'summer' | 'autumn' | 'winter'

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

// ── 여름 전용 연출: 태양(햇살) + 넝실거리는 파도 + 큰 야자수 ──────
function SummerScene() {
  // 2주기 분량의 파도 path (T 반사로 매끄럽게 이어짐) — translateX -50%로 무한 루프
  const wavePath = 'M0,40 Q360,5 720,40 T1440,40 T2160,40 T2880,40 V160 H0 Z'
  return (
    <>
      {/* 우상단 태양 */}
      <div className="absolute -top-16 -right-16 w-72 h-72">
        {/* 퍼지는 햇살 */}
        <div className="absolute inset-0" style={{ animation: 'sun-spin 50s linear infinite' }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'repeating-conic-gradient(rgba(255,209,102,0) 0deg 9deg, rgba(255,201,84,0.45) 9deg 13deg)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 34%, #000 40%, #000 58%, transparent 72%)',
              maskImage: 'radial-gradient(circle, transparent 34%, #000 40%, #000 58%, transparent 72%)',
              animation: 'sun-pulse 5s ease-in-out infinite',
            }}
          />
        </div>
        {/* 태양 본체 + 글로우 */}
        <div
          className="absolute inset-[33%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #ffe9a8, #ffd166 55%, #ffb24d)',
            boxShadow: '0 0 50px 14px rgba(255,200,90,0.55)',
          }}
        />
      </div>

      {/* 하단 파도 (3겹 다른 속도로 넝실넝실) */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
        <svg className="absolute bottom-3 left-0 w-[200%] h-24" viewBox="0 0 2880 160" preserveAspectRatio="none"
          style={{ animation: 'wave-drift 13s linear infinite' }}>
          <path d={wavePath} fill="rgba(125,200,247,0.22)" />
        </svg>
        <svg className="absolute bottom-1 left-0 w-[200%] h-24" viewBox="0 0 2880 160" preserveAspectRatio="none"
          style={{ animation: 'wave-drift 9s linear infinite' }}>
          <path d={wavePath} fill="rgba(80,170,235,0.28)" />
        </svg>
        <svg className="absolute -bottom-1 left-0 w-[200%] h-24" viewBox="0 0 2880 160" preserveAspectRatio="none"
          style={{ animation: 'wave-drift 6.5s linear infinite' }}>
          <path d={wavePath} fill="rgba(56,148,222,0.34)" />
        </svg>
      </div>

      {/* 큰 야자수 (우하단, 파도 위에 서있는 느낌) */}
      <div className="absolute bottom-6 right-4 leading-none" style={{ fontSize: '8.5rem', animation: 'season-bob 6s ease-in-out infinite', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))' }}>
        🌴
      </div>
    </>
  )
}

interface SeasonConfig {
  emojis: string[]
  anim: 'season-fall' | 'season-rise'
  count: number
  /** 배경(콘텐츠 뒤) 데코레이션 */
  decor?: React.ReactNode
  /** 전경(콘텐츠 앞) 데코레이션 — 항상 보이는 연출 */
  foreground?: React.ReactNode
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
    emojis: [],
    anim: 'season-rise',
    count: 0, // 떠오르는 아이콘 제거 — 태양·파도·야자수 데코로만 연출
    tint: 'linear-gradient(180deg, rgba(135,206,235,0.10) 0%, transparent 40%)',
    foreground: <SummerScene />,
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
    <>
      {/* 배경 레이어 (콘텐츠 뒤) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
        {cfg.tint && <div className="absolute inset-0" style={{ background: cfg.tint }} />}
        {particles.map((p) => (
          <span
            key={p.i}
            className="absolute top-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
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

      {/* 전경 레이어 (콘텐츠 앞 — 항상 보이는 연출) */}
      {cfg.foreground && (
        <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden>
          {cfg.foreground}
        </div>
      )}
    </>
  )
}
