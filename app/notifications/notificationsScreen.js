import React, { useState, useRef } from "react";
import { Dimensions, FlatList, Animated, View, TouchableOpacity, StyleSheet, Text, Image } from "react-native";
import { Colors, Fonts, Sizes, screenWidth } from "../../constants/styles";
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import MyStatusBar from "../../components/myStatusBar";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get('window');

const newNotificatiosList = [
    {
        key: '1',
        image: require('../../assets/images/users/user3.png'),
        userName: 'Matilda Burch',
        action: 'Like your profile.',
        time: '20 min ago',
    },
    {
        key: '2',
        image: require('../../assets/images/users/user13.png'),
        userName: 'Samantha Smith',
        action: 'reply on your comm-ent “Very Nice”.',
        time: '20 min ago',
    },
];

const oldNotificationsList = [
    {
        key: '1',
        highlightText: '3 more profile views',
        detailText: 'Upgrade your premium plan.',
        time: 'Jan 10, 12:30 am',
    },
    {
        key: '2',
        image: require('../../assets/images/users/user13.png'),
        userName: 'Samantha Smith',
        action: 'Like your profile.',
        time: 'Jan 15, 11:49 pm',
    },
    {
        key: '3',
        image: require('../../assets/images/users/user13.png'),
        userName: 'Antonia Mcdaniel',
        action: 'Like your profile.',
        time: 'Jan 25, 10:02 am',
    },
    {
        key: '4',
        highlightText: 'Upgrade you premium plan',
        detailText: 'with best offers.',
        time: 'Jan 27, 12:30 am',
    },
];

const rowTranslateAnimatedValues = {};

