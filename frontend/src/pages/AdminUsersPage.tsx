import { useEffect, useState } from 'react'
import { adminApi, type AdminUser } from '@/api/auth'
import DepartmentSelect from '@/components/DepartmentSelect'

const STATUS_LABEL: Record<AdminUser['status'], { text: string; cls: string }> = {
  approved: { text: '승인', cls: 'bg-green-50 text-green-600' },
  pending: { text: '대기', cls: 'bg-amber-50 text-amber-600' },
  rejected: { text: '거절', cls: 'bg-red-50 text-red-500' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDept, setEditDept] = useState('')
  const [editStudentId, setEditStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchUsers = async (q?: string) => {
    setLoading(true)
    try {
      const res = await adminApi.listUsers(q)
      setUsers(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(search.trim() || undefined)
  }

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id)
    setEditDept(u.department)
    setEditStudentId(u.studentId ?? '')
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  const saveEdit = async (u: AdminUser) => {
    if (editStudentId && !/^\d{4}/.test(editStudentId.trim())) {
      setEditError('학번은 입학년도(4자리 숫자)로 시작해야 합니다.')
      return
    }
    setSaving(true)
    setEditError('')
    try {
      const res = await adminApi.updateUser(u.id, {
        department: editDept.trim() || undefined,
        studentId: editStudentId.trim(),
      })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)))
      setEditingId(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">사용자 관리</h2>
        <span className="text-sm text-gray-400">{users.length}명</span>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="아이디·닉네임·이메일·학번 검색"
          className="input-field flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-primary px-5 shrink-0">검색</button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">사용자가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const editing = editingId === u.id
            const badge = STATUS_LABEL[u.status]
            return (
              <div key={u.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {u.nickname}
                      <span className="text-sm font-normal text-gray-400">@{u.username}</span>
                      {u.isAdmin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-50 text-primary-500">관리자</span>}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{u.email ?? '이메일 없음'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.text}</span>
                </div>

                {!editing ? (
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-sm text-gray-600 space-y-0.5">
                      <p><span className="text-gray-400">학과</span> · {u.department}</p>
                      <p><span className="text-gray-400">학번</span> · {u.studentId ?? '-'} <span className="text-gray-400">({u.gender === 'male' ? '남' : '여'})</span></p>
                    </div>
                    <button onClick={() => startEdit(u)} className="btn-outline text-sm py-1.5 px-4 shrink-0">수정</button>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">학번</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="예: 20251234"
                        value={editStudentId}
                        onChange={(e) => setEditStudentId(e.target.value.replace(/\s/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        학과 {editDept && <span className="ml-1 text-primary-500 font-semibold">{editDept}</span>}
                      </label>
                      <DepartmentSelect value={editDept} onChange={setEditDept} />
                    </div>
                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                    <div className="flex gap-2">
                      <button onClick={cancelEdit} disabled={saving} className="btn-outline flex-1 text-sm py-2">취소</button>
                      <button onClick={() => saveEdit(u)} disabled={saving} className="btn-primary flex-1 text-sm py-2">
                        {saving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
