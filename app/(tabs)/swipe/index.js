import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Swiper from 'react-native-deck-swiper'
import Toast from 'react-native-toast-message'
import * as Haptics from 'expo-haptics'
import { fetchSwipeCandidates, likeUser } from '../../../services/userService'

const PAGE_SIZE = 20

const SwipeScreen = () => {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [search, setSearch] = useState('')
  const searchFieldRef = useRef(null)
  const initialLoadRef = useRef(false)
  const swiperRef = useRef(null)
  const usersRef = useRef(users)
  const [processingCardIds, setProcessingCardIds] = useState({})
  const processingCardIdsRef = useRef(processingCardIds)
  const [isMatchModalVisible, setIsMatchModalVisible] = useState(false)
  const [matchedCandidate, setMatchedCandidate] = useState(null)
  const [activeMatchId, setActiveMatchId] = useState(null)

  useEffect(() => {
    usersRef.current = users
  }, [users])

  useEffect(() => {
    processingCardIdsRef.current = processingCardIds
  }, [processingCardIds])

  const showErrorToast = useCallback((message) => {
    if (message) Toast.show({ type: 'error', text1: message })
  }, [])

  const setCardProcessing = useCallback((id, value) => {
    if (!id) return
    setProcessingCardIds((prev) => {
      const nextState = { ...prev }
      if (value) nextState[id] = true
      else delete nextState[id]
      processingCardIdsRef.current = nextState
      return nextState
    })
  }, [])

  const isCardProcessing = useCallback((id) => !!processingCardIdsRef.current[id], [])

  const handleFetchCandidates = useCallback(
    async ({ reset = false, startAfter } = {}) => {
      if (reset ? loading : loadingMore || loading) return
      reset ? setLoading(true) : setLoadingMore(true)
      try {
        const result = await fetchSwipeCandidates({
          limit: PAGE_SIZE,
          startAfter: reset ? null : startAfter ?? nextCursor ?? null,
        })
        if (result.ok && result.data) {
          const incomingUsers = Array.isArray(result.data.users) ? result.data.users : []
          setUsers((prev) => (reset ? incomingUsers : [...prev, ...incomingUsers]))
          setNextCursor(result.data.nextCursor ?? null)
          setError(null)
        } else {
          const msg = result?.error?.message || 'Unable to load profiles.'
          setError(msg)
          showErrorToast(msg)
        }
      } catch (err) {
        const msg = err?.message || 'Unable to load profiles.'
        setError(msg)
        showErrorToast(msg)
      } finally {
        reset ? setLoading(false) : setLoadingMore(false)
      }
    },
    [loading, loadingMore, nextCursor, showErrorToast]
  )

  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true
    handleFetchCandidates({ reset: true })
  }, [handleFetchCandidates])

  const handleRefresh = useCallback(() => handleFetchCandidates({ reset: true }), [handleFetchCandidates])
  const handleLoadMore = useCallback(() => {
    if (nextCursor && !loading && !loadingMore) handleFetchCandidates({ startAfter: nextCursor })
  }, [handleFetchCandidates, loading, loadingMore, nextCursor])

  const handleDecision = useCallback(
    async (candidate, liked, { snapshot, index } = {}) => {
      const candidateId = candidate?.id
      if (!candidateId || processingCardIdsRef.current[candidateId]) return
      setCardProcessing(candidateId, true)
      let removalIndex = index ?? usersRef.current.findIndex((u) => u?.id === candidateId)
      let removed = false
      setUsers((prev) => {
        const list = [...prev]
        const idx = list.findIndex((u) => u?.id === candidateId)
        if (idx === -1) return list
        removed = true
        list.splice(idx, 1)
        usersRef.current = list
        return list
      })
      if (!removed) {
        setCardProcessing(candidateId, false)
        return
      }
      if (usersRef.current.length <= 5) handleLoadMore()
      try {
        const result = await likeUser({ targetUserId: candidateId, liked })
        if (!result?.ok) throw new Error(result?.error?.message || 'Unable to submit.')
        const { match, matchId } = result.data ?? {}
        if (match && matchId) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          Toast.show({ type: 'success', text1: "It's a match!" })
          setMatchedCandidate(candidate)
          setActiveMatchId(matchId)
          setIsMatchModalVisible(true)
        }
      } catch (err) {
        setUsers((prev) => {
          const list = [...prev]
          if (!list.some((u) => u?.id === candidateId)) {
            list.splice(Math.max(removalIndex, 0), 0, candidate)
          }
          usersRef.current = list
          return list
        })
        showErrorToast(err?.message || 'Unable to submit.')
      } finally {
        setCardProcessing(candidateId, false)
      }
    },
    [handleLoadMore, setCardProcessing, showErrorToast]
  )

  const handleCloseMatchModal = useCallback(() => {
    setIsMatchModalVisible(false)
    setMatchedCandidate(null)
    setActiveMatchId(null)
  }, [])

  const handleOpenChat = useCallback(() => {
    if (activeMatchId)
      router.push({ pathname: '/(tabs)/chat/chatScreen', params: { matchId: activeMatchId } })
    handleCloseMatchModal()
  }, [activeMatchId, handleCloseMatchModal, router])

  const handleOpenProfile = useCallback(
    (item) => {
      const id = typeof item?.id === 'string' ? item.id.trim() : ''
      if (!id) return
      const params = { userId: id }
      try {
        params.initialProfile = JSON.stringify({ ...item, id })
      } catch {}
      router.push({ pathname: '/profileDetail/profileDetailScreen', params })
    },
    [router]
  )

  const handleButtonDecision = useCallback(
    (liked) => {
      const snapshot = [...(usersRef.current ?? [])]
      const top = snapshot[0]
      if (!top || processingCardIdsRef.current[top.id]) return
      const swipeMethod = liked ? 'swipeRight' : 'swipeLeft'
      if (swiperRef.current?.[swipeMethod]) swiperRef.current[swipeMethod]()
      else handleDecision(top, liked, { snapshot, index: 0 })
    },
    [handleDecision]
  )

  function renderMatchModal() {
    const c = matchedCandidate
    const photoSource = resolveCandidateImage(c)
    return (
      <Modal visible={isMatchModalVisible} transparent animationType="fade" onRequestClose={handleCloseMatchModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={{ ...Fonts.primaryColor18Bold, marginBottom: Sizes.fixPadding }}>It's a Match!</Text>
            {photoSource && <Image source={photoSource} style={styles.modalAvatar} resizeMode="cover" />}
            {c?.name && (
              <Text style={{ ...Fonts.blackColor16Bold, marginTop: Sizes.fixPadding }}>
                {c.name}
                {c?.age ? `, ${c.age}` : ''}
              </Text>
            )}
            {c?.profession && (
              <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 4 }}>{c.profession}</Text>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity onPress={handleOpenChat} style={[styles.modalButton, styles.modalPrimaryButton]}>
                <Text style={{ ...Fonts.whiteColor16Bold }}>Send a Message</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCloseMatchModal} style={[styles.modalButton, styles.modalSecondaryButton]}>
                <Text style={{ ...Fonts.primaryColor16Bold }}>Keep Swiping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  function resolveCandidateImage(c) {
    if (!c) return null
    const photos = Array.isArray(c.photos) ? c.photos : []
    const primary = photos[0] || c.photoURL || c.image
    if (!primary) return null
    if (typeof primary === 'string') return { uri: primary }
    const uri = primary?.uri || primary?.url || primary?.downloadURL
    return uri ? { uri } : null
  }

  function usersInfo() {
    if (loading && users.length === 0)
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
        </View>
      )
    if (!loading && users.length === 0 && !nextCursor)
      return (
        <View style={styles.emptyStateWrap}>
          <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
            You're all caught up for now. Check back later for new profiles!
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButtonStyle}>
            <Text style={{ ...Fonts.primaryColor16Bold }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )
    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={styles.imageBottomContainre1}>
          <View style={styles.imageBottomContainre2}>
            {users.length !== 0 && (
              <Swiper
                ref={swiperRef}
                key={users[0]?.id ?? 'empty'}
                cards={users}
                backgroundColor="transparent"
                stackSize={3}
                disableTopSwipe
                disableBottomSwipe
                renderCard={(item) => renderCandidateCard(item)}
                cardStyle={styles.tinderCardWrapper}
                onSwipedLeft={(i) => {
                  const snap = [...(usersRef.current ?? [])]
                  const c = snap[i]
                  if (c) handleDecision(c, false, { snapshot: snap, index: i })
                }}
                onSwipedRight={(i) => {
                  const snap = [...(usersRef.current ?? [])]
                  const c = snap[i]
                  if (c) handleDecision(c, true, { snapshot: snap, index: i })
                }}
                onSwipedAll={handleLoadMore}
              />
            )}
          </View>
        </View>
        {error && <Text style={{ ...Fonts.grayColor13Regular, marginBottom: Sizes.fixPadding }}>{error}</Text>}
        {nextCursor && users.length > 0 && (
          <TouchableOpacity onPress={handleLoadMore} disabled={loadingMore} style={[styles.loadMoreButton, loadingMore && { opacity: 0.6 }]}>
            <Text style={{ ...Fonts.whiteColor16Bold }}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  function renderCandidateCard(item) {
    if (!item)
      return (
        <View style={[styles.tinderCardWrapper, styles.cardFallback]}>
          <View style={styles.emptyCardContent}>
            <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
              No more profiles right now. Try refreshing!
            </Text>
          </View>
        </View>
      )
    const isProcessing = isCardProcessing(item.id)
    const photoSource = resolveCandidateImage(item)
    const cardContent = (
      <LinearGradient
        colors={['rgba(0,0,0,0.58)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.58)']}
        style={{ flex: 1, justifyContent: 'space-between', borderRadius: Sizes.fixPadding * 3 }}
      >
        <View style={styles.userInfoWithOptionWrapper}>
          <TouchableOpacity disabled={isProcessing} onPress={() => handleButtonDecision(false)} style={[styles.closeAndShortlistIconWrapStyle, isProcessing && styles.disabledButton]}>
            <MaterialIcons name="close" size={24} color={Colors.primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleOpenProfile(item)} style={{ maxWidth: screenWidth - 190, alignItems: 'center', marginHorizontal: Sizes.fixPadding }}>
            <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
              {[item?.name || item?.displayName, item?.age].filter(Boolean).join(', ')}
            </Text>
            {item?.profession && <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>{item.profession}</Text>}
          </TouchableOpacity>
          <TouchableOpacity disabled={isProcessing} onPress={() => handleButtonDecision(true)} style={[styles.closeAndShortlistIconWrapStyle, isProcessing && styles.disabledButton]}>
            <MaterialIcons name="favorite" size={24} color={Colors.primaryColor} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
    return photoSource ? (
      <ImageBackground source={photoSource} style={{ height: '100%', width: '100%' }} resizeMode="cover" borderRadius={Sizes.fixPadding * 3}>
        {cardContent}
      </ImageBackground>
    ) : (
      <View style={[styles.tinderCardWrapper, styles.cardFallback]}>{cardContent}</View>
    )
  }

  function searchInfo() {
    return (
      <View style={styles.searchInfoWrapStyle}>
        <View style={styles.searchFieldWrapStyle}>
          <MaterialIcons name="search" size={22} color={Colors.grayColor} />
          <TextInput
            ref={searchFieldRef}
            placeholder="Search Partner..."
            placeholderTextColor={Colors.grayColor}
            style={{ padding: 0, flex: 1, marginLeft: Sizes.fixPadding - 2, ...Fonts.blackColor15Regular, height: 20 }}
            cursorColor={Colors.primaryColor}
            value={search}
            onChangeText={setSearch}
            selectionColor={Colors.primaryColor}
          />
        </View>
        <TouchableOpacity onPress={() => router.push('/filter/filterScreen')} style={styles.filterButtonStyle}>
          <MaterialCommunityIcons name="tune-variant" size={26} color={Colors.whiteColor} />
        </TouchableOpacity>
      </View>
    )
  }

  function header() {
    return (
      <View style={{ margin: Sizes.fixPadding * 2, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...Fonts.grayColor15Regular, marginRight: Sizes.fixPadding - 5 }}>Location</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.primaryColor} />
          </View>
          <View style={{ marginTop: Sizes.fixPadding - 5, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="location-pin" size={20} color={Colors.primaryColor} />
            <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor18Bold, marginLeft: Sizes.fixPadding - 5 }}>
              Irvine, California
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => searchFieldRef.current.focus()} style={styles.iconWrapStyle}>
            <MaterialIcons name="search" size={22} color={Colors.primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications/notificationsScreen')} style={[styles.iconWrapStyle, { marginLeft: Sizes.fixPadding + 5 }]}>
            <MaterialCommunityIcons name="bell-badge-outline" size={22} color={Colors.primaryColor} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <View style={{ flex: 1 }}>
        {header()}
        {searchInfo()}
        <View style={{ flex: 1 }}>{usersInfo()}</View>
      </View>
      {renderMatchModal()}
    </View>
  )
}

export default SwipeScreen

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlayBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sizes.fixPadding * 2,
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.whiteColor,
    borderRadius: Sizes.fixPadding * 2,
    padding: Sizes.fixPadding * 2,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: Sizes.fixPadding,
  },
  modalButtonRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: Sizes.fixPadding * 2,
    columnGap: Sizes.fixPadding,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Sizes.fixPadding,
    borderRadius: Sizes.fixPadding * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButton: { backgroundColor: Colors.primaryColor },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: Colors.primaryColor,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateWrap: { alignItems: 'center', padding: Sizes.fixPadding * 2 },
  retryButtonStyle: {
    marginTop: Sizes.fixPadding * 2,
    paddingHorizontal: Sizes.fixPadding * 3,
    paddingVertical: Sizes.fixPadding,
    borderRadius: Sizes.fixPadding * 1.5,
    borderWidth: 1,
    borderColor: Colors.primaryColor,
  },
  imageBottomContainre1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Sizes.fixPadding * 2,
  },
  imageBottomContainre2: {
    width: screenWidth - Sizes.fixPadding * 4,
    height: screenWidth * 1.25,
    borderRadius: Sizes.fixPadding * 3,
    overflow: 'hidden',
    backgroundColor: Colors.bgColor,
  },
  tinderCardWrapper: {
    width: screenWidth - Sizes.fixPadding * 4,
    height: screenWidth * 1.25,
    borderRadius: Sizes.fixPadding * 3,
    overflow: 'hidden',
    backgroundColor: Colors.bgColor,
  },
  loadMoreButton: {
    marginTop: Sizes.fixPadding * 2,
    paddingVertical: Sizes.fixPadding,
    paddingHorizontal: Sizes.fixPadding * 3,
    borderRadius: Sizes.fixPadding * 2,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
  },
  cardFallback: {
    backgroundColor: Colors.bgColor,
    justifyContent: 'center',
  },
  emptyCardContent: {
    flex: 1,
    padding: Sizes.fixPadding * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoWithOptionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Sizes.fixPadding * 1.5,
  },
  closeAndShortlistIconWrapStyle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.whiteColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.5 },
  searchInfoWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Sizes.fixPadding * 2,
    marginBottom: Sizes.fixPadding * 2,
  },
  searchFieldWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgColor,
    borderRadius: Sizes.fixPadding * 2,
    paddingVertical: Sizes.fixPadding * 0.8,
    paddingHorizontal: Sizes.fixPadding * 1.5,
    columnGap: Sizes.fixPadding,
  },
  filterButtonStyle: {
    marginLeft: Sizes.fixPadding,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
