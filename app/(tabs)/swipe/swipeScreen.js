import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    ActivityIndicator,
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

    const router = useRouter();

    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [search, setsearch] = useState('');
    const searchFieldRef = useRef(null);
    const initialLoadRef = useRef(false);
    const swiperRef = useRef(null);
    const usersRef = useRef(users);
    const [processingCardIds, setProcessingCardIds] = useState({});
    const processingCardIdsRef = useRef(processingCardIds);

    useEffect(() => {
        usersRef.current = users;
    }, [users]);

    useEffect(() => {
        processingCardIdsRef.current = processingCardIds;
    }, [processingCardIds]);

    const showErrorToast = useCallback((message) => {
        if (!message) {
            return;
        }
        Toast.show({ type: 'error', text1: message });
    }, [])

    const setCardProcessing = useCallback((id, value) => {
        if (!id) {
            return;
        }
        setProcessingCardIds((prev) => {
            let nextState = prev;
            if (value) {
                if (!prev[id]) {
                    nextState = { ...prev, [id]: true };
                }
            } else if (prev[id]) {
                nextState = { ...prev };
                delete nextState[id];
            }

            if (nextState !== prev) {
                processingCardIdsRef.current = nextState;
            }

            return nextState;
        });
    }, []);

    const isCardProcessing = useCallback((id) => {
        if (!id) {
            return false;
        }
        return Boolean(processingCardIdsRef.current[id]);
    }, []);

    const handleFetchCandidates = useCallback(async ({ reset = false, startAfter } = {}) => {
        if (reset) {
            if (loading) {
                return;
            }
            setLoading(true);
        } else {
            if (loadingMore || loading || (!nextCursor && !startAfter)) {
                return;
            }
            setLoadingMore(true);
        }

        const params = {
            limit: PAGE_SIZE,
            startAfter: reset ? null : (startAfter ?? nextCursor ?? null),
        };

        try {
            const result = await fetchSwipeCandidates(params);

            if (result.ok && result.data) {
                const incomingUsers = Array.isArray(result.data.users) ? result.data.users : [];
                setUsers((prev) => (reset ? incomingUsers : [...prev, ...incomingUsers]));
                setNextCursor(result.data.nextCursor ?? null);
                setError(null);
            } else {
                const message = result?.error?.message || 'Unable to load more profiles right now.';
                setError(message);
                showErrorToast(message);
            }
        } catch (err) {
            const message = err?.message || 'Unable to load more profiles right now.';
            setError(message);
            showErrorToast(message);
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    }, [loading, loadingMore, nextCursor, showErrorToast])

    useEffect(() => {
        if (initialLoadRef.current) {
            return;
        }
        initialLoadRef.current = true;
        handleFetchCandidates({ reset: true });
    }, [handleFetchCandidates])

    const handleRefresh = useCallback(() => {
        handleFetchCandidates({ reset: true });
    }, [handleFetchCandidates])

    const handleLoadMore = useCallback(() => {
        if (!nextCursor || loading || loadingMore) {
            return;
        }
        handleFetchCandidates({ startAfter: nextCursor });
    }, [handleFetchCandidates, loading, loadingMore, nextCursor])

    const handleDecision = useCallback(async (candidate, liked, { snapshot, index: providedIndex } = {}) => {
        const candidateId = candidate?.id;
        if (!candidateId) {
            return;
        }

        if (processingCardIdsRef.current[candidateId]) {
            return;
        }

        setCardProcessing(candidateId, true);

        const fallbackSnapshot = Array.isArray(snapshot) ? snapshot : [...(usersRef.current ?? [])];
        let removalIndex = typeof providedIndex === 'number' ? providedIndex : fallbackSnapshot.findIndex((item) => item?.id === candidateId);
        let updatedUsers = fallbackSnapshot;
        let removed = false;

        setUsers((prev) => {
            const currentList = Array.isArray(prev) ? prev : [];
            const currentIndex = currentList.findIndex((item) => item?.id === candidateId);

            if (currentIndex === -1) {
                updatedUsers = currentList;
                return currentList;
            }

            removed = true;
            removalIndex = currentIndex;
            updatedUsers = [
                ...currentList.slice(0, currentIndex),
                ...currentList.slice(currentIndex + 1),
            ];
            usersRef.current = updatedUsers;
            return updatedUsers;
        });

        if (!removed) {
            setCardProcessing(candidateId, false);
            return;
        }

        if (!updatedUsers || updatedUsers.length <= 5) {
            handleLoadMore();
        }

        try {
            const result = await likeUser({ targetUserId: candidateId, liked });

            if (!result?.ok) {
                const message = result?.error?.message || 'Unable to submit your decision right now.';
                throw new Error(message);
            }

            const { match, matchId } = result?.data ?? {};
            if (match && matchId) {
                try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (hapticsError) {
                    console.warn('Unable to trigger haptics feedback.', hapticsError);
                }
                Toast.show({ type: 'success', text1: "It's a match!" });
                router.push({ pathname: '/(tabs)/chat/chatScreen', params: { matchId } });
            }
        } catch (err) {
            setUsers((prev) => {
                const currentList = Array.isArray(prev) ? prev : [];
                if (currentList.some((item) => item?.id === candidateId)) {
                    return currentList;
                }

                const insertionIndex = Math.min(Math.max(removalIndex, 0), currentList.length);
                const restored = [
                    ...currentList.slice(0, insertionIndex),
                    candidate,
                    ...currentList.slice(insertionIndex),
                ];
                usersRef.current = restored;
                return restored;
            });
            const message = err?.message || 'Unable to submit your decision right now.';
            showErrorToast(message);
        } finally {
            setCardProcessing(candidateId, false);
        }
    }, [handleLoadMore, router, setCardProcessing, showErrorToast])

    const handleOpenProfile = useCallback((item) => {
        if (!item) {
            return;
        }

        const rawId = item?.id ?? item?.userId;
        const resolvedId = typeof rawId === 'string' ? rawId.trim() : (rawId != null ? String(rawId).trim() : '');

        if (!resolvedId) {
            return;
        }

        let initialProfileParam = null;
        try {
            initialProfileParam = JSON.stringify({ ...item, id: resolvedId });
        } catch (error) {
            console.warn('Failed to serialize profile for navigation.', error);
        }

        const params = { userId: resolvedId };
        if (initialProfileParam) {
            params.initialProfile = initialProfileParam;
        }

        router.push({ pathname: '/profileDetail/profileDetailScreen', params });
    }, [router]);

    const handleButtonDecision = useCallback((liked) => {
        const snapshot = Array.isArray(usersRef.current) ? [...usersRef.current] : [];
        const topCandidate = snapshot?.[0];
        if (!topCandidate) {
            return;
        }
        if (processingCardIdsRef.current[topCandidate.id]) {
            return;
        }
        const swipeMethod = liked ? 'swipeRight' : 'swipeLeft';
        if (swiperRef.current?.[swipeMethod]) {
            swiperRef.current[swipeMethod]();
        } else {
            handleDecision(topCandidate, liked, { snapshot, index: 0 });
        }
    }, [handleDecision])

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor, }}>
            <View style={{ flex: 1 }}>
                {header()}
                {searchInfo()}
                <View style={{ flex: 1, }}>
                    {usersInfo()}
                </View>
            </View>
        </View>
    )

    function usersInfo() {
        if (loading && users.length === 0) {
            return (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primaryColor} />
                </View>
            )
        }

        if (!loading && users.length === 0 && !nextCursor) {
            return (
                <View style={styles.emptyStateWrap}>
                    <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
                        You're all caught up for now. Check back later for new profiles!
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleRefresh}
                        style={styles.retryButtonStyle}
                    >
                        <Text style={{ ...Fonts.primaryColor16Bold }}>
                            Refresh
                        </Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={styles.imageBottomContainre1} >
                    <View style={styles.imageBottomContainre2} >
                        {users.length !== 0 && (
                            <Swiper
                                ref={swiperRef}
                                key={users[0]?.id ?? 'empty'}
                                cards={users}
                                backgroundColor="transparent"
                                stackSize={3}
                                cardHorizontalMargin={0}
                                cardVerticalMargin={0}
                                disableTopSwipe
                                disableBottomSwipe
                                renderCard={(item) => renderCandidateCard(item)}
                                cardStyle={styles.tinderCardWrapper}
                                onSwipedLeft={(cardIndex) => {
                                    const snapshot = Array.isArray(usersRef.current) ? [...usersRef.current] : [];
                                    const candidate = snapshot?.[cardIndex];
                                    if (candidate) {
                                        handleDecision(candidate, false, { snapshot, index: cardIndex });
                                    }
                                }}
                                onSwipedRight={(cardIndex) => {
                                    const snapshot = Array.isArray(usersRef.current) ? [...usersRef.current] : [];
                                    const candidate = snapshot?.[cardIndex];
                                    if (candidate) {
                                        handleDecision(candidate, true, { snapshot, index: cardIndex });
                                    }
                                }}
                                onSwipedAll={() => {
                                    handleLoadMore();
                                }}
                            />
                        )}
                    </View>
                </View>
                {error && (
                    <Text style={{ ...Fonts.grayColor13Regular, marginBottom: Sizes.fixPadding }}>
                        {error}
                    </Text>
                )}
                {nextCursor && users.length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLoadMore}
                        disabled={loadingMore}
                        style={[styles.loadMoreButton, loadingMore && { opacity: 0.6 }]}
                    >
                        <Text style={{ ...Fonts.whiteColor16Bold }}>
                            {loadingMore ? 'Loading…' : 'Load more'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    function renderCandidateCard(item) {
        if (!item) {
            return (
                <View style={[styles.tinderCardWrapper, styles.cardFallback]}>
                    <View style={styles.emptyCardContent}>
                        <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
                            No more profiles right now. Try refreshing!
                        </Text>
                    </View>
                </View>
            );
        }

        const isProcessing = isCardProcessing(item.id);
        const photoSource = resolveCandidateImage(item);
        const distanceLabel = item?.distance ? `${item.distance}` : null;

        const cardContent = (
            <LinearGradient
                colors={['rgba(0, 0, 0, 0.58)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.58)']}
                style={{
                    flex: 1,
                    justifyContent: 'space-between',
                    borderRadius: Sizes.fixPadding * 3.0
                }}
            >
                {(item?.address || distanceLabel) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', margin: Sizes.fixPadding }}>
                        <MaterialIcons name="location-pin" size={18} color={Colors.whiteColor} />
                        <Text style={{ ...Fonts.whiteColor15Regular, marginLeft: Sizes.fixPadding - 5.0 }}>
                            {[item?.address, distanceLabel].filter(Boolean).join(' • ')}
                        </Text>
                    </View>
                )}
                <View style={styles.userInfoWithOptionWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleButtonDecision(false)}
                        disabled={isProcessing}
                        style={[styles.closeAndShortlistIconWrapStyle, isProcessing && styles.disabledButton]}
                    >
                        <MaterialIcons name="close" size={24} color={Colors.primaryColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenProfile(item)}
                        style={{ maxWidth: screenWidth - 190, alignItems: 'center', justifyContent: 'center', marginHorizontal: Sizes.fixPadding }}
                    >
                        <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
                            {[item?.name, item?.age].filter(Boolean).join(', ')}
                        </Text>
                        {item?.profession ? (
                            <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>
                                {item.profession}
                            </Text>
                        ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleButtonDecision(true)}
                        disabled={isProcessing}
                        style={[styles.closeAndShortlistIconWrapStyle, isProcessing && styles.disabledButton]}
                    >
                        <MaterialIcons name="favorite" size={24} color={Colors.primaryColor} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );

        if (photoSource) {
            return (
                <ImageBackground
                    source={photoSource}
                    style={{ height: '100%', width: '100%' }}
                    resizeMode='cover'
                    borderRadius={Sizes.fixPadding * 3.0}
                >
                    {cardContent}
                </ImageBackground>
            );
        }

        return (
            <View style={[styles.tinderCardWrapper, styles.cardFallback]}>
                {cardContent}
            </View>
        );
    }

    function resolveCandidateImage(candidate) {
        if (!candidate) {
            return null;
        }
        const photos = Array.isArray(candidate?.photos) ? candidate.photos : [];
        const primaryPhoto = photos.length > 0 ? photos[0] : null;
        const fallback = primaryPhoto ?? candidate?.photoURL ?? candidate?.image;

        if (!fallback) {
            return null;
        }

        if (typeof fallback === 'string') {
            return { uri: fallback };
        }

        if (typeof fallback === 'object') {
            const possibleUri = fallback?.uri || fallback?.url || fallback?.downloadURL;
            if (typeof possibleUri === 'string' && possibleUri.length > 0) {
                return { uri: possibleUri };
            }
            return fallback;
        }

        return null;
    }

    function searchInfo() {
        return (
            <View style={styles.searchInfoWrapStyle}>
                <View style={styles.searchFieldWrapStyle}>
                    <MaterialIcons name="search" size={22} color={Colors.grayColor} />
                    <TextInput
                        ref={searchFieldRef}
                        placeholder='Search Partner...'
                        placeholderTextColor={Colors.grayColor}
                        style={{ padding: 0, flex: 1, marginLeft: Sizes.fixPadding - 2.0, ...Fonts.blackColor15Regular, height: 20.0, }}
                        cursorColor={Colors.primaryColor}
                        value={search}
                        onChangeText={(value) => { setsearch(value) }}
                        selectionColor={Colors.primaryColor}
                    />
                </View>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { router.push('/filter/filterScreen') }}
                    style={styles.filterButtonStyle}
                >
                    <MaterialCommunityIcons name="tune-variant" size={26} color={Colors.whiteColor} />
                </TouchableOpacity>
            </View>
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, flexDirection: 'row', alignItems: 'center', }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ ...Fonts.grayColor15Regular, marginRight: Sizes.fixPadding - 5.0, }}>
                            Location
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.primaryColor} />
                    </View>
                    <View style={{ marginTop: Sizes.fixPadding - 5.0, flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="location-pin" size={20} color={Colors.primaryColor} />
                        <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor18Bold, marginLeft: Sizes.fixPadding - 5.0, }}>
                            Irvine, California
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => searchFieldRef.current.focus()}
                        style={{ ...styles.iconWrapStyle }}
                    >
                        <MaterialIcons name="search" size={22} color={Colors.primaryColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { router.push('/notifications/notificationsScreen') }}
                        style={{ ...styles.iconWrapStyle, marginLeft: Sizes.fixPadding + 5.0 }}
                    >
                        <MaterialCommunityIcons name="bell-badge-outline" size={22} color={Colors.primaryColor} />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }
}

