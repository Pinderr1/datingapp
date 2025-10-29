import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db, auth } from '../firebaseConfig'
import { useUser } from './UserContext'

const ChatContext = createContext({
  matches: [],
  loading: true,
})

export const ChatProvider = ({ children }) => {
  const { user } = useUser()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe
    let mounted = true
    const currentUser = auth.currentUser || user

    if (!currentUser?.uid) {
      setMatches([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!mounted) return
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const hydrated = docs.map((m) => {
          const otherUserId = Array.isArray(m.users)
            ? m.users.find((id) => id && id !== currentUser.uid)
            : null
          const meta = m.userMeta || {}
          const otherMeta = otherUserId ? meta[otherUserId] || {} : {}
          return {
            ...m,
            otherUserId,
            displayName:
              otherMeta.displayName ||
              'Player',
            photoURL: otherMeta.photoURL || null,
          }
        })
        if (mounted) {
          setMatches(hydrated)
          setLoading(false)
        }
      },
      (error) => {
        console.error('Failed to listen for matches:', error?.message)
        setMatches([])
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      if (unsubscribe) unsubscribe()
    }
  }, [user?.uid])

  const value = useMemo(() => ({ matches, loading }), [matches, loading])
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChats = () => useContext(ChatContext)
export default ChatContext
