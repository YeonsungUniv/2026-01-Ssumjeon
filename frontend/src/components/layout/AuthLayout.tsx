import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-dvh flex bg-cream">
      {/* 좌측 브랜드 패널 */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-16">
        <h1 className="text-7xl font-black tracking-tight mb-1">썸전</h1>
        <div className="w-16 h-0.5 bg-secondary-500 my-5" />
        <p className="text-xl font-medium text-secondary-200">연성대학교 과팅 매칭 플랫폼</p>
        <p className="text-base text-white/60 mt-3">같은 학교 친구들과 설레는 인연을 만들어보세요</p>
      </div>
      {/* 우측 폼 패널 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-4xl font-black text-primary-700 tracking-tight">썸전</h1>
          <div className="w-10 h-0.5 bg-secondary-500 mx-auto my-2.5" />
          <p className="text-sm text-gray-500 mt-1">연성대학교 과팅 매칭</p>
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
