import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin/users', label: '사용자 관리' },
  { to: '/admin/inbox', label: '가입 수신함' },
  { to: '/suggestions', label: '건의사항' },
]

// 모바일 전용 관리 페이지 전환 탭 (데스크톱은 좌측 사이드바로 이동하므로 숨김)
export default function AdminSubNav() {
  return (
    <div className="md:hidden -mx-1 mb-4 flex gap-2 overflow-x-auto pb-1">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={({ isActive }) =>
            `shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isActive ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  )
}
