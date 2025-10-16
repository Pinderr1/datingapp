import { StyleSheet, Text, View, Image, BackHandler } from 'react-native'
import React, { useCallback } from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { useFocusEffect, useRouter } from 'expo-router'
import MyStatusBar from '../../components/myStatusBar'

const PaymentDoneScreen = () => {

    const router = useRouter();

    const navigateToTabs = useCallback(() => {
        router.replace('/(tabs)/swipe');
    }, [router]);

    const backAction = useCallback(() => {
        navigateToTabs();
        return true;
    }, [navigateToTabs]);

    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => {
                backHandler.remove();
            };
        }, [backAction])
    );

    return (
        <View style={{ flex: 1, backgroundColor: Colors.primaryColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {contgratsInfo()}
                {backToHomeButton()}
            </View>
        </View>
    )

    function backToHomeButton() {
        return (
            <Text
                onPress={navigateToTabs}
                style={{ alignSelf: 'center', margin: Sizes.fixPadding * 2.0, ...Fonts.whiteColor16Bold }}
            >
                Back to Home
            </Text>
        )
    }

    function contgratsInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                    source={require('../../assets/images/icons/paymentDone.png')}
                    style={{ width: screenWidth / 2.0, height: screenWidth / 2.0, resizeMode: 'contain' }}
                />
                <Text style={styles.congratsTextStyle}>
                    Congratulations payment successfully paid Now, you are a subscribed user.
                </Text>
            </View>
        )
    }
}

export default PaymentDoneScreen

const styles = StyleSheet.create({
    congratsTextStyle: {
        ...Fonts.whiteColor15Regular,
        lineHeight: 25.0,
        marginHorizontal: Sizes.fixPadding * 4.0,
        textAlign: 'center',
    }
})