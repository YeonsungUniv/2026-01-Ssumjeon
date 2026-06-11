import { Outlet } from 'react-router-dom'
import AuroraBackground from './AuroraBackground'

export default function AuthLayout() {
  return (
    <div className="min-h-dvh flex">
      <AuroraBackground />
      {/* 좌측 브랜드 패널 */}
      <div className="relative hidden lg:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-rose-400 via-pink-500 to-violet-500 text-white p-16 overflow-hidden">
        <div className="absolute -top-16 -left-10 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <h1 className="relative text-7xl font-black tracking-tight mb-4 drop-shadow">썸전</h1>
        <p className="relative text-xl font-medium opacity-95">연성대학교 과팅 매칭 플랫폼</p>
        <p className="relative text-base opacity-75 mt-3">같은 학교 친구들과 설레는 인연을 만들어보세요</p>
      </div>
      {/* 우측 폼 패널 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-rose-500 to-violet-500 bg-clip-text text-transparent">썸전</h1>
          <p className="text-sm text-gray-500 mt-1">연성대학교 과팅 매칭</p>
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
