import { StyleSheet, Text, View, ScrollView, Modal, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import { Colors, Fonts, Sizes, CommonStyles } from '../../constants/styles'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';

const VerificationScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [isLoading, setisLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        setCooldown(60);
    }, []);

    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const handleVerify = async () => {
        if (isLoading) {
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('No Account', 'Please log in again to verify your email.');
            return;
        }

        try {
            setisLoading(true);
            await user.reload();
            const refreshedUser = auth.currentUser;
            if (refreshedUser?.emailVerified) {
                router.replace('/(tabs)/home/homeScreen');
            } else {
                Alert.alert('Not Verified', 'Your email is still not verified. Please check your inbox and try again.');
            }
        } catch (error) {
            Alert.alert('Verification Error', error.message);
        } finally {
            setisLoading(false);
        }
    };

    const handleResend = async () => {
        if (isLoading || cooldown > 0) {
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('No Account', 'Please log in again to request a new verification email.');
            return;
        }

        try {
            setisLoading(true);
            await sendEmailVerification(user);
            setCooldown(60);
            Alert.alert('Email Sent', 'A new verification email has been sent.');
        } catch (error) {
            Alert.alert('Resend Error', error.message);
        } finally {
            setisLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {backArrow()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {verificationInfo()}
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
                onPress={handleVerify}
                disabled={isLoading}
                style={{
                    ...styles.buttonStyle,
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    {isLoading ? 'Verifying...' : 'Verify'}
                </Text>
            </TouchableOpacity>
        )
    }

    function resendInfo() {
        return (
            <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.grayColor14Regular }}>
                Didn’t receive the email? { }
                <Text
                    onPress={cooldown > 0 || isLoading ? undefined : handleResend}
                    style={{
                        ...Fonts.primaryColor15Medium,
                        opacity: cooldown > 0 || isLoading ? 0.5 : 1,
                    }}
                >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
                </Text>
            </Text>
        )
    }

    function verificationInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 3.5 }}>
                <Text style={{ ...Fonts.blackColor24Bold }}>
                    Verify Your Email
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    We just emailed a verification link to the address on your account. Please open your inbox, tap the link, and then return here to continue.
                </Text>
            </View>
        )
    }

    function backArrow() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.pop() }}
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