const NotificationsScreen = () => {

    const router = useRouter();

    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackBarMsg, setSnackBarMsg] = useState('');
    const [listData, setListData] = useState(newNotificatiosList);
    const [oldListData, setOldListData] = useState(oldNotificationsList);

    Array(listData.length + 1)
        .fill('')
        .forEach((_, i) => {
            rowTranslateAnimatedValues[`${i}`] = new Animated.Value(1);
        });

    Array(oldListData.length + 1)
        .fill('')
        .forEach((_, i) => {
            rowTranslateAnimatedValues[`${i}`] = new Animated.Value(1);
        });

    const animationIsRunning = useRef(false);

    const onSwipeValueChange = swipeData => {
        const { key, value } = swipeData;
        if (
            (value > width) || (value < -width) &&
            !animationIsRunning.current
        ) {
            animationIsRunning.current = true;
            Animated.timing(rowTranslateAnimatedValues[key], {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start(() => {
                const newData = [...listData];
                const prevIndex = listData.findIndex(item => item.key === key);
                newData.splice(prevIndex, 1);
                const removedItem = listData.find(item => item.key === key);
                setSnackBarMsg('Notification dismissed!');
                setListData(newData);
                setShowSnackBar(true);
                animationIsRunning.current = false;
            });
        }
    };

    const renderItem = data => (
        <Animated.View
            style={[
                {
                    height: rowTranslateAnimatedValues[
                        data.item.key
                    ].interpolate({
                        inputRange: ['0%', '100%'],
                        outputRange: ["0%", "100%"],
                    }),
                },
            ]}
        >
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                    <View style={{ flexDirection: 'row', }}>
                        {
                            data.item.image
                                ?
                                <View style={{ alignSelf: 'flex-start' }}>
                                    <Image
                                        source={data.item.image}
                                        style={{ width: 45.0, height: 45.0, borderRadius: 22.5 }}
                                    />
                                    <View style={{
                                        backgroundColor: Colors.primaryColor,
                                        width: 20.0, height: 20.0, borderRadius: 10.0,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'absolute',
                                        bottom: -2.0,
                                        right: 0.0,
                                        borderColor: Colors.whiteColor,
                                        borderWidth: 2.0,
                                    }}>
                                        <MaterialIcons name="notifications" size={11} color={Colors.whiteColor} />
                                    </View>
                                </View>
                                :
                                <View style={{
                                    width: 45.0, height: 45.0, borderRadius: 22.5, backgroundColor: Colors.bgColor,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <MaterialIcons name="notifications" size={24} color={Colors.primaryColor} />
                                </View>
                        }
                        <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0, }}>
                            <Text numberOfLines={2} style={{ lineHeight: 22.0 }}>
                                <Text style={{ ...Fonts.blackColor16Medium }}>
                                    {data.item.userName ? data.item.userName : data.item.highlightText}
                                </Text>
                                <Text>
                                    { } { }
                                </Text>
                                <Text style={{ ...Fonts.blackColor15Regular }}>
                                    {data.item.action ? data.item.action : data.item.detailText}
                                </Text>
                            </Text>
                            <Text style={{ ...Fonts.grayColor13Regular, marginTop: Sizes.fixPadding - 2.0 }}>
                                {data.item.time}
                            </Text>
                        </View>
                    </View>
                    {

                        data.for == 'old' ?

                            data.index == oldListData.length - 1
                                ?
                                <View style={{ marginVertical: Sizes.fixPadding }} />
                                :
                                <View style={styles.notificationDivider} />
                            :
                            data.index == listData.length - 1
                                ?
                                <View style={{ marginVertical: Sizes.fixPadding }} />
                                :
                                <View style={styles.notificationDivider} />
                    }
                </View>
            </View>
        </Animated.View>
    );

    const renderHiddenItem = () => (
        <View style={styles.rowBack} />
    );

    const oldOnSwipeValueChange = swipeData => {
        const { key, value } = swipeData;
        if (
            (value > width) || (value < -width) &&
            !animationIsRunning.current
        ) {
            animationIsRunning.current = true;
            Animated.timing(rowTranslateAnimatedValues[key], {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start(() => {
                const newData = [...oldListData];
                const prevIndex = oldListData.findIndex(item => item.key === key);
                newData.splice(prevIndex, 1);
                setSnackBarMsg('Notification dismissed!');
                setOldListData(newData);
                setShowSnackBar(true);
                animationIsRunning.current = false;
            });
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {notifications()}
            </View>
            {snackBar()}
        </View>
    );

    function notifications() {
        return (
            <FlatList
                ListHeaderComponent={
                    <View style={{ flex: 1 }}>
                        {
                            listData.length == 0 && oldListData.length == 0
                                ?
                                noNotoficationInfo()
                                :
                                <>
                                    {todayNotifications()}
                                    {yesterDayNotifications()}
                                </>
                        }
                    </View>
                }
                contentContainerStyle={{ paddingBottom: Sizes.fixPadding, }}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function snackBar() {
        return (
            <Snackbar
                style={styles.snackBarStyle}
                elevation={0.0}
                visible={showSnackBar}
                onDismiss={() => setShowSnackBar(false)}
            >
                <Text style={{ ...Fonts.whiteColor15Medium }}>
                    {snackBarMsg}
                </Text>
            </Snackbar>
        )
    }

    function yesterDayNotifications() {
        return (
            oldListData.length == 0
                ?
                null
                :
                <View style={{ marginTop: Sizes.fixPadding }}>
                    <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 2.0, ...Fonts.grayColor15Regular }}>
                        Earlier
                    </Text>
                    <SwipeListView
                        listKey={`olds`}
                        data={oldListData}
                        renderItem={({ item, index }) => renderItem({ item: item, index: index, for: 'old' })}
                        renderHiddenItem={renderHiddenItem}
                        rightOpenValue={-width}
                        leftOpenValue={width}
                        onSwipeValueChange={oldOnSwipeValueChange}
                        useNativeDriver={false}
                        contentContainerStyle={{ paddingVertical: Sizes.fixPadding - 8.0, }}
                        scrollEnabled={false}
                    />
                </View>
        )
    }

    function todayNotifications() {
        return (
            listData.length == 0
                ?
                null
                :
                <View>
                    <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 2.0, ...Fonts.grayColor15Regular }}>
                        New
                    </Text>
                    <SwipeListView
                        listKey={`todays`}
                        data={listData}
                        renderItem={({ item, index }) => renderItem({ item: item, index: index, for: 'new' })}
                        renderHiddenItem={renderHiddenItem}
                        rightOpenValue={-width}
                        leftOpenValue={width}
                        onSwipeValueChange={onSwipeValueChange}
                        useNativeDriver={false}
                        contentContainerStyle={{ paddingVertical: Sizes.fixPadding - 8.0, }}
                        scrollEnabled={false}
                    />
                </View>
        )
    }

    function noNotoficationInfo() {
        return (
            <View style={{ height: height - 150, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ ...styles.roundButtonStyle, backgroundColor: Colors.grayColor }}>
                    <MaterialCommunityIcons name="bell-badge-outline" size={30} color={Colors.whiteColor} />
                </View>
                <Text style={{ ...Fonts.grayColor18Medium, marginTop: Sizes.fixPadding + 5.0 }}>
                    No Notifications
                </Text>
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
                    Notifications
                </Text>
            </View>
        )
    }
}

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
    rowBack: {
        alignItems: 'center',
        backgroundColor: Colors.primaryColor,
        flex: 1,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    snackBarStyle: {
        backgroundColor: Colors.grayColor,
        position: 'absolute',
        bottom: -10.0,
        left: -10.0,
        right: -10.0,
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
    },
    notificationDivider: {
        backgroundColor: Colors.grayDividerColor,
        height: 1.0,
        marginVertical: Sizes.fixPadding * 1.8,
    }
});

export default NotificationsScreen;