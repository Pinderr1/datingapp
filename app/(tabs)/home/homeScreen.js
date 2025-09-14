import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ImageBackground,
} from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Colors, Fonts, screenHeight, screenWidth, Sizes } from '../../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from 'expo-router'
import TinderCard from 'react-tinder-card'
import { LinearGradient } from 'expo-linear-gradient'
import { fetchUsers } from '../../../services/userService'

const HomeScreen = () => {

    const navigation = useNavigation();

    const [users, setusers] = useState([])
    const [search, setsearch] = useState('');
    const searchFieldRef = useRef(null);
    const [cursor, setCursor] = useState(null);
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    async function loadMore() {
        if (loading || done) return;
        setLoading(true);
        try {
            const { users: fetched, nextCursor } = await fetchUsers({ limit: 20, startAfter: cursor });
            setusers(p => [...p, ...fetched]);
            if (fetched.length === 0) setDone(true);
            setCursor(nextCursor || null);
            if (!nextCursor) setDone(true);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }

    useEffect(() => { loadMore(); }, []);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor, }}>
            <View style={{ flex: 1 }}>
                {header()}
                {searchInfo()}
                <View style={{ flex: 1, }}>
                    {usersInfo()}
                </View>
            </View>
        </View>
    )

    function removeCard(id) {
        const copyUsers = users;
        const newUsers = copyUsers.filter((item) => item.id !== id);
        setusers(newUsers);
        if (newUsers.length === 0) loadMore();
    };

    function changeShortlist({ id }) {
        const copyUsers = users;
        const newUsers = copyUsers.map((item) => {
            if (item.id == id) {
                return { ...item, isFavorite: !item.isFavorite }
            }
            else {
                return item
            }
        })
        setusers(newUsers);
    }

    function usersInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={styles.imageBottomContainre1} >
                    <View style={styles.imageBottomContainre2} >
                        {users.map((item, index) => (
                            <View
                                key={`${item.id}`}
                                style={styles.tinderCardWrapper}
                            >
                                <TinderCard onCardLeftScreen={() => removeCard(item.id)}>
                                    <ImageBackground
                                        source={item.image}
                                        style={{ height: '100%', width: '100%', }}
                                        resizeMode='cover'
                                        borderRadius={Sizes.fixPadding * 3.0}
                                    >
                                        <LinearGradient
                                            colors={['rgba(0, 0, 0, 0.58)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.58)']}
                                            style={{
                                                flex: 1,
                                                justifyContent: 'space-between',
                                                borderRadius: Sizes.fixPadding * 3.0
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', margin: Sizes.fixPadding }}>
                                                <MaterialIcons name="location-pin" size={18} color={Colors.whiteColor} />
                                                <Text style={{ ...Fonts.whiteColor15Regular, marginLeft: Sizes.fixPadding - 5.0, }}>
                                                    {item.address} • {item.distance}
                                                </Text>
                                            </View>
                                            <View style={styles.userInfoWithOptionWrapper}>
                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() => { removeCard(item.id) }}
                                                    style={styles.closeAndShortlistIconWrapStyle}
                                                >
                                                    <MaterialIcons name="close" size={24} color={Colors.primaryColor} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() => { navigation.push('profileDetail/profileDetailScreen') }}
                                                    style={{ maxWidth: screenWidth - 190, alignItems: 'center', justifyContent: 'center', marginHorizontal: Sizes.fixPadding }}
                                                >
                                                    <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
                                                        {item.name}, {item.age}
                                                    </Text>
                                                    <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>
                                                        {item.profession}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() => { changeShortlist({ id: item.id }) }}
                                                    style={{ ...styles.closeAndShortlistIconWrapStyle, }}
                                                >
                                                    <MaterialIcons name={item.isFavorite ? "favorite" : "favorite-border"} size={24} color={Colors.primaryColor} />
                                                </TouchableOpacity>
                                            </View>
                                        </LinearGradient>
                                    </ImageBackground>
                                </TinderCard>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        )
    }

    function searchInfo() {
        return (
            <View style={styles.searchInfoWrapStyle}>
                <View style={styles.searchFieldWrapStyle}>
                    <MaterialIcons name="search" size={22} color={Colors.grayColor} />
                    <TextInput
                        ref={searchFieldRef}
                        placeholder='Search Partner...'
                        placeholderTextColor={Colors.grayColor}
                        style={{ padding: 0, flex: 1, marginLeft: Sizes.fixPadding - 2.0, ...Fonts.blackColor15Regular, height: 20.0, }}
                        cursorColor={Colors.primaryColor}
                        value={search}
                        onChangeText={(value) => { setsearch(value) }}
                        selectionColor={Colors.primaryColor}
                    />
                </View>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.push('filter/filterScreen') }}
                    style={styles.filterButtonStyle}
                >
                    <MaterialCommunityIcons name="tune-variant" size={26} color={Colors.whiteColor} />
                </TouchableOpacity>
            </View>
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, flexDirection: 'row', alignItems: 'center', }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ ...Fonts.grayColor15Regular, marginRight: Sizes.fixPadding - 5.0, }}>
                            Location
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.primaryColor} />
                    </View>
                    <View style={{ marginTop: Sizes.fixPadding - 5.0, flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="location-pin" size={20} color={Colors.primaryColor} />
                        <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor18Bold, marginLeft: Sizes.fixPadding - 5.0, }}>
                            Irvine, California
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => searchFieldRef.current.focus()}
                        style={{ ...styles.iconWrapStyle }}
                    >
                        <MaterialIcons name="search" size={22} color={Colors.primaryColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { navigation.push('notifications/notificationsScreen') }}
                        style={{ ...styles.iconWrapStyle, marginLeft: Sizes.fixPadding + 5.0 }}
                    >
                        <MaterialCommunityIcons name="bell-badge-outline" size={22} color={Colors.primaryColor} />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }
}

export default HomeScreen

const styles = StyleSheet.create({
    iconWrapStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center'
    },   
    searchInfoWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 3.0,
    },
    searchFieldWrapStyle: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.bgColor,
        paddingVertical: Sizes.fixPadding + 5.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        borderRadius: Sizes.fixPadding,
    },
    filterButtonStyle: {
        width: 50.0,
        height: 50.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        backgroundColor: Colors.primaryColor,
        marginLeft: Sizes.fixPadding + 5.0,
    },
    closeAndShortlistIconWrapStyle: {
        width: 43.0,
        height: 43.0,
        borderRadius: 21.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    },       
    imageBottomContainre1: {
        borderRadius: Sizes.fixPadding * 3.0,
        backgroundColor: Colors.lightPinkColor,
        marginHorizontal: Sizes.fixPadding * 4.5,
        flex: 1,
        width: screenWidth - 100,
        paddingBottom: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        alignSelf: 'center',
    },
    imageBottomContainre2: {
        borderRadius: Sizes.fixPadding * 3.0,
        flex: 1,
        width: screenWidth - 70,
        paddingBottom: Sizes.fixPadding * 2.0,
        alignSelf: 'center',
        backgroundColor: Colors.pinkColor
    },
    tinderCardWrapper: {
        height: '100%',
        alignSelf: 'center',
        width: screenWidth - 40,
        position: 'absolute',
    },
    userInfoWithOptionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: Sizes.fixPadding + 8.0
    }
})