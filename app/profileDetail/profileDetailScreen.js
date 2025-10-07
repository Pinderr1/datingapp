import { StyleSheet, Text, View, TouchableOpacity, Image, Platform } from 'react-native'
import React, { useState } from 'react'
import CollapsibleToolbar from 'react-native-collapsible-toolbar';
import { Colors, Sizes, Fonts, screenHeight, screenWidth, CommonStyles } from '../../constants/styles';
import { MaterialIcons } from '@expo/vector-icons'
import { Snackbar } from 'react-native-paper';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const usersInfoList = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse amet hac gravida nulla malesuada purus sed a. In sit quisque lectus nisi.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse amet hac gravida nulla malesuada purus sed a. In sit quisque lectus nisi.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse amet hac gravida nulla malesuada purus sed a. In sit quisque lectus nisi.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse amet hac gravida nulla malesuada purus sed a. In sit quisque lectus nisi.',
];

const ProfileDetailScreen = () => {

    const navigation = useNavigation();

    const [isFavorite, setisFavorite] = useState(false);
    const [showSnackBar, setshowSnackBar] = useState(false);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <CollapsibleToolbar
                renderContent={pageContent}
                renderNavBar={header}
                renderToolBar={profileImage}
                collapsedNavBarBackgroundColor={Colors.primaryColor}
                translucentStatusBar={false}
                toolBarHeight={screenHeight / 2.0}
                showsVerticalScrollIndicator={false}
            />
            {favoriteCloseAndChatButton()}
            {snackBarInfo()}
        </View>
    )

    function snackBarInfo() {
        return (
            <Snackbar
                style={styles.snackBarStyle}
                visible={showSnackBar}
                onDismiss={() => { setshowSnackBar(false) }}
            >
                <Text style={{ ...Fonts.whiteColor15Regular }}>
                    {isFavorite ? 'Added To Shortlist' : 'Remove From Shortlist'}
                </Text>
            </Snackbar>
        )
    }

    function favoriteCloseAndChatButton() {
        return (
            <View style={styles.favoriteCloseAndChatButtonWrapStyle}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.pop() }}
                    style={styles.bottomButtonStyle}
                >
                    <MaterialIcons name='close' color={Colors.primaryColor} size={22} />
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setisFavorite(!isFavorite), setshowSnackBar(true) }}
                    style={styles.favoriteIconWrapStyle}
                >
                    <MaterialIcons
                        name={isFavorite ? "favorite" : "favorite-border"}
                        size={26}
                        color={Colors.whiteColor}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.bottomButtonStyle}
                    onPress={() => { navigation.push('message/messageScreen') }}
                >
                    <Image
                        source={require('../../assets/images/icons/chat.png')}
                        style={{ width: 22, height: 22.0, resizeMode: 'contain', tintColor: Colors.primaryColor }}
                    />
                </TouchableOpacity>
            </View>
        )
    }

    function profileImage() {
        return (
            <Image
                source={require('../../assets/images/users/user10.png')}
                style={styles.profileImageStyle}
            />
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.pop() }}
                    style={styles.headerIconWrapStyle}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={Colors.whiteColor} style={{ left: 2.0, }} />
                </TouchableOpacity>
                <MaterialIcons
                    name="more-vert"
                    size={24}
                    color={Colors.whiteColor}
                    onPress={() => { }}
                />
            </View>
        )
    }

    function pageContent() {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                {userInfo()}
                {matchingInfo()}
            </View>
        )
    }

    function matchingInfo() {
        return (
            <View style={styles.matchingInfoWrapStyle}>
                <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: Sizes.fixPadding + 5.0, }}>
                    <Text numberOfLines={2} style={{ lineHeight: 25.0, ...Fonts.whiteColor18Bold }}>
                        You & Annie have 80%{`\n`}matching
                    </Text>
                    <View style={{ marginTop: Sizes.fixPadding, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ ...Fonts.whiteColor15Regular, marginRight: Sizes.fixPadding - 5.0, }}>
                            See more
                        </Text>
                        <MaterialIcons name="arrow-forward-ios" size={15} color={Colors.whiteColor} />
                    </View>
                </View>
                <Image
                    source={require('../../assets/images/icons/goal.png')}
                    style={{
                        width: screenWidth / 3.5, height: '100%', resizeMode: 'stretch',
                        transform: [{ rotate: '-10deg' }]
                    }}
                />
            </View>
        )
    }

    function userInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor20Bold }}>
                    Annie Robinson, 25
                </Text>
                {
                    usersInfoList.map((item, index) => (
                        <Text
                            key={`${index}`}
                            style={{ marginTop: Sizes.fixPadding - 5.0, lineHeight: 21.0, ...Fonts.blackColor14Regular }}
                        >
                            {item}
                        </Text>
                    ))
                }
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 2.0, }}>
                    <MaterialIcons name="location-pin" size={18} color={Colors.blackColor} />
                    <Text style={{ ...Fonts.blackColor15Regular, marginLeft: Sizes.fixPadding - 5.0 }}>
                        Ievine • 3.2km
                    </Text>
                </View>
            </View>
        )
    }
}

export default ProfileDetailScreen

const styles = StyleSheet.create({
    headerIconWrapStyle: {
        width: 40.0,
        height: 40.0,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerWrapStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Platform.OS == 'ios' ? -5 : Sizes.fixPadding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    matchingInfoWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryColor,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        elevation: 2.0,
        shadowColor: Colors.primaryColor,
        marginBottom: Sizes.fixPadding * 2.0,
        paddingHorizontal: Sizes.fixPadding + 5.0,
        marginVertical: Sizes.fixPadding,
    },
    bottomButtonStyle: {
        width: 43.0,
        height: 43.0,
        borderRadius: 21.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.bgColor
    },
    favoriteIconWrapStyle: {
        width: 55.0,
        height: 55.0,
        borderRadius: 27.5,
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3.0,
        ...CommonStyles.buttonShadow
    },
    favoriteCloseAndChatButtonWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        margin: Sizes.fixPadding * 2.0,
    },
    profileImageStyle: {
        height: screenHeight / 2.0,
        width: '100%',
        borderBottomLeftRadius: Sizes.fixPadding * 3.0,
        borderBottomRightRadius: Sizes.fixPadding * 3.0,
    },
    snackBarStyle: {
        backgroundColor: Colors.grayColor,
        position: 'absolute',
        bottom: -10.0,
        left: -10.0,
        right: -10.0,
    }
})