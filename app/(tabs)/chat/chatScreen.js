import { Animated, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Colors, Fonts, Sizes } from '../../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { useUser } from '../../../contexts/UserContext';
import { auth, db } from '../../../firebaseConfig';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

const defaultUserImage = require('../../../assets/images/users/user1.png');
const LOADING_DISPLAY_NAME = 'Loading…';

const ChatScreen = () => {

    const router = useRouter();

    const [search, setsearch] = useState('');
    const [matches, setMatches] = useState([]);
    const { profile } = useUser();
    const messageListenersRef = useRef({});
    const userProfileCacheRef = useRef(new Map());
    const pendingProfileFetchesRef = useRef(new Map());

    const currentUserId = profile?.uid || auth.currentUser?.uid || null;

    useEffect(() => {
        userProfileCacheRef.current.clear()
        pendingProfileFetchesRef.current.clear()
    }, [currentUserId])

    useEffect(() => {
        if (!currentUserId) {
            setMatches([]);
            return () => { };
        }

        const matchesQuery = query(
            collection(db, 'matches'),
            where('users', 'array-contains', currentUserId),
            orderBy('updatedAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const loadMatches = () => {
                const entries = snapshot.docs.map((matchDoc) => {
                    const data = matchDoc.data() || {};
                    const users = Array.isArray(data.users) ? data.users : [];
                    const otherUserId = users.find((id) => id !== currentUserId) || currentUserId;
                    const profiles = data.profiles && typeof data.profiles === 'object' ? data.profiles : {};
                    const rawProfileFromMatch = profiles?.[otherUserId];
                    const profileFromMatch = rawProfileFromMatch && typeof rawProfileFromMatch === 'object' ? rawProfileFromMatch : null;
                    const hasProfileFromMatch = !!(profileFromMatch && Object.keys(profileFromMatch).length > 0);
                    const cachedUserData = userProfileCacheRef.current.get(otherUserId) ?? null;
                    const resolvedProfile = combineProfiles(cachedUserData, profileFromMatch);

                    return {
                        id: matchDoc.id,
                        otherUserId,
                        otherUserData: resolvedProfile,
                        otherUserName: getProfileDisplayName(resolvedProfile),
                        matchedAt: data.matchedAt ?? null,
                        hasProfileFromMatch,
                    };
                });

                setMatches((prevMatches) => {
                    const prevMap = new Map(prevMatches.map((item) => [item.id, item]));
                    const nextMatches = entries.map((entry) => {
                        const previous = prevMap.get(entry.id);
                        const cachedProfile = userProfileCacheRef.current.get(entry.otherUserId) ?? null;
                        const resolvedProfile = combineProfiles(previous?.otherUserData, cachedProfile, entry.otherUserData);
                        const fallbackName = previous?.otherUserName && previous.otherUserName !== LOADING_DISPLAY_NAME ? previous.otherUserName : '';
                        const resolvedName = getProfileDisplayName(resolvedProfile) || entry.otherUserName || fallbackName || LOADING_DISPLAY_NAME;

                        return {
                            id: entry.id,
                            otherUserId: entry.otherUserId,
                            otherUserData: resolvedProfile,
                            otherUserName: resolvedName,
                            matchedAt: entry.matchedAt ?? previous?.matchedAt ?? null,
                            lastMessage: previous?.lastMessage ?? '',
                            lastMessageCreatedAt: previous?.lastMessageCreatedAt ?? null,
                            lastMessageSenderId: previous?.lastMessageSenderId ?? null,
                        };
                    });
                    return nextMatches;
                });

                entries.forEach((entry) => {
                    const hasCachedProfile = userProfileCacheRef.current.has(entry.otherUserId);
                    const cachedProfile = userProfileCacheRef.current.get(entry.otherUserId) ?? null;
                    const resolvedName = getProfileDisplayName(entry.otherUserData || cachedProfile);
                    const shouldFetchProfile = !!currentUserId && ((!entry.hasProfileFromMatch && !hasCachedProfile) || (!resolvedName && !hasCachedProfile));

                    if (shouldFetchProfile) {
                        fetchProfileForMatch(entry.otherUserId);
                    }
                });

                const currentMatchIds = new Set(entries.map((entry) => entry.id));
                Object.entries(messageListenersRef.current).forEach(([matchId, unsubscribeMessage]) => {
                    if (!currentMatchIds.has(matchId)) {
                        unsubscribeMessage();
                        delete messageListenersRef.current[matchId];
                    }
                });

                entries.forEach((entry) => {
                    if (messageListenersRef.current[entry.id]) {
                        return;
                    }

                    if (!currentUserId) {
                        return;
                    }

                    const messagesQuery = query(
                        collection(db, 'matches', entry.id, 'messages'),
                        orderBy('createdAt', 'desc'),
                        limit(1)
                    );

                    const unsubscribeMessage = onSnapshot(messagesQuery, (messageSnapshot) => {
                        const latestMessageDoc = messageSnapshot.docs[0];
                        const messageData = latestMessageDoc?.data();

                        setMatches((prevMatches) => prevMatches.map((item) => {
                            if (item.id === entry.id) {
                                return {
                                    ...item,
                                    lastMessage: messageData?.content ?? '',
                                    lastMessageCreatedAt: messageData?.createdAt ?? null,
                                    lastMessageSenderId: messageData?.senderId ?? null,
                                };
                            }
                            return item;
                        }));
                    }, (error) => {
                        console.error('Failed to listen for latest message', error);
                    });

                    messageListenersRef.current[entry.id] = unsubscribeMessage;
                });
            };

            try {
                loadMatches();
            } catch (error) {
                console.error('Failed to load matches', error);
            }
        }, (error) => {
            console.error('Failed to listen for matches', error);
        });

        return () => {
            unsubscribe();
            Object.values(messageListenersRef.current).forEach((unsubscribeMessage) => unsubscribeMessage());
            messageListenersRef.current = {};
        };
    }, [currentUserId]);

    const fetchProfileForMatch = (otherUserId) => {
        if (!currentUserId || !otherUserId) {
            return;
        }

        if (userProfileCacheRef.current.has(otherUserId)) {
            const cachedProfile = userProfileCacheRef.current.get(otherUserId);
            if (cachedProfile) {
                const displayName = getProfileDisplayName(cachedProfile);
                setMatches((prevMatches) => prevMatches.map((item) => {
                    if (item.otherUserId === otherUserId) {
                        const mergedProfile = combineProfiles(item.otherUserData, cachedProfile);
                        return {
                            ...item,
                            otherUserData: mergedProfile,
                            otherUserName: displayName || item.otherUserName || LOADING_DISPLAY_NAME,
                        };
                    }
                    return item;
                }));
            }
            return;
        }

        if (pendingProfileFetchesRef.current.has(otherUserId)) {
            return;
        }

        pendingProfileFetchesRef.current.set(otherUserId, true);
        const activeUserId = currentUserId;

        (async () => {
            try {
                if (!activeUserId) {
                    return;
                }

                if (!currentUserId || currentUserId !== activeUserId) {
                    return;
                }

                const userDocRef = doc(db, 'users', otherUserId);
                const userDoc = await getDoc(userDocRef);

                if (activeUserId !== currentUserId) {
                    return;
                }

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const normalizedProfile = combineProfiles(userData);
                    userProfileCacheRef.current.set(otherUserId, normalizedProfile);
                    const displayName = getProfileDisplayName(normalizedProfile);
                    setMatches((prevMatches) => prevMatches.map((item) => {
                        if (item.otherUserId === otherUserId) {
                            const mergedProfile = combineProfiles(item.otherUserData, normalizedProfile);
                            return {
                                ...item,
                                otherUserData: mergedProfile,
                                otherUserName: displayName || item.otherUserName || LOADING_DISPLAY_NAME,
                            };
                        }
                        return item;
                    }));
                } else {
                    userProfileCacheRef.current.set(otherUserId, null);
                }
            } catch (error) {
                console.error('Failed to fetch user profile', error);
            } finally {
                pendingProfileFetchesRef.current.delete(otherUserId);
            }
        })();
    };

    const filteredMatches = matches.filter((match) => {
        if (!search.trim()) {
            return true;
        }
        return match.otherUserName?.toLowerCase().includes(search.trim().toLowerCase());
    });

    const getSortTimestamp = (match) => {
        if (match?.lastMessageCreatedAt && typeof match.lastMessageCreatedAt.toMillis === 'function') {
            return match.lastMessageCreatedAt.toMillis();
        }
        if (match?.matchedAt && typeof match.matchedAt.toMillis === 'function') {
            return match.matchedAt.toMillis();
        }
        return 0;
    };

    const sortedMatches = [...filteredMatches].sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));

    if (!currentUserId) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.blackColor18Bold, textAlign: 'center' }}>Please sign in</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {searchField()}
                {chatsInfo()}
            </View>
        </View>
    )

    function chatsInfo() {
        const renderItem = ({ item }) => {
            const { source: imageSource, isRemote, cacheKey } = getUserImageInfo(item.otherUserData);
            const displayName = item.otherUserName || LOADING_DISPLAY_NAME;
            const lastMessageText = item.lastMessage?.trim() ? item.lastMessage : 'Say hello to start chatting';
            const formattedTime = formatTimestamp(item.lastMessageCreatedAt);

            return (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        router.push({
                            pathname: '/message/messageScreen',
                            params: {
                                matchId: item.id,
                                otherUserId: item.otherUserId,
                                otherUserName: displayName,
                            },
                        });
                    }}
                    style={styles.chatWrapStyle}
                >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <View>
                            <ChatAvatar source={imageSource} isRemote={isRemote} cacheKey={cacheKey} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: Sizes.fixPadding + 2.0, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                                {displayName}
                            </Text>
                            <Text numberOfLines={1} style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5.0, }}>
                                {lastMessageText}
                            </Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        {
                            formattedTime
                                ?
                                <Text style={{ ...Fonts.grayColor13Regular }}>
                                    {formattedTime}
                                </Text>
                                :
                                null
                        }
                    </View>
                </TouchableOpacity>
            )
        }
        return (
            <View style={{ flex: 1 }}>
                <FlatList
                    data={sortedMatches}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: Sizes.fixPadding }}
                    ListHeaderComponent={messagesInfo()}
                    automaticallyAdjustKeyboardInsets={true}
                />
            </View>
        )
    }

    function messagesInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor18Bold }}>
                    Messages
                </Text>
                <Text style={{ marginTop: Sizes.fixPadding - 5.0, ...Fonts.grayColor15Regular }}>
                    {matches.length === 0 ? 'No matches yet' : `You have ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`}
                </Text>
            </View>
        )
    }

    function searchField() {
        return (
            <View style={styles.searchFieldWrapStyle}>
                <MaterialIcons name="search" size={22} color={Colors.grayColor} />
                <TextInput
                    placeholder='Search Partner...'
                    placeholderTextColor={Colors.grayColor}
                    style={{ padding: 0, flex: 1, marginLeft: Sizes.fixPadding - 2.0, ...Fonts.blackColor15Regular, height: 20.0, }}
                    numberOfLines={1}
                    cursorColor={Colors.primaryColor}
                    value={search}
                    onChangeText={(value) => { setsearch(value) }}
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }
}

