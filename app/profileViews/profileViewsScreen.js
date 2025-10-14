import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useRouter } from 'expo-router';

const profiles = [
    {
        id: '1',
        image: require('../../assets/images/users/user11.png'),
        name: 'Samantha Smith',
        profession: 'Software Engineer',
        distance: '3.0km',
    },
    {
        id: '2',
        image: require('../../assets/images/users/user12.png'),
        name: 'Matilda Burch',
        profession: 'UI/UX Designer',
        distance: '4.5km',
    },
    {
        id: '3',
        image: require('../../assets/images/users/user13.png'),
        name: 'James Lamb',
        profession: 'Junior Front-End Developer',
        distance: '5.5km',
    },
    {
        id: '4',
        image: require('../../assets/images/users/user14.png'),
        name: 'Antonia Mcdaniel',
        profession: 'Senior Back-End Developer',
        distance: '3.0km',
    },
    {
        id: '5',
        image: require('../../assets/images/users/user12.png'),
        name: 'Matilda Burch',
        profession: 'UI/UX Designer',
        distance: '4.5km',
    },
];

const ProfileViewsScreen = () => {

    const router = useRouter();

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {profilesInfo()}
            </View>
        </View>
    )

    function profilesInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { router.push('/profileDetail/profileDetailScreen') }}
                key={`${item.id}`}
                style={styles.searchResultWrapStyle}
            >
                <Image
                    source={item.image}
                    style={styles.profileImageStyle}
                />
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0, }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                        {item.name}
                    </Text>
                    <Text numberOfLines={1} style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 8.0, }}>
                        {item.profession} • {item.distance}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={profiles}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding }}
            />
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, justifyContent: 'center' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { router.back() }}
                    style={styles.backArrowIconWrapStyle}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0, }} />
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', maxWidth: screenWidth - 130, ...Fonts.blackColor18Bold }}>
                    Profile Views
                </Text>
            </View>
        )
    }
}

export default ProfileViewsScreen

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
    searchResultWrapStyle: {
        backgroundColor: Colors.bgColor,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Sizes.fixPadding + 5.0,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
    },
    profileImageStyle: {
        width: screenWidth / 6.0,
        height: screenWidth / 6.0,
        borderRadius: Sizes.fixPadding
    }
})