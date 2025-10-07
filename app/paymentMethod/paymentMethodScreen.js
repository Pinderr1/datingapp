import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes, CommonStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const paymentMethods = [
    {
        id: '1',
        icon: require('../../assets/images/paymentIcons/card.png'),
        method: 'Credit Card',
    },
    {
        id: '2',
        icon: require('../../assets/images/paymentIcons/google.png'),
        method: 'Google Pay',
    },
    {
        id: '3',
        icon: require('../../assets/images/paymentIcons/paypal.png'),
        method: 'PayPal',
    },
    {
        id: '4',
        icon: require('../../assets/images/paymentIcons/stripe.png'),
        method: 'Stripe',
    },
];

const PaymentMethodScreen = () => {

    const navigation = useNavigation();

    const [selectedPaymentMethodIndex, setselectedPaymentMethodIndex] = useState(0);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {paymentMethodsInfo()}
            </View>
            {continueButton()}
        </View>
    )

    function continueButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('paymentDone/paymentDoneScreen') }}
                style={styles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Continue
                </Text>
            </TouchableOpacity>
        )
    }

    function paymentMethodsInfo() {
        return (
            <ScrollView showsVerticalScrollIndicator={false}>
                {
                    paymentMethods.map((item, index) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => { setselectedPaymentMethodIndex(index) }}
                            key={`${item.id}`}
                            style={styles.paymentMethodWrapStyle}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={styles.paymentIconWrapStyle}>
                                    <Image
                                        source={item.icon}
                                        style={{ width: 22.0, height: 22.0, resizeMode: 'contain' }}
                                    />
                                </View>
                                <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor15Regular, marginHorizontal: Sizes.fixPadding + 2.0 }}>
                                    {item.method}
                                </Text>
                            </View>
                            <View style={{
                                ...styles.radioButtonStyle,
                                borderColor: selectedPaymentMethodIndex == index ? Colors.primaryColor : Colors.grayColor,
                                backgroundColor: selectedPaymentMethodIndex == index ? Colors.primaryColor : Colors.bgColor,
                            }}>{
                                    selectedPaymentMethodIndex == index
                                        ?
                                        <MaterialIcons name='check' color={Colors.whiteColor} size={18} />
                                        :
                                        null
                                }

                            </View>
                        </TouchableOpacity>
                    ))
                }
            </ScrollView>
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
                    Select Payment Method
                </Text>
            </View>
        )
    }
}

export default PaymentMethodScreen

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
    radioButtonStyle: {
        width: 22.0,
        height: 22.0,
        borderRadius: 11.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.2,
    },
    paymentMethodWrapStyle: {
        backgroundColor: Colors.bgColor,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 5.0,
        borderRadius: Sizes.fixPadding,
    },
    buttonStyle: {
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        margin: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 8.0,
        elevation: 1.0,
        ...CommonStyles.buttonShadow
    },
    paymentIconWrapStyle: {
        width: 30.0,
        height: 30.0,
        borderRadius: Sizes.fixPadding - 5.0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.whiteColor
    }
})