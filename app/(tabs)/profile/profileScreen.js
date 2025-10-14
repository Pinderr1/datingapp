import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import React from 'react'
import { Colors, Fonts, screenWidth, Sizes, CommonStyles } from '../../../constants/styles'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from 'expo-router';
import { useUser } from '../../../contexts/UserContext';

const weeklyActivityList = [
    {
        id: '1',
        activityInPercentage: 70,
        day: 22
    },
    {
        id: '2',
        activityInPercentage: 100,
        day: 23
    },
    {
        id: '3',
        activityInPercentage: 65,
        day: 24
    },
    {
        id: '4',
        activityInPercentage: 50,
        day: 25
    },
    {
        id: '5',
        activityInPercentage: 65,
        day: 26
    },
    {
        id: '6',
        activityInPercentage: 60,
        day: 27
    },
    {
        id: '7',
        activityInPercentage: 80,
        day: 28
    },
];

const ProfileScreen = () => {

    const navigation = useNavigation();
    const { profile } = useUser() ?? {};
    const isLoadingProfile = profile === undefined;
    const hasProfile = !!profile;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 3.0 }}
                >
                    {profileInfo()}
                    {isLoadingProfile && loadingState()}
                    {!isLoadingProfile && !hasProfile && emptyState()}
                    {hasProfile && (
                        <>
                            {upgradePlaneButton()}
                            {weeklyActivityInfo()}
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    )

    function loadingState() {
        return (
            <View style={styles.stateContainer}>
                <ActivityIndicator color={Colors.primaryColor} size="small" />
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    Loading your profile...
                </Text>
            </View>
        );
    }

    function emptyState() {
        return (
            <View style={styles.stateContainer}>
                <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
                    No profile data found. Please sign in or complete your profile to see premium
                    recommendations and weekly activity.
                </Text>
            </View>
        );
    }

    function weeklyActivityInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor17Bold, marginBottom: Sizes.fixPadding * 2.0 }}>
                    Your weekly activity
                </Text>
                <View style={styles.avtivityGraphViewWrapStyle}>
                    {
                        weeklyActivityList.map((item) => (
                            <View
                                key={`${item.id}`}
                                style={{ alignItems: 'center', justifyContent: 'center', flex: 1, }}
                            >
                                <View style={styles.sliderView}>
                                    <View style={{ height: item.activityInPercentage * 150 / 100, ...styles.sliderFillView }} />
                                </View>
                                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                                    {item.day}
                                </Text>
                            </View>
                        ))
                    }
                </View>
            </View>
        )
    }

    function upgradePlaneButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('premium/premiumScreen') }}
                style={styles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Upgrade Premium Plan
                </Text>
            </TouchableOpacity>
        )
    }

    function profileInfo() {
        const photoSource = profile?.photoURL
            ? { uri: profile.photoURL }
            : require('../../../assets/images/users/user17.png');
        const displayName = profile?.name
            ? profile.name
            : (isLoadingProfile ? 'Loading name...' : 'Name unavailable');
        const ageText = profile?.age ? `, ${profile.age}` : '';
        const locationText = profile?.location
            ? profile.location
            : (isLoadingProfile ? 'Fetching location...' : 'Location unavailable');

        return (
            <View style={{ alignItems: 'center', marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Image
                    source={photoSource}
                    style={{ width: screenWidth / 3.0, height: screenWidth / 3.0, borderRadius: (screenWidth / 3.0) / 2.0 }}
                />
                <View style={{ marginTop: Sizes.fixPadding + 5.0, alignItems: 'center' }}>
                    <Text style={{ textAlign: 'center', ...Fonts.blackColor17Bold }}>
                        {`${displayName}${ageText}`}
                    </Text>
                    <Text style={{ textAlign: 'center', ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5.0 }}>
                        {locationText}
                    </Text>
                </View>
                <Text
                    style={{
                        marginTop: Sizes.fixPadding * 3.0,
                        ...Fonts.primaryColor16Medium,
                        textDecorationLine: hasProfile ? 'underline' : 'none',
                        color: hasProfile ? Colors.primaryColor : Colors.grayColor,
                    }}
                >
                    {hasProfile ? 'View Profile' : isLoadingProfile ? 'Preparing profile...' : 'Profile unavailable'}
                </Text>
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.push('settings/settingsScreen') }}
                    style={styles.headerIconWrapStyle}
                >
                    <Feather name="settings" size={20} color={Colors.primaryColor} />
                </TouchableOpacity>
                <Text numberOfLines={1} style={{ textAlign: 'center', ...Fonts.blackColor18Bold, flex: 1 }}>
                    Profile
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.push('editProfile/editProfileScreen') }}
                    style={styles.headerIconWrapStyle}
                >
                    <Feather name="edit-2" size={18} color={Colors.primaryColor} />
                </TouchableOpacity>
            </View>
        )
    }
}

export default ProfileScreen

const styles = StyleSheet.create({
    headerWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginVertical: Sizes.fixPadding + 5.0,
    },
    headerIconWrapStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonStyle: {
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginVertical: Sizes.fixPadding * 3.0,
        padding: Sizes.fixPadding + 8.0,
        elevation: 2.0,
        ...CommonStyles.buttonShadow
    },
    avtivityGraphViewWrapStyle: {
        marginVertical: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        height: 150,
        justifyContent: 'space-between',
    },
    sliderView: {
        height: '100%',
        backgroundColor: Colors.whiteColor,
        justifyContent: 'flex-end',
        borderRadius: Sizes.fixPadding,
    },
    sliderFillView: {
        width: 6.0,
        backgroundColor: Colors.primaryColor,
        borderRadius: Sizes.fixPadding
    },
    stateContainer: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding * 2.0,
        alignItems: 'center',
    }
})