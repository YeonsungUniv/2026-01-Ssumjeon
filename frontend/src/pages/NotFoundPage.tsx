import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl">🔍</p>
      <h1 className="text-2xl font-black text-gray-800">페이지를 찾을 수 없어요</h1>
      <p className="text-gray-500 text-sm">요청하신 페이지가 존재하지 않습니다.</p>
      <Link to="/" className="btn-primary mt-2">홈으로 돌아가기</Link>
    </div>
  )
}
