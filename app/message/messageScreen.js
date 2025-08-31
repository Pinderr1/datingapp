import { StyleSheet, Text, View, TextInput, Platform, FlatList, TouchableOpacity, Image, KeyboardAvoidingView } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const receiverImage = require('../../assets/images/users/user10.png');

const MessageScreen = () => {

    const userMessages = [
        {
            id: '1',
            message: 'Lorem ipsum dolor sit amet,consectetur adipiscing?',
            isSender: false,
            messageTime: '10:22 am',
        },
        {
            id: '2',
            message: 'eaque ipsa quae ab illo inventore consectetur adipiscing....',
            isSender: true,
            isSeen: true,
        },
        {
            id: '3',
            message: 'Nemo enim ipsam voluptatem quia voluptas sit.',
            isSender: true,
            isSeen: true
        },
    ];

    const navigation = useNavigation();

    const [messagesList, setMessagesList] = useState(userMessages);

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
            return (
                <View style={{
                    alignItems: item.isSender == true ? 'flex-end' : 'flex-start',
                    marginHorizontal: Sizes.fixPadding + 10.0,
                    marginVertical: Sizes.fixPadding - 2.0,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {
                            !item.isSender
                                ?
                                index != 0
                                    ?
                                    messagesList[index].isSender == messagesList[index - 1].isSender
                                        ?
                                        <View style={{ marginRight: screenWidth / 6.0, }} />
                                        :
                                        <View style={{ marginRight: Sizes.fixPadding, }}>
                                            <Image
                                                source={receiverImage}
                                                style={styles.smallProfilePicStyle}
                                            />
                                        </View>
                                    :
                                    messagesList[index].isSender == messagesList[index + 1].isSender || !messagesList[index].isSender
                                        ?
                                        <View style={{ marginRight: Sizes.fixPadding }}>
                                            <Image
                                                source={receiverImage}
                                                style={styles.smallProfilePicStyle}
                                            />
                                        </View>
                                        :
                                        null
                                :
                                null
                        }
                        <View>
                            <View style={{
                                ...styles.messageWrapStyle,
                                backgroundColor: item.isSender == true ? Colors.primaryColor : Colors.bgColor,
                            }}>
                                <Text style={{ ...item.isSender ? { ...Fonts.whiteColor15Regular } : { ...Fonts.grayColor15Regular }, lineHeight: 22.0, }}>
                                    {item.message}
                                </Text>
                            </View>
                            {
                                !item.isSender
                                    ?
                                    <Text style={{ marginTop: Sizes.fixPadding - 2.0, ...Fonts.blackColor13Regular }}>
                                        {item.messageTime}
                                    </Text>
                                    :
                                    item.isSeen
                                        ?
                                        <MaterialIcons name='done-all' color={Colors.primaryColor} size={20} style={{ alignSelf: 'flex-end', marginTop: Sizes.fixPadding - 8.0 }} />
                                        :
                                        <MaterialIcons name='done' color={Colors.primaryColor} size={20} style={{ alignSelf: 'flex-end', marginTop: Sizes.fixPadding - 8.0 }} />
                            }
                        </View>
                    </View>
                </View>
            )
        }

        return (
            <View style={{ flex: 1 }}>
                <FlatList
                    inverted
                    data={messagesList}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: 'column-reverse', }}
                />
            </View>
        )
    }

    function addMessage({ message }) {

        const oldMessages = messagesList;

        const newMessage = {
            id: messagesList.length + 1,
            message: message,
            isSender: true,
            isSeen: false,
        }

        oldMessages.push(newMessage);
        setMessagesList(oldMessages);
    }

    function typeMessage() {
        const [message, setMessage] = useState('');
        return (
            <View style={styles.typeMessageWrapStyle}>
                <View style={styles.textFieldWrapStyle}>
                    <TextInput
                        cursorColor={Colors.primaryColor}
                        value={message}
                        onChangeText={setMessage}
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
                    onPress={() => {
                        if (message != '') {
                            addMessage({ message: message })
                            setMessage('');
                        }
                    }}
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
                        onPress={() => { navigation.pop() }}
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
                            Annie Robinson
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