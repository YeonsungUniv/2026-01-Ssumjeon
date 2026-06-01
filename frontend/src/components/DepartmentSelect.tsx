import { useState } from 'react'
import { DEPARTMENTS } from '@/constants'

interface SingleProps {
  multiple?: false
  value: string
  onChange: (v: string) => void
}

interface MultiProps {
  multiple: true
  value: string[]
  onChange: (v: string[]) => void
}

type Props = SingleProps | MultiProps

export default function DepartmentSelect(props: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? DEPARTMENTS.filter((d) => d.includes(search.trim()))
    : DEPARTMENTS

  const isSelected = (d: string) =>
    props.multiple ? (props.value as string[]).includes(d) : props.value === d

  const toggle = (d: string) => {
    if (props.multiple) {
      const curr = props.value as string[]
      props.onChange(curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d])
    } else {
      props.onChange(props.value === d ? '' : d)
    }
  }

  const highlight = (text: string) => {
    if (!search.trim()) return <span>{text}</span>
    const idx = text.indexOf(search.trim())
    if (idx === -1) return <span>{text}</span>
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-gray-900 rounded">{text.slice(idx, idx + search.trim().length)}</mark>
        {text.slice(idx + search.trim().length)}
      </span>
    )
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      {/* 검색 입력 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="학과 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-800"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        )}
      </div>

      {/* 목록 */}
      <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-5">검색 결과가 없습니다</p>
        ) : (
          filtered.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                isSelected(d) ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                isSelected(d) ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
              }`}>
                {isSelected(d) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-sm ${isSelected(d) ? 'font-semibold' : ''}`}>{highlight(d)}</span>
            </button>
          ))
        )}
      </div>

      {/* 멀티 선택 시 선택 개수 표시 */}
      {props.multiple && (props.value as string[]).length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-primary-600 font-semibold">{(props.value as string[]).length}개 선택됨</span>
          <button
            type="button"
            onClick={() => props.onChange([])}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            전체 해제
          </button>
        </div>
      )}
    </div>
  )
}
