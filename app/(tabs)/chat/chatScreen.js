import { StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Colors, Fonts, Sizes } from '../../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { useUser } from '../../../contexts/UserContext';
import { auth, db } from '../../../firebaseConfig';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

const defaultUserImage = require('../../../assets/images/users/user1.png');

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
                    const otherUserDataFromMatch = profiles?.[otherUserId] || null;
                    const cachedUserData = userProfileCacheRef.current.get(otherUserId) ?? null;
                    const otherUserData = otherUserDataFromMatch || cachedUserData;

                    return {
                        id: matchDoc.id,
                        otherUserId,
                        otherUserData,
                        otherUserName: otherUserData?.name || 'Unknown User',
                        matchedAt: data.matchedAt ?? null,
                    };
                });

                setMatches((prevMatches) => {
                    const prevMap = new Map(prevMatches.map((item) => [item.id, item]));
                    const nextMatches = entries.map((entry) => {
                        const previous = prevMap.get(entry.id);
                        const cachedProfile = userProfileCacheRef.current.get(entry.otherUserId) ?? null;
                        const resolvedProfile = entry.otherUserData ?? cachedProfile ?? previous?.otherUserData ?? null;
                        return {
                            id: entry.id,
                            otherUserId: entry.otherUserId,
                            otherUserData: resolvedProfile,
                            otherUserName: resolvedProfile?.name || entry.otherUserName || previous?.otherUserName || 'Unknown User',
                            matchedAt: entry.matchedAt ?? previous?.matchedAt ?? null,
                            lastMessage: previous?.lastMessage ?? '',
                            lastMessageCreatedAt: previous?.lastMessageCreatedAt ?? null,
                            lastMessageSenderId: previous?.lastMessageSenderId ?? null,
                        };
                    });
                    return nextMatches;
                });

                entries.forEach((entry) => {
                    if (!entry.otherUserData) {
                        fetchProfileForMatch(entry.id, entry.otherUserId);
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

    const fetchProfileForMatch = (matchId, otherUserId) => {
        if (!otherUserId) {
            return;
        }

        if (userProfileCacheRef.current.has(otherUserId)) {
            const cachedProfile = userProfileCacheRef.current.get(otherUserId);
            if (cachedProfile) {
                setMatches((prevMatches) => prevMatches.map((item) => {
                    if (item.id === matchId) {
                        return {
                            ...item,
                            otherUserData: cachedProfile,
                            otherUserName: cachedProfile?.name || item.otherUserName,
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

        (async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userProfileCacheRef.current.set(otherUserId, userData);
                    setMatches((prevMatches) => prevMatches.map((item) => {
                        if (item.id === matchId) {
                            return {
                                ...item,
                                otherUserData: userData,
                                otherUserName: userData?.name || item.otherUserName,
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
            const imageSource = getUserImageSource(item.otherUserData);
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
                                otherUserName: item.otherUserName,
                            },
                        });
                    }}
                    style={styles.chatWrapStyle}
                >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <View>
                            <Image
                                source={imageSource}
                                style={{ width: 50.0, height: 50.0, borderRadius: 25.0, }}
                            />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: Sizes.fixPadding + 2.0, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                                {item.otherUserName}
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

function getUserImageSource(user) {
    if (!user) {
        return defaultUserImage;
    }

    if (typeof user.image === 'number') {
        return user.image;
    }

    if (user.image) {
        return { uri: user.image };
    }

    if (user.photoURL) {
        return { uri: user.photoURL };
    }

    return defaultUserImage;
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
    }
})