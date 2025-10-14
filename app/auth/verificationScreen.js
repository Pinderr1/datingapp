import { StyleSheet, Text, View, ScrollView, Modal, ActivityIndicator, TouchableOpacity, Platform } from 'react-native'
import React, { useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import { Colors, Fonts, Sizes, CommonStyles, screenWidth } from '../../constants/styles'
import { OtpInput } from "react-native-otp-entry";
import MyStatusBar from '../../components/myStatusBar';
import { useRouter } from 'expo-router';

const VerificationScreen = () => {

    const router = useRouter();

    const [otpInput, setotpInput] = useState('');
    const [isLoading, setisLoading] = useState(false);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {backArrow()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {verificationInfo()}
                    {otpFields()}
                    {resendInfo()}
                    {verifyButton()}
                </ScrollView>
                {loadingDialog()}
            </View>
        </View>
    )

    function loadingDialog() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={isLoading}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <View style={{ justifyContent: "center", flex: 1 }}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => { }}
                            style={{ ...styles.dialogStyle, alignSelf: 'center' }}
                        >
                            <ActivityIndicator
                                size={50}
                                color={Colors.primaryColor}
                                style={{
                                    alignSelf: 'center',
                                    transform: [{ scale: Platform.OS == 'ios' ? 2 : 1 }]
                                }}
                            />
                            <Text style={{ marginTop: Sizes.fixPadding * 2.0, textAlign: 'center', ...Fonts.grayColor15Regular }}>
                                Please wait...
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    function verifyButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    setisLoading(true)
                    setTimeout(() => {
                        setisLoading(false)
                        router.push('/(tabs)')
                    }, 2000);
                }}
                style={styles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Verify
                </Text>
            </TouchableOpacity>
        )
    }

    function resendInfo() {
        return (
            <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.grayColor14Regular }}>
                Didn’t receive and code? { }
                <Text style={{ ...Fonts.primaryColor15Medium }}>
                    Resend New Code
                </Text>
            </Text>
        )
    }

    function otpFields() {
        return (
            <OtpInput
                numberOfDigits={4}
                focusColor={Colors.primaryColor}
                onTextChange={text => {
                    setotpInput(text)
                    if (text.length == 4) {
                        setisLoading(true)
                        setTimeout(() => {
                            setisLoading(false)
                            router.push('/(tabs)')
                        }, 2000);
                    }
                }}
                theme={{
                    containerStyle: {
                        marginHorizontal: Sizes.fixPadding, marginBottom: Sizes.fixPadding * 2.5,
                    },
                    inputsContainerStyle: {
                        justifyContent: 'flex-start',
                    },
                    pinCodeContainerStyle: { ...styles.textFieldStyle },
                    pinCodeTextStyle: { ...Fonts.blackColor18Bold },
                    focusedPinCodeContainerStyle: { borderWidth: 1.5 }
                }}
            />
        )
    }

    function verificationInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 3.5 }}>
                <Text style={{ ...Fonts.blackColor24Bold }}>
                    Verification Code
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    We have sent the verification code to +(444) 489-7896
                </Text>
            </View>
        )
    }

    function backArrow() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { router.back() }}
                style={styles.backArrowIconWrapStyle}
            >
                <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0, }} />
            </TouchableOpacity>
        )
    }
}

export default VerificationScreen

const styles = StyleSheet.create({
    backArrowIconWrapStyle: {
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center',
        margin: Sizes.fixPadding * 2.0,
    },
    textFieldStyle: {
        marginHorizontal: 10.0,
        width: screenWidth / 9,
        height: screenWidth / 8.5,
        borderRadius: Sizes.fixPadding - 5.0,
        borderWidth: 0,
        backgroundColor: Colors.bgColor,
    },
    buttonStyle: {
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginVertical: Sizes.fixPadding * 3.5,
        padding: Sizes.fixPadding + 8.0,
        elevation: 1.0,
        ...CommonStyles.buttonShadow
    },
    dialogStyle: {
        width: '80%',
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingBottom: Sizes.fixPadding + 5.0,
        paddingTop: Sizes.fixPadding * 2.0,
        elevation: 3.0,
        borderRadius: Sizes.fixPadding,
    },
})