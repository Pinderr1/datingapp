import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { ScrollView } from 'react-native';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';
import ProfileListSection from '../../components/ProfileListSection';
import { searchResultProfiles, similarProfiles } from '../../constants/mockProfiles';

const SearchResultsScreen = () => {

    const navigation = useNavigation();

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
            <ProfileListSection
                profiles={searchResultProfiles}
                onPressProfile={() => { navigation.push('profileDetail/profileDetailScreen') }}
                containerStyle={{ marginHorizontal: Sizes.fixPadding * 2.0 }}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding }}
                itemStyle={{ marginHorizontal: 0, marginBottom: Sizes.fixPadding * 2.0 }}
                renderHeader={() => (
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        {searchResultProfiles.length} Profile found
                    </Text>
                )}
            />
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, justifyContent: 'center' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.pop() }}
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
    profileImageStyle: {
        width: screenWidth / 6.0,
        height: screenWidth / 6.0,
        borderRadius: Sizes.fixPadding
    }
})