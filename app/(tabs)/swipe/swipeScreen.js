import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    FlatList,
    Animated,
    ActivityIndicator,
} from 'react-native'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Toast from 'react-native-toast-message'
import { fetchSwipeCandidates } from '../../../services/userService'

const PAGE_SIZE = 20

const HomeScreen = () => {

    const navigation = useNavigation();

    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [search, setsearch] = useState('');
    const searchFieldRef = useRef(null);
    const initialLoadRef = useRef(false);
    const cardAnimations = useRef(new Map()).current;

    const showErrorToast = useCallback((message) => {
        if (!message) {
            return;
        }
        Toast.show({ type: 'error', text1: message });
    }, [])

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

    function getCardAnimation(id) {
        if (!cardAnimations.has(id)) {
            cardAnimations.set(id, new Animated.Value(1));
        }
        return cardAnimations.get(id);
    }

    function removeCard(id) {
        setUsers((prev) => {
            const updated = prev.filter((item) => item.id !== id);
            if (updated.length <= 5) {
                handleLoadMore();
            }
            return updated;
        });
    };

    function changeShortlist({ id }) {
        const newUsers = users.map((item) => {
            if (item.id == id) {
                return { ...item, isFavorite: !item.isFavorite }
            }
            else {
                return item
            }
        })
        setUsers(newUsers);
    }

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
                            <FlatList
                                data={users}
                                keyExtractor={(item) => `${item.id}`}
                                scrollEnabled={false}
                                refreshing={loading && !loadingMore}
                                onRefresh={handleRefresh}
                                renderItem={({ item, index }) => {
                                    const scale = getCardAnimation(item.id);
                                    return (
                                        <Animated.View
                                            style={[
                                                styles.tinderCardWrapper,
                                                {
                                                    transform: [{ scale }],
                                                    zIndex: users.length - index,
                                                },
                                            ]}
                                        >
                                            {/* TODO: Replace this temporary FlatList stack with an Expo-compatible swipe solution (e.g. react-native-deck-swiper) once the target library is validated. */}
                                            <ImageBackground
                                                source={item.image}
                                                style={{ height: '100%', width: '100%', }}
                                                resizeMode='cover'
                                                borderRadius={Sizes.fixPadding * 3.0}
                                            >
                                                <LinearGradient
                                                    colors={['rgba(0, 0, 0, 0.58)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.58)']}
                                                    style={{
                                                        flex: 1,
                                                        justifyContent: 'space-between',
                                                        borderRadius: Sizes.fixPadding * 3.0
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', margin: Sizes.fixPadding }}>
                                                        <MaterialIcons name="location-pin" size={18} color={Colors.whiteColor} />
                                                        <Text style={{ ...Fonts.whiteColor15Regular, marginLeft: Sizes.fixPadding - 5.0, }}>
                                                            {item.address} • {item.distance}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.userInfoWithOptionWrapper}>
                                                        <TouchableOpacity
                                                            activeOpacity={0.8}
                                                            onPress={() => { removeCard(item.id); }}
                                                            style={styles.closeAndShortlistIconWrapStyle}
                                                        >
                                                            <MaterialIcons name="close" size={24} color={Colors.primaryColor} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            activeOpacity={0.8}
                                                            onPress={() => { navigation.push('profileDetail/profileDetailScreen') }}
                                                            style={{ maxWidth: screenWidth - 190, alignItems: 'center', justifyContent: 'center', marginHorizontal: Sizes.fixPadding }}
                                                        >
                                                            <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
                                                                {item.name}, {item.age}
                                                            </Text>
                                                            <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>
                                                                {item.profession}
                                                            </Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            activeOpacity={0.8}
                                                            onPress={() => { changeShortlist({ id: item.id }) }}
                                                            style={{ ...styles.closeAndShortlistIconWrapStyle, }}
                                                        >
                                                            <MaterialIcons name={item.isFavorite ? "favorite" : "favorite-border"} size={24} color={Colors.primaryColor} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </LinearGradient>
                                            </ImageBackground>
                                        </Animated.View>
                                    )
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
                    onPress={() => { navigation.push('filter/filterScreen') }}
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
                        onPress={() => { navigation.push('notifications/notificationsScreen') }}
                        style={{ ...styles.iconWrapStyle, marginLeft: Sizes.fixPadding + 5.0 }}
                    >
                        <MaterialCommunityIcons name="bell-badge-outline" size={22} color={Colors.primaryColor} />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }
}

export default HomeScreen

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
        width: screenWidth - 40,
        position: 'absolute',
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
    }
})
