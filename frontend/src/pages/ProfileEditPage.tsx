import { useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import client from '@/api/client'
import type { ApiResponse, User } from '@/types'
import { MBTI_LIST, DEPARTMENTS, GRADES } from '@/constants'

interface EditPayload {
  nickname: string
  bio: string
  mbti: string
  interests: string
  department: string
  grade: string
}

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()

  const [imagePreview, setImagePreview] = useState<string | null>(user?.profileImage ?? null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkNickname = useCallback(async (value: string) => {
    if (!value || value === user?.nickname) { setNicknameStatus('idle'); return }
    setNicknameStatus('checking')
    try {
      const res = await client.get<{ success: boolean; data: { available: boolean } }>(
        `/users/check-nickname/${encodeURIComponent(value)}`,
      )
      setNicknameStatus(res.data.available ? 'ok' : 'taken')
    } catch {
      setNicknameStatus('idle')
    }
  }, [user?.nickname])

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<EditPayload>({
    defaultValues: {
      nickname: user?.nickname ?? '',
      bio: user?.bio ?? '',
      mbti: user?.mbti ?? '',
      interests: user?.interests.join(', ') ?? '',
      department: user?.department ?? '',
      grade: user?.grade ? String(user.grade) : '',
    },
  })

  const handleImageClick = () => fileInputRef.current?.click()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    const localUrl = URL.createObjectURL(file)
    setImagePreview(localUrl)
    setImageUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await client.post<ApiResponse<{ profileImage: string }>>('/users/me/profile-image', formData)
      updateUser({ profileImage: res.data.profileImage })
      setImagePreview(res.data.profileImage)
    } catch (err) {
      setImagePreview(useAuthStore.getState().user?.profileImage ?? null)
      setImageError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const onSubmit = async (data: EditPayload) => {
    const res = await client.patch<ApiResponse<User>>('/users/me', {
      nickname: data.nickname,
      bio: data.bio,
      mbti: data.mbti || undefined,
      interests: data.interests.split(',').map((s) => s.trim()).filter(Boolean),
      department: data.department || undefined,
      grade: data.grade ? Number(data.grade) : undefined,
    })
    updateUser(res.data)
    navigate('/profile')
  }

  const previewSrc = imagePreview ?? null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">프로필 수정</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 좌측: 현재 프로필 미리보기 */}
        <div className="card flex flex-col items-center gap-4 py-10">
          {/* 클릭 가능한 프로필 이미지 */}
          <div
            className="relative w-24 h-24 rounded-full cursor-pointer group"
            onClick={handleImageClick}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-200 to-secondary-200 flex items-center justify-center text-4xl overflow-hidden">
              {previewSrc
                ? <img src={previewSrc} alt="프로필" className="w-24 h-24 rounded-full object-cover" />
                : (user?.gender === 'male' ? '🧑' : '👩')
              }
            </div>
            {/* hover 오버레이 */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {imageUploading
                ? <span className="text-white text-xs">업로드 중...</span>
                : <>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-white text-xs mt-1">변경</span>
                  </>
              }
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
          {imageError
            ? <p className="text-xs text-red-500">{imageError}</p>
            : <p className="text-xs text-gray-400">클릭하여 사진 변경</p>
          }

          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{user?.nickname}</p>
            {(user?.department || user?.grade) && (
              <p className="text-sm text-primary-500 mt-0.5">
                {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
              </p>
            )}
            {user?.mbti && (
              <span className="inline-block mt-2 bg-secondary-50 text-secondary-600 text-xs font-semibold px-3 py-1 rounded-full">
                {user.mbti}
              </span>
            )}
          </div>
          {user?.bio && (
            <p className="text-sm text-gray-500 text-center leading-relaxed">{user.bio}</p>
          )}
          {user?.interests && user.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {user.interests.map((i) => (
                <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{i}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">저장 후 반영됩니다</p>
        </div>

        {/* 우측: 편집 폼 */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 닉네임 */}
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">닉네임</label>
                <input
                  className={`input-field ${nicknameStatus === 'taken' ? 'border-red-300 focus:border-red-400' : nicknameStatus === 'ok' ? 'border-green-300 focus:border-green-400' : ''}`}
                  {...register('nickname', {
                    required: '닉네임을 입력해주세요',
                    maxLength: { value: 7, message: '닉네임은 7자 이하로 입력해주세요' },
                    pattern: { value: /^[^\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/, message: '공백과 특수문자는 사용할 수 없습니다' },
                    validate: () => nicknameStatus !== 'taken' || '이미 사용 중인 닉네임입니다.',
                  })}
                  onBlur={(e) => checkNickname(e.target.value)}
                />
                {errors.nickname && <p className="text-xs text-red-500 mt-1">{errors.nickname.message}</p>}
                {!errors.nickname && nicknameStatus === 'checking' && <p className="text-xs text-gray-400 mt-1">확인 중...</p>}
                {!errors.nickname && nicknameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">이미 사용 중인 닉네임입니다.</p>}
                {!errors.nickname && nicknameStatus === 'ok' && <p className="text-xs text-green-500 mt-1">사용 가능한 닉네임입니다.</p>}
              </div>

              {/* MBTI */}
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">MBTI</label>
                <select className="input-field" {...register('mbti')}>
                  <option value="">선택 안 함</option>
                  {MBTI_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* 학과 */}
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">학과</label>
                <select className="input-field" {...register('department')}>
                  <option value="">선택 안 함</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* 학년 */}
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">학년</label>
                <select className="input-field" {...register('grade')}>
                  <option value="">선택 안 함</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
            </div>

            {/* 자기소개 */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">자기소개</label>
              <textarea
                rows={4}
                className="input-field resize-none"
                placeholder="나를 소개해보세요 (최대 100자)"
                {...register('bio', { maxLength: 100 })}
              />
            </div>

            {/* 관심사 */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">관심사</label>
              <input
                className="input-field"
                placeholder="예: 카페, 영화, 여행  (쉼표로 구분)"
                {...register('interests')}
              />
            </div>

            <div className="flex gap-3 pt-1 justify-end">
              <button type="button" onClick={() => navigate(-1)} className="btn-outline px-8">취소</button>
              <button type="submit" disabled={isSubmitting || imageUploading || nicknameStatus === 'taken' || nicknameStatus === 'checking'} className="btn-primary px-8">
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
