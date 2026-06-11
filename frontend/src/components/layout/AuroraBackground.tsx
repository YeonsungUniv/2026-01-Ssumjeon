// 앱 전역 오로라 그라데이션 배경 — 빈 여백을 부드러운 블롭으로 채움 (fixed, 콘텐츠 뒤)
export default function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: 'linear-gradient(180deg,#fdf4ff 0%,#f6f4ff 38%,#eef4ff 72%,#f0fbff 100%)' }}
    >
      <div className="aurora-blob absolute -top-28 -left-20 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-70"
        style={{ background: 'radial-gradient(circle at 30% 30%, #fbcfe8, transparent 68%)' }} />
      <div className="aurora-blob absolute top-1/4 -right-24 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle at 50% 50%, #ddd6fe, transparent 68%)', animationDelay: '-4s' }} />
      <div className="aurora-blob absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-55"
        style={{ background: 'radial-gradient(circle at 50% 50%, #bfdbfe, transparent 68%)', animationDelay: '-8s' }} />
      <div className="aurora-blob absolute top-1/2 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle at 50% 50%, #a7f3d0, transparent 70%)', animationDelay: '-12s' }} />
    </div>
  )
}
