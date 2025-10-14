import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes, CommonStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { ScrollView } from 'react-native';
import MyStatusBar from '../../components/myStatusBar';
import { useRouter } from 'expo-router';

const plansList = [
    {
        id: '1',
        planeTime: '3 Months',
        offerPrice: 24.99,
        oldPrice: 29.99,
        isBestOffer: true,
    },
    {
        id: '2',
        planeTime: '6 Months',
        offerPrice: 42.99,
        oldPrice: 49.99,
    },
    {
        id: '3',
        planeTime: '12 Months',
        offerPrice: 65.99,
        oldPrice: 69.99,
    },
];

const subscrptionBenifits = [
    'Direct message to all profile',
    'Unlimited profile visits',
    'Directly find contact info'
];

const PremiumScreen = () => {

    const router = useRouter();

    const [selectedPlanIndex, setselectedPlanIndex] = useState(0);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.primaryColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {likeInfoWithPremiumIcon()}
                {subscriptionInfo()}
            </View>
        </View>
    )

    function subscriptionInfo() {
        return (
            <View style={styles.subscriptionInfoWrapStyle}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding * 2.0, paddingTop: Sizes.fixPadding * 3.0, }}
                >
                    {plansInfo()}
                    {benifitsInfo()}
                </ScrollView>
                {continueButton()}
            </View>
        )
    }

    function plansInfo() {
        return (
            plansList.map((item, index) => (
                <View key={`${item.id}`}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { setselectedPlanIndex(index) }}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ ...Fonts.blackColor16Bold }}>
                                {item.planeTime}
                            </Text>
                            <Text>
                                <Text style={{ ...Fonts.grayColor14Regular, textDecorationLine: 'line-through' }}>
                                    ${item.oldPrice}
                                </Text>
                                <Text style={{ ...Fonts.primaryColor14Bold }}>
                                    { } ${item.offerPrice}
                                </Text>
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {
                                item.isBestOffer
                                    ?
                                    <View style={styles.bestOfferContainerStyle}>
                                        <Text style={{ ...Fonts.primaryColor15Medium }}>
                                            Best price
                                        </Text>
                                    </View>
                                    :
                                    null
                            }
                            <View style={{
                                borderColor: selectedPlanIndex == index ? Colors.primaryColor : Colors.grayColor,
                                backgroundColor: selectedPlanIndex == index ? Colors.primaryColor : Colors.whiteColor,
                                ...styles.radioButtonStyle,
                            }}>
                                {
                                    selectedPlanIndex == index
                                        ?
                                        <MaterialIcons name='check' color={Colors.whiteColor} size={18} />
                                        :
                                        null
                                }
                            </View>
                        </View>
                    </TouchableOpacity>
                    {
                        plansList.length - 1 == index
                            ?
                            null
                            :
                            <View style={{ backgroundColor: 'rgba(138,156,191,0.2)', marginVertical: Sizes.fixPadding * 2.0, height: 1.0, }} />
                    }
                </View>
            ))
        )
    }

    function continueButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { router.push('/paymentMethod/paymentMethodScreen') }}
                style={styles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Continue
                </Text>
            </TouchableOpacity>
        )
    }

    function benifitsInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 4.0, }}>
                <Text style={{ ...Fonts.blackColor17Bold, marginBottom: Sizes.fixPadding * 2.0 }}>
                    Subscription Benefits
                </Text>
                {
                    subscrptionBenifits.map((item, index) => (
                        <View
                            key={`${index}`}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.fixPadding }}
                        >
                            <Text style={{ ...Fonts.grayColor15Regular }}>
                                •
                            </Text>
                            <Text style={{ marginLeft: Sizes.fixPadding, ...Fonts.grayColor15Regular }}>
                                {item}
                            </Text>
                        </View>
                    ))
                }
            </View>
        )
    }

    function likeInfoWithPremiumIcon() {
        return (
            <View style={{ alignItems: 'center', marginVertical: Sizes.fixPadding }}>
                <View style={styles.premiumIconWrapStyle}>
                    <Image
                        source={require('../../assets/images/icons/premium.png')}
                        style={{ width: 40.0, height: 40.0, resizeMode: 'contain' }}
                    />
                </View>
                <Text style={{ marginTop: Sizes.fixPadding + 5.0, ...Fonts.whiteColor15Regular }}>
                    You have 156 likes. Find out who liked you.
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
                    <MaterialIcons name="close" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', maxWidth: screenWidth - 130, ...Fonts.whiteColor18Bold }}>
                    Premium Subscription
                </Text>
            </View>
        )
    }
}

export default PremiumScreen

const styles = StyleSheet.create({
    backArrowIconWrapStyle: {
        position: 'absolute',
        width: 40.0,
        height: 40.0,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    premiumIconWrapStyle: {
        width: 70.0,
        height: 70.0,
        borderRadius: 35.0,
        backgroundColor: Colors.whiteColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bestOfferContainerStyle: {
        backgroundColor: 'rgba(246,35,84,0.2)',
        paddingVertical: Sizes.fixPadding - 2.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        borderRadius: Sizes.fixPadding - 5.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
    },
    radioButtonStyle: {
        width: 22.0,
        height: 22.0,
        borderRadius: 11.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.2,
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
    subscriptionInfoWrapStyle: {
        flex: 1,
        backgroundColor: Colors.whiteColor,
        borderTopLeftRadius: Sizes.fixPadding * 3.0,
        borderTopRightRadius: Sizes.fixPadding * 3.0,
        marginTop: Sizes.fixPadding * 3.0,
        overflow: 'hidden'
    }
})