import { StyleSheet, Text, View, Animated, TouchableHighlight, Image, TouchableOpacity } from 'react-native'
import React, { useState, } from 'react'
import { Colors, Fonts, Sizes, screenWidth } from '../../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';

const shortlistData = [
    {
        key: '1',
        image: require('../../../assets/images/users/user11.png'),
        name: 'Samantha Smith',
        profession: 'Software Engineer',
        distance: '3.0km',
    },
    {
        key: '2',
        image: require('../../../assets/images/users/user12.png'),
        name: 'Matilda Burch',
        profession: 'UI/UX Designer',
        distance: '3.0km',
    },
    {
        key: '3',
        image: require('../../../assets/images/users/user13.png'),
        name: 'James Lamb',
        profession: 'Junior Front-End Developer',
        distance: '3.0km',
    },
    {
        key: '4',
        image: require('../../../assets/images/users/user14.png'),
        name: 'Antonia Mcdaniel',
        profession: 'Senior Back-End Developer',
        distance: '3.0km',
    },
    {
        key: '5',
        image: require('../../../assets/images/users/user15.png'),
        name: 'Caroline Chepkirui',
        profession: 'Junior Front-End Developer',
        distance: '5.5km',
    },
];

const rowSwipeAnimatedValues = {};

Array(shortlistData.length + 1)
    .fill('')
    .forEach((_, i) => {
        rowSwipeAnimatedValues[`${i}`] = new Animated.Value(0);
    });

const ShortlistScreen = () => {

    const router = useRouter();

    const [showSnackBar, setShowSnackBar] = useState(false);
    const [listData, setListData] = useState(shortlistData);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1, }}>
                {header()}
                {shortlistDataInfo()}
            </View>
            {snackBarInfo()}
        </View>
    )

    function snackBarInfo() {
        return (
            <Snackbar
                style={styles.snackBarStyle}
                visible={showSnackBar}
                onDismiss={() => setShowSnackBar(false)}
            >
                <Text style={{ ...Fonts.whiteColor15Medium }}>
                    Removed from Shortlist
                </Text>
            </Snackbar>
        )
    }

    function shortlistDataInfo() {
        return (
            listData.length == 0
                ?
                noDataInfo()
                :
                dataInfo()
        )
    }

    function dataInfo() {
        const closeRow = (rowMap, rowKey) => {
            if (rowMap[rowKey]) {
                rowMap[rowKey].closeRow();
            }
        };

        const deleteRow = (rowMap, rowKey) => {
            closeRow(rowMap, rowKey);
            const newData = [...listData];
            const prevIndex = listData.findIndex(item => item.key === rowKey);
            newData.splice(prevIndex, 1);
            setShowSnackBar(true);
            setListData(newData);
        };

        const onSwipeValueChange = swipeData => {
            const { key, value } = swipeData;
            rowSwipeAnimatedValues[key].setValue(Math.abs(value));
        };

        const renderItem = data => (
            <TouchableHighlight
                activeOpacity={0.9}
                style={{ backgroundColor: Colors.whiteColor }}
            >
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { router.push('/profileDetail/profileDetailScreen') }}
                    key={`${data.item.key}`}
                    style={styles.shortlistDataWrapStyle}
                >
                    <Image
                        source={data.item.image}
                        style={styles.profileImageStyle}
                    />
                    <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                            {data.item.name}
                        </Text>
                        <Text numberOfLines={1} style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 8.0, }}>
                            {data.item.profession} • {data.item.distance}
                        </Text>
                    </View>
                </TouchableOpacity>
            </TouchableHighlight>
        );

        const renderHiddenItem = (data, rowMap) => (
            <View style={{ alignItems: 'center', flex: 1 }}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.backDeleteContinerStyle}
                    onPress={() => deleteRow(rowMap, data.item.key)}
                >
                    <Animated.View
                        style={[
                            {
                                transform: [
                                    {
                                        scale: rowSwipeAnimatedValues[
                                            data.item.key
                                        ].interpolate({
                                            inputRange: [45, 70],
                                            outputRange: [0, 1],
                                            extrapolate: 'clamp',
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.roundButtonStyle}>
                            <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={24}
                                color={Colors.whiteColor}
                                style={{ alignSelf: 'center' }}
                            />
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </View>
        );

        return (
            <SwipeListView
                data={listData}
                renderItem={renderItem}
                renderHiddenItem={renderHiddenItem}
                rightOpenValue={-70}
                onSwipeValueChange={onSwipeValueChange}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function noDataInfo() {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ ...styles.roundButtonStyle, backgroundColor: Colors.grayColor }}>
                    <MaterialIcons name="favorite-border" size={25} color={Colors.whiteColor} />
                </View>
                <Text style={{ ...Fonts.grayColor18Medium, marginTop: Sizes.fixPadding + 5.0 }}>
                    Nothing In Shortlist
                </Text>
            </View>
        )
    }

    function header() {
        return (
            <Text style={{ textAlign: 'center', margin: Sizes.fixPadding * 2.0, ...Fonts.blackColor18Bold }}>
                Shortlisted
            </Text>
        )
    }
}

export default ShortlistScreen

const styles = StyleSheet.create({
    shortlistDataWrapStyle: {
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
    },
    snackBarStyle: {
        position: 'absolute',
        bottom: -10.0,
        left: -10.0,
        right: -10.0,
        backgroundColor: Colors.grayColor,
    },
    backDeleteContinerStyle: {
        bottom: 10,
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        width: 70,
        right: 0,
    },
    roundButtonStyle: {
        width: 50.0,
        height: 50.0,
        borderRadius: 25.0,
        backgroundColor: Colors.primaryColor,
        elevation: 2.0,
        shadowColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center'
    }
})