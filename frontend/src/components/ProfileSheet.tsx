import { useEffect, useState } from 'react'
import { userApi, type UserProfile } from '@/api/user'
import { getSocket } from '@/hooks/useSocket'

interface Props {
  userId: string
  onClose: () => void
  onBlock?: () => void
}

export default function ProfileSheet({ userId, onClose, onBlock }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [confirmBlock, setConfirmBlock] = useState(false)

  useEffect(() => {
    userApi.getProfile(userId).then((res) => setProfile(res.data))
  }, [userId])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleUpdate = (updated: UserProfile) => {
      if (updated.id === userId) setProfile(updated)
    }

    socket.on('profile:updated', handleUpdate)
    return () => { socket.off('profile:updated', handleUpdate) }
  }, [userId])

  return (
    <>
      {/* 배경 딤 */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 pb-safe animate-slide-up">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {!profile ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-4 space-y-5">
            {/* 아바타 + 이름 */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={profile.nickname} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary-500">{profile.nickname[0]}</span>
                )}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{profile.nickname}</p>
                <p className="text-sm text-gray-500">{profile.department} · {profile.grade}학년</p>
              </div>
            </div>

            {/* MBTI */}
            {profile.mbti && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary-500 bg-primary-50 px-3 py-1 rounded-full">
                  {profile.mbti}
                </span>
              </div>
            )}

            {/* 자기소개 */}
            {profile.bio && (
              <div>
                <p className="text-xs text-gray-400 mb-1 font-medium">자기소개</p>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* 관심사 */}
            {profile.interests.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">관심사</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {onBlock && (
              confirmBlock ? (
                <div className="border border-red-100 rounded-2xl p-4 space-y-3 bg-red-50">
                  <p className="text-sm text-red-600 font-semibold text-center">
                    {profile?.nickname}님을 차단할까요?
                  </p>
                  <p className="text-xs text-red-400 text-center">
                    차단하면 대화방이 삭제되고 매칭에서도 제외됩니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmBlock(false)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold"
                    >
                      취소
                    </button>
                    <button
                      onClick={onBlock}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold"
                    >
                      차단
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBlock(true)}
                  className="w-full py-2.5 rounded-2xl border border-red-200 text-red-400 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  {profile?.nickname}님 차단하기
                </button>
              )
            )}

            <div className="pb-4" />
          </div>
        )}
      </div>
    </>
  )
}
