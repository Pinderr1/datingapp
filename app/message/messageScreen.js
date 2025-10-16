import { StyleSheet, Text, View, TextInput, Platform, FlatList, TouchableOpacity, Image, KeyboardAvoidingView } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { sendMessage as sendMessageService } from '../../services/userService';
import { useUser } from '../../contexts/UserContext';

const receiverImage = require('../../assets/images/users/user10.png');

const MessageScreen = () => {

    const router = useRouter();
    const params = useLocalSearchParams();

    const matchIdParam = useMemo(() => {
        if (Array.isArray(params?.matchId)) {
            return params.matchId[0];
        }
        return params?.matchId;
    }, [params]);

    const otherUserName = useMemo(() => {
        if (Array.isArray(params?.otherUserName)) {
            return params.otherUserName[0];
        }
        return params?.otherUserName;
    }, [params]);

    const matchId = typeof matchIdParam === 'string' ? matchIdParam : undefined;
    const { firebaseUser } = useUser();
    const currentUserId = firebaseUser?.uid ?? null;

    const [messagesList, setMessagesList] = useState([]);
    const [messageText, setMessageText] = useState('');

    useEffect(() => {
        if (!matchId || !currentUserId) {
            setMessagesList([]);
            return undefined;
        }

        const messagesRef = collection(db, 'matches', matchId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const fetchedMessages = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data?.content ?? '',
                    senderId: data?.senderId ?? '',
                    createdAt: data?.createdAt ?? null,
                };
            });
            setMessagesList(fetchedMessages);
        }, (error) => {
            console.error('Failed to subscribe to messages', error);
        });

        return () => {
            unsubscribe();
        };
    }, [matchId, currentUserId]);

    const handleSendMessage = async () => {
        const trimmedMessage = messageText.trim();
        if (!trimmedMessage || !matchId) {
            return;
        }

        const result = await sendMessageService(matchId, trimmedMessage);
        if (!result?.ok) {
            console.error('Failed to send message', result?.error);
            return;
        }

        setMessageText('');
    };

    const formatMessageTime = (timestamp) => {
        try {
            if (timestamp?.toDate) {
                return timestamp.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
            if (timestamp instanceof Date) {
                return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
        } catch (error) {
            console.error('Failed to format timestamp', error);
        }
        return '';
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS == 'ios' ? 'height' : null}
            style={{ flex: 1, backgroundColor: Colors.whiteColor }}
        >
            <MyStatusBar />
            <View style={{ flex: 1 }} >
                {header()}
                {messages()}
            </View>
            {typeMessage()}
        </KeyboardAvoidingView>
    )

    function messages() {
        const renderItem = ({ item, index }) => {
            const isSender = item.senderId === currentUserId;
            const previousMessage = index > 0 ? messagesList[index - 1] : null;
            const shouldShowAvatar = !isSender && (!previousMessage || previousMessage.senderId !== item.senderId);
            const formattedTime = formatMessageTime(item.createdAt);

            return (
                <View style={{
                    alignItems: isSender ? 'flex-end' : 'flex-start',
                    marginHorizontal: Sizes.fixPadding + 10.0,
                    marginVertical: Sizes.fixPadding - 2.0,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {
                            !isSender
                                ?
                                shouldShowAvatar
                                    ?
                                    <View style={{ marginRight: Sizes.fixPadding }}>
                                        <Image
                                            source={receiverImage}
                                            style={styles.smallProfilePicStyle}
                                        />
                                    </View>
                                    :
                                    <View style={{ marginRight: screenWidth / 6.0 }} />
                                :
                                null
                        }
                        <View>
                            <View style={{
                                ...styles.messageWrapStyle,
                                backgroundColor: isSender ? Colors.primaryColor : Colors.bgColor,
                            }}>
                                <Text style={{ ...(isSender ? { ...Fonts.whiteColor15Regular } : { ...Fonts.grayColor15Regular }), lineHeight: 22.0, }}>
                                    {item.content}
                                </Text>
                            </View>
                            {
                                !isSender && formattedTime
                                    ?
                                    <Text style={{ marginTop: Sizes.fixPadding - 2.0, ...Fonts.blackColor13Regular }}>
                                        {formattedTime}
                                    </Text>
                                    :
                                    null
                            }
                        </View>
                    </View>
                </View>
            )
        }

        return (
            <View style={{ flex: 1 }}>
                <FlatList
                    data={messagesList}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        )
    }

    function typeMessage() {
        return (
            <View style={styles.typeMessageWrapStyle}>
                <View style={styles.textFieldWrapStyle}>
                    <TextInput
                        cursorColor={Colors.primaryColor}
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder='Type a Message...'
                        style={{ padding: 0, ...Fonts.blackColor15Regular, flex: 1, }}
                        numberOfLines={1}
                        placeholderTextColor={Colors.grayColor}
                        selectionColor={Colors.primaryColor}
                    />
                    <MaterialIcons name="insert-emoticon" size={20} color={Colors.grayColor} />
                    <MaterialIcons name="mic-none" size={20} color={Colors.grayColor} style={{ marginLeft: Sizes.fixPadding - 5.0 }} />
                </View>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSendMessage}
                    style={styles.sendButtonWrapStyle}
                >
                    <MaterialIcons name="send" size={18} color={Colors.whiteColor} style={{ transform: [{ rotate: '-40deg' }], bottom: 2.0, }} />
                </TouchableOpacity>
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { router.back() }}
                        style={styles.backArrowWrapStyle}
                    >
                        <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0 }} />
                    </TouchableOpacity>
                    <Image
                        source={require('../../assets/images/users/user10.png')}
                        style={styles.userImageStyle}
                    />
                    <View style={{ flex: 1, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor17Bold }}>
                            {otherUserName || 'Chat'}
                        </Text>
                        <Text style={{ ...Fonts.grayColor15Regular }}>
                            Online
                        </Text>
                    </View>
                </View>
                <MaterialIcons
                    name='more-vert'
                    color={Colors.blackColor}
                    size={24}
                />
            </View>
        )
    }
}

export default MessageScreen;

const styles = StyleSheet.create({
    backArrowIconWrapStyle: {
        position: 'absolute',
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerWrapStyle: {
        margin: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userImageStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
        marginHorizontal: Sizes.fixPadding + 2.0,
    },
    backArrowWrapStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center'
    },
    typeMessageWrapStyle: {
        flexDirection: 'row',
        margin: Sizes.fixPadding * 2.0,
        alignItems: 'center'
    },
    messageWrapStyle: {
        borderRadius: Sizes.fixPadding - 5.0,
        borderBottomLeftRadius: Sizes.fixPadding * 3.0,
        borderTopLeftRadius: 0.0,
        paddingHorizontal: Sizes.fixPadding + 8.0,
        paddingVertical: Sizes.fixPadding,
        maxWidth: screenWidth / 1.3,
    },
    smallProfilePicStyle: {
        width: screenWidth / 8.0,
        height: screenWidth / 8.0,
        borderRadius: (screenWidth / 8.0) / 2.0,
    },
    sendButtonWrapStyle: {
        width: 36.0,
        height: 36.0,
        borderRadius: 18.0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primaryColor,
        marginLeft: Sizes.fixPadding + 5.0,
    },
    textFieldWrapStyle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        paddingHorizontal: Sizes.fixPadding + 5.0,
        paddingVertical: Platform.OS == 'ios' ? Sizes.fixPadding + 3.0 : Sizes.fixPadding
    }
})
