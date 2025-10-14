import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { ScrollView } from 'react-native';
import MyStatusBar from '../../components/myStatusBar';
import { useRouter } from 'expo-router';

const searchResults = [
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
        distance: '3.0km',
    },
    {
        id: '3',
        image: require('../../assets/images/users/user13.png'),
        name: 'James Lamb',
        profession: 'Junior Front-End Developer',
        distance: '3.0km',
    },
    {
        id: '4',
        image: require('../../assets/images/users/user14.png'),
        name: 'Antonia Mcdaniel',
        profession: 'Senior Back-End Developer',
        distance: '3.0km',
    },
];

const similarProfiles = [
    {
        id: '1',
        image: require('../../assets/images/users/user3.png')
    },
    {
        id: '2',
        image: require('../../assets/images/users/user4.png')
    },
    {
        id: '3',
        image: require('../../assets/images/users/user6.png')
    },
    {
        id: '4',
        image: require('../../assets/images/users/user7.png')
    },
    {
        id: '5',
        image: require('../../assets/images/users/user3.png')
    },
    {
        id: '6',
        image: require('../../assets/images/users/user4.png')
    },
    {
        id: '7',
        image: require('../../assets/images/users/user6.png')
    },
];

const SearchResultsScreen = () => {

    const router = useRouter();

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: Sizes.fixPadding }}>
                    {resultProfiles()}
                    {similarProfilesInfo()}
                </ScrollView>
            </View>
        </View>
    )

    function similarProfilesInfo() {
        const renderItem = ({ item }) => (
            <Image
                source={item.image}
                style={{ ...styles.profileImageStyle, marginRight: Sizes.fixPadding + 5.0, }}
            />
        )
        return (
            <View style={{ marginTop: Sizes.fixPadding * 3.0, }}>
                <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, flexDirection: 'row', alignItems: 'center' }}>
                    <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor17Bold }}>
                        People nearby of similar interests
                    </Text>
                    <Text style={{ ...Fonts.primaryColor15Bold }}>
                        See all
                    </Text>
                </View>
                <FlatList
                    data={similarProfiles}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, paddingLeft: Sizes.fixPadding * 2.0, paddingRight: Sizes.fixPadding - 5.0 }}
                />
            </View>
        )
    }

    function resultProfiles() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    {searchResults.length} Profile found
                </Text>
                {
                    searchResults.map((item) => (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                if (!item?.id) return;
                                router.push({
                                    pathname: '/profileDetail/profileDetailScreen',
                                    params: {
                                        userId: item.id,
                                        initialProfile: JSON.stringify({ ...item, id: item.id }),
                                    },
                                });
                            }}
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
                    ))
                }
            </View>
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
                    Search Results
                </Text>
            </View>
        )
    }
}

export default SearchResultsScreen

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
        marginTop: Sizes.fixPadding * 2.0,
    },
    profileImageStyle: {
        width: screenWidth / 6.0,
        height: screenWidth / 6.0,
        borderRadius: Sizes.fixPadding
    }
})