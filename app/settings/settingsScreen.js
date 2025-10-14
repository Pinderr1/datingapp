import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth'
import { auth } from '../../firebaseConfig'

const SettingsScreen = () => {

    const router = useRouter();
    const navigation = useNavigation();

    const [resetDislik, setresetDislik] = useState(true);
    const [hideLocation, sethideLocation] = useState(false);
    const [darkMode, setdarkMode] = useState(false);
    const [showLogoutDialog, setshowLogoutDialog] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setshowLogoutDialog(false);
            navigation.reset({ index: 0, routes: [{ name: 'auth/loginScreen' }] });
            router.replace('/auth/loginScreen');
        } catch (error) {
            Alert.alert('Logout Failed', error?.message ?? 'Unable to logout. Please try again.');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {generalInfo()}
                    {appSettingInfo()}
                    {legalInfo()}
                </ScrollView>
            </View>
            {logoutDialog()}
        </View>
    )

    function logoutDialog() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={showLogoutDialog}
                onRequestClose={() => { setshowLogoutDialog(false) }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => { setshowLogoutDialog(false) }}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <View style={{ justifyContent: "center", flex: 1 }}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => { }}
                            style={{ ...styles.dialogStyle, alignSelf: 'center' }}
                        >
                            <Text style={{ ...Fonts.grayColor16Regular }}>
                                Sure you want to logout?
                            </Text>
                            <View style={{ marginTop: Sizes.fixPadding * 2.0, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                                <Text onPress={() => { setshowLogoutDialog(false) }} style={{ ...Fonts.grayColor16Bold }}>
                                    Cancel
                                </Text>
                                <Text onPress={handleLogout} style={{ marginLeft: Sizes.fixPadding * 2.0, ...Fonts.primaryColor16Bold }}>
                                    Logout
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    function legalInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 3.0, marginBottom: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding * 2.0 }}>
                    Legal
                </Text>
                <Text onPress={() => { router.push('/contactUs/contactUsScreen') }} style={{ ...Fonts.blackColor16Regular, }}>
                    Contact us
                </Text>
                {divider()}
                <Text onPress={() => { router.push('/termsAndCondition/termsAndConditionScreen') }} style={{ ...Fonts.blackColor16Regular, }}>
                    Terms & Conditions
                </Text>
                {divider()}
                <Text onPress={() => { setshowLogoutDialog(true) }} style={{ ...Fonts.primaryColor16Bold }}>
                    Logout
                </Text>
            </View>
        )
    }

    function appSettingInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding - 5.0, }}>
                <Text style={{ ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding * 2.0, }}>
                    App setting
                </Text>
                {appSettingsSort({ option: 'Reset disliked profiles', on: resetDislik, changeOn: () => setresetDislik(!resetDislik) })}
                {divider()}
                {appSettingsSort({ option: 'Hide my location', on: hideLocation, changeOn: () => sethideLocation(!hideLocation) })}
                {divider()}
                {appSettingsSort({ option: 'Enable dark mode', on: darkMode, changeOn: () => setdarkMode(!darkMode) })}
                {divider()}
                {verifyAccountInfo()}
            </View>
        )
    }

    function verifyAccountInfo() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                    Verify my account
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...Fonts.primaryColor15Medium, marginHorizontal: Sizes.fixPadding - 5.0, }}>
                        More details
                    </Text>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color={Colors.primaryColor} />
                </View>
            </View>
        )
    }

    function divider() {
        return (
            <View style={{ backgroundColor: 'rgba(138,156,191,0.2)', height: 1.0, marginVertical: Sizes.fixPadding + 5.0 }} />
        )
    }

    function appSettingsSort({ option, on, changeOn }) {
        return (
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                    <Text style={{ flex: 1, ...Fonts.blackColor16Regular }}>
                        {option}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={changeOn}
                        style={{
                            backgroundColor: on ? Colors.primaryColor : '#8A9CBF40',
                            alignItems: on ? 'flex-end' : 'flex-start',
                            ...styles.switchStyle,
                        }}
                    >
                        <View style={{ backgroundColor: Colors.whiteColor, width: 12.0, height: 12.0, borderRadius: 6.0 }} />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    function generalInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding * 2.0, }}>
                    General
                </Text>
                {generalOptionSort({ icon: 'account-outline', color: Colors.blueColor, option: 'Profile Views', onPress: () => { router.push('/profileViews/profileViewsScreen') } })}
                {generalOptionSort({ icon: 'bell-badge-outline', color: Colors.purpleColor, option: 'Notifications', onPress: () => { router.push('/notifications/notificationsScreen') } })}
                {generalOptionSort({ icon: 'account-group-outline', color: Colors.cyanColor, option: 'Profile Matches', onPress: () => { } })}
            </View>
        )
    }

    function generalOptionSort({ icon, color, option, onPress }) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.fixPadding + 5.0, }}
            >
                <View style={{ ...styles.iconWrapStyle, position: 'relative' }}>
                    <MaterialCommunityIcons name={icon} size={24} color={color} />
                </View>
                <Text style={{ flex: 1, marginLeft: Sizes.fixPadding * 2.0, ...Fonts.blackColor16Medium }}>
                    {option}
                </Text>
            </TouchableOpacity>
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, justifyContent: 'center' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { router.back() }}
                    style={styles.iconWrapStyle}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0, }} />
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', maxWidth: screenWidth - 130, ...Fonts.blackColor18Bold }}>
                    Settings
                </Text>
            </View>
        )
    }
}

export default SettingsScreen

const styles = StyleSheet.create({
    iconWrapStyle: {
        position: 'absolute',
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    switchStyle: {
        width: 30.0,
        height: 18.0,
        borderRadius: Sizes.fixPadding * 2.0,
        justifyContent: 'center',
        paddingHorizontal: Sizes.fixPadding - 8.0,
    },
    dialogStyle: {
        width: '85%',
        backgroundColor: Colors.whiteColor,
        padding: Sizes.fixPadding * 2.0,
        borderRadius: Sizes.fixPadding,
    },
})