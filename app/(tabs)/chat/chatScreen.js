import { StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, Sizes } from '../../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from 'expo-router';

const chatsList = [
    {
        id: '1',
        image: require('../../../assets/images/users/user10.png'),
        name: 'Annie Robinson',
        lastMessage: 'Hello there!',
        unreadMessageCount: 5,
        lastMessageTime: '10:22 am',
        isActive: true,
    },
    {
        id: '2',
        image: require('../../../assets/images/users/user16.png'),
        name: 'Shamika Thompson',
        lastMessage: 'If you don’t mind, we can be...',
        unreadMessageCount: 2,
        lastMessageTime: '10:00 am',
        isActive: true,
    },
    {
        id: '3',
        image: require('../../../assets/images/users/user12.png'),
        name: 'Tianna Mooren',
        lastMessage: 'Hey, John!!',
        lastMessageTime: '20 June',
        isActive: false,
    },
    {
        id: '4',
        image: require('../../../assets/images/users/user13.png'),
        name: 'Kimberly Jones',
        lastMessage: 'At least we go with this one.',
        lastMessageTime: '19 June',
        isActive: true,
    },
    {
        id: '5',
        image: require('../../../assets/images/users/user14.png'),
        name: 'Aisha Smith',
        lastMessage: 'Dee you tomorrow',
        lastMessageTime: '15 June',
        isActive: false,
    },
    {
        id: '6',
        image: require('../../../assets/images/users/user11.png'),
        name: 'Hoshiyo Fukuzawa',
        lastMessage: 'Sure...',
        lastMessageTime: '9 June',
        isActive: false,
    },
    {
        id: '7',
        image: require('../../../assets/images/users/user15.png'),
        name: 'Aaliyah Williams',
        unreadMessageCount: 3,
        lastMessage: 'Hi there, How are you?',
        lastMessageTime: '9 June',
        isActive: false,
    },
];

const ChatScreen = () => {

    const navigation = useNavigation();

    const [search, setsearch] = useState('');

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {searchField()}
                {chatsInfo()}
            </View>
        </View>
    )

    function chatsInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('message/messageScreen') }}
                style={styles.chatWrapStyle}
            >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View>
                        <Image
                            source={item.image}
                            style={{ width: 50.0, height: 50.0, borderRadius: 25.0, }}
                        />
                        {
                            item.isActive
                                ?
                                <View style={styles.activeIndicatorStyle} />
                                :
                                null
                        }
                    </View>
                    <View style={{ flex: 1, marginHorizontal: Sizes.fixPadding + 2.0, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                            {item.name}
                        </Text>
                        <Text numberOfLines={1} style={{ ...item.unreadMessageCount ? { ...Fonts.blackColor15Medium } : { ...Fonts.grayColor15Regular }, marginTop: Sizes.fixPadding - 5.0, }}>
                            {item.lastMessage}
                        </Text>
                    </View>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...Fonts.grayColor13Regular }}>
                        {item.lastMessageTime}
                    </Text>
                    {
                        item.unreadMessageCount
                            ?
                            <View style={styles.unreadMessageCountWrapStyle}>
                                <Text style={{ ...Fonts.whiteColor13Bold }}>
                                    {item.unreadMessageCount}
                                </Text>
                            </View>
                            :
                            null
                    }
                </View>
            </TouchableOpacity>
        )
        return (
            <View style={{ flex: 1 }}>
                <FlatList
                    data={chatsList}
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
                    You have 2 new messages
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
    unreadMessageCountWrapStyle: {
        marginTop: Sizes.fixPadding - 5.0,
        width: 24.0,
        height: 24.0,
        borderRadius: 12.0,
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center'
    },
    activeIndicatorStyle: {
        width: 12.0,
        height: 12.0,
        borderRadius: 6.0,
        backgroundColor: Colors.greenColor,
        borderColor: Colors.whiteColor,
        borderWidth: 2.0,
        position: 'absolute',
        top: 0.0,
        right: 0.0,
    },
    chatWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
    }
})