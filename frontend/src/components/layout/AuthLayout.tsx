import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-dvh flex bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* 좌측 브랜드 패널 */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-primary-400 to-secondary-400 text-white p-16">
        <h1 className="text-7xl font-black tracking-tight mb-4">썸전</h1>
        <p className="text-xl font-medium opacity-90">연성대학교 과팅 매칭 플랫폼</p>
        <p className="text-base opacity-70 mt-3">같은 학교 친구들과 설레는 인연을 만들어보세요</p>
      </div>
      {/* 우측 폼 패널 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-4xl font-black text-primary-500 tracking-tight">썸전</h1>
          <p className="text-sm text-gray-500 mt-1">연성대학교 과팅 매칭</p>
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