export default SwipeScreen

const styles = StyleSheet.create({
    iconWrapStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Sizes.fixPadding * 2.0,
    },
    emptyStateWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Sizes.fixPadding * 3.0,
    },
    retryButtonStyle: {
        marginTop: Sizes.fixPadding * 2.0,
        paddingHorizontal: Sizes.fixPadding * 3.0,
        paddingVertical: Sizes.fixPadding,
        borderRadius: Sizes.fixPadding,
        backgroundColor: Colors.bgColor,
    },
    searchInfoWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 3.0,
    },
    searchFieldWrapStyle: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.bgColor,
        paddingVertical: Sizes.fixPadding + 5.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        borderRadius: Sizes.fixPadding,
    },
    filterButtonStyle: {
        width: 50.0,
        height: 50.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        backgroundColor: Colors.primaryColor,
        marginLeft: Sizes.fixPadding + 5.0,
    },
    closeAndShortlistIconWrapStyle: {
        width: 43.0,
        height: 43.0,
        borderRadius: 21.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    },
    imageBottomContainre1: {
        borderRadius: Sizes.fixPadding * 3.0,
        backgroundColor: Colors.lightPinkColor,
        marginHorizontal: Sizes.fixPadding * 4.5,
        flex: 1,
        width: screenWidth - 100,
        paddingBottom: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        alignSelf: 'center',
    },
    imageBottomContainre2: {
        borderRadius: Sizes.fixPadding * 3.0,
        flex: 1,
        width: screenWidth - 70,
        paddingBottom: Sizes.fixPadding * 2.0,
        alignSelf: 'center',
        backgroundColor: Colors.pinkColor
    },
    tinderCardWrapper: {
        height: '100%',
        alignSelf: 'center',
        width: screenWidth - 70,
    },
    loadMoreButton: {
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        paddingHorizontal: Sizes.fixPadding * 3.0,
        borderRadius: Sizes.fixPadding,
        backgroundColor: Colors.primaryColor,
    },
    userInfoWithOptionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: Sizes.fixPadding + 8.0
    },
    disabledButton: {
        opacity: 0.6,
    },
    emptyCardContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Sizes.fixPadding * 2.0,
    },
    cardFallback: {
        borderRadius: Sizes.fixPadding * 3.0,
        backgroundColor: Colors.bgColor,
    },
})