const ChatAvatar = React.memo(({ source, isRemote, cacheKey }) => {
    const fadeAnim = useRef(new Animated.Value(isRemote ? 0 : 1)).current;
    const [showPlaceholder, setShowPlaceholder] = useState(isRemote);

    useEffect(() => {
        fadeAnim.setValue(isRemote ? 0 : 1);
        setShowPlaceholder(isRemote);
    }, [fadeAnim, isRemote, cacheKey]);

    const handleOnLoad = () => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            setShowPlaceholder(false);
        });
    };

    return (
        <View style={styles.avatarContainer}>
            {showPlaceholder && (
                <Image
                    source={defaultUserImage}
                    style={[styles.avatarImage, StyleSheet.absoluteFillObject]}
                />
            )}
            {isRemote ? (
                <Animated.Image
                    source={source}
                    onLoad={handleOnLoad}
                    style={[styles.avatarImage, StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
                />
            ) : (
                <Image
                    source={source}
                    style={styles.avatarImage}
                />
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.cacheKey === nextProps.cacheKey &&
        prevProps.isRemote === nextProps.isRemote
    );
});

function getUserImageInfo(user) {
    if (!user || typeof user !== 'object') {
        return { source: defaultUserImage, isRemote: false, cacheKey: 'default' };
    }

    if (typeof user.image === 'number') {
        return { source: user.image, isRemote: false, cacheKey: String(user.image) };
    }

    const remoteUri = [
        user.image,
        user.photoURL,
        user.avatarUrl,
        user.avatar,
        user.profileImage,
        user.profilePhoto,
        user.profilePicture,
    ].find((value) => typeof value === 'string' && value.trim().length > 0);

    if (remoteUri) {
        return { source: { uri: remoteUri }, isRemote: true, cacheKey: remoteUri };
    }

    return { source: defaultUserImage, isRemote: false, cacheKey: 'default' };
}

function getProfileDisplayName(profile) {
    if (!profile || typeof profile !== 'object') {
        return '';
    }

    const candidates = [profile.name, profile.displayName, profile.fullName, profile.username];
    for (const candidate of candidates) {
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed) {
                return trimmed;
            }
        }
    }

    return '';
}

function combineProfiles(...profiles) {
    return profiles.reduce((result, profile) => {
        if (!profile || typeof profile !== 'object') {
            return result;
        }

        if (!result) {
            return { ...profile };
        }

        return { ...result, ...profile };
    }, null);
}

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return '';
    }

    const date = timestamp.toDate();
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isSameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        ...(isSameYear ? {} : { year: 'numeric' })
    });
}

export default ChatScreen

const styles = StyleSheet.create({
    searchFieldWrapStyle: {
        flexDirection: 'row',
        backgroundColor: Colors.bgColor,
        paddingVertical: Sizes.fixPadding + 5.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        borderRadius: Sizes.fixPadding,
        margin: Sizes.fixPadding * 2.0,
    },
    chatWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
    },
    avatarContainer: {
        width: 50.0,
        height: 50.0,
        borderRadius: 25.0,
        overflow: 'hidden',
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25.0,
    }
})
