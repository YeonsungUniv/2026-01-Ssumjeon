import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import type { ChatMessage } from '@/types'

let socket: Socket | null = null
const socketSubscribers = new Set<(s: Socket | null) => void>()

function setSocket(s: Socket | null) {
  socket = s
  socketSubscribers.forEach((fn) => fn(s))
}

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore()
  const { appendMessage, updateRoomFromMessage } = useChatStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return
    if (initialized.current) {
      socket?.auth && ((socket.auth as Record<string, string>).token = accessToken)
      return
    }
    initialized.current = true

    const newSocket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('[Socket] connected')
      const activeRoomId = useChatStore.getState().activeRoomId
      if (activeRoomId) newSocket.emit('room:join', activeRoomId)
    })
    newSocket.on('disconnect', () => console.log('[Socket] disconnected'))
    newSocket.on('connect_error', (err) => console.warn('[Socket] connect error:', err.message))

    newSocket.on('message:new', (message: ChatMessage) => {
      appendMessage(message.roomId, message)
      updateRoomFromMessage(message)
    })

    return () => {
      newSocket.disconnect()
      setSocket(null)
      initialized.current = false
    }
  }, [isAuthenticated, accessToken, appendMessage, updateRoomFromMessage])

  return socket
}

export function getSocket() {
  return socket
}

// 소켓 생성/소멸을 React 상태로 구독 — 소켓이 늦게 생성되더라도 effect가 재실행됨
export function useSocketInstance(): Socket | null {
  const [instance, setInstance] = useState<Socket | null>(() => socket)

  useEffect(() => {
    setInstance(socket)
    socketSubscribers.add(setInstance)
    return () => { socketSubscribers.delete(setInstance) }
  }, [])

  return instance
}
