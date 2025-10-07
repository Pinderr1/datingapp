import { StyleSheet, Text, View, ScrollView, Modal, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import { Colors, Fonts, Sizes, CommonStyles } from '../../constants/styles'
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { checkEmailVerificationStatus, requestEmailVerification } from '../../services/emailVerificationService';

const VerificationScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();

    const [isLoading, setisLoading] = useState(false);
    const [verification, setVerification] = useState(null);
    const [cooldown, setCooldown] = useState(0);
    const [statusError, setStatusError] = useState(null);

    const reason = useMemo(() => {
        const value = Array.isArray(params?.reason) ? params.reason[0] : params?.reason;
        return typeof value === 'string' ? value : null;
    }, [params]);

    const reasonMessage = useMemo(() => {
        if (!reason) {
            return null;
        }

        switch (reason) {
            case 'account-created':
                return 'We just created your account and sent a verification email to keep your profile secure.';
            case 'email-verification-delivery-failed':
                return 'We had trouble sending your verification email. You can request another one below.';
            case 'email-verification-cooldown':
                return 'A verification email was recently sent. Please check your inbox or try resending once the cooldown ends.';
            default:
                return 'Please verify your email address to continue using the app.';
        }
    }, [reason]);

    const refreshStatus = useCallback(
        async ({ showLoader = false } = {}) => {
            if (showLoader) {
                setisLoading(true);
            }

            try {
                const result = await checkEmailVerificationStatus();
                if (result.ok) {
                    const data = result.data;
                    setVerification(data);
                    setStatusError(null);
                    setCooldown(data.cooldownRemainingSeconds ?? 0);

                    if (data.emailVerified) {
                        router.replace('/(tabs)/home/homeScreen');
                    }

                    return { ok: true, data };
                }

                setStatusError(result.error?.message || 'Unable to check verification status. Please try again.');
                return { ok: false, error: result.error };
            } finally {
                if (showLoader) {
                    setisLoading(false);
                }
            }
        },
        [router]
    );

    useEffect(() => {
        refreshStatus({ showLoader: true });
    }, [refreshStatus]);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshStatus();
        }, 5000);

        return () => clearInterval(interval);
    }, [refreshStatus]);

    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown > 0]);

    const handleVerify = useCallback(async () => {
        if (isLoading) {
            return;
        }

        const result = await refreshStatus({ showLoader: true });
        if (result?.ok && !result.data.emailVerified) {
            Alert.alert('Not Verified Yet', 'Your email is still pending verification. Please check your inbox and try again.');
        } else if (result && !result.ok) {
            Alert.alert('Verification Error', result.error?.message || 'We were unable to confirm your verification status.');
        }
    }, [isLoading, refreshStatus]);

    const handleResend = useCallback(async () => {
        if (isLoading) {
            return;
        }

        if (cooldown > 0 || verification?.canRequest === false) {
            return;
        }

        setisLoading(true);
        try {
            const payload = {};
            if (verification?.cooldownSeconds) {
                payload.cooldownSeconds = verification.cooldownSeconds;
            }

            const result = await requestEmailVerification(payload);
            if (!result.ok) {
                Alert.alert('Verification Email Issue', result.error?.message || 'We were unable to send a verification email.');
                return;
            }

            const data = result.data;
            setVerification(data);
            setStatusError(null);
            setCooldown(data.cooldownRemainingSeconds ?? 0);

            if (data.status === 'failed' || data.lastDelivery?.failed) {
                Alert.alert(
                    'Email Delivery Issue',
                    'We attempted to resend the verification email, but the delivery failed. Please try again later.'
                );
            } else {
                Alert.alert('Email Sent', 'We sent a new verification email. Please check your inbox.');
            }
        } finally {
            setisLoading(false);
        }
    }, [cooldown, isLoading, verification]);

    const handleSkipDev = useCallback(() => {
        if (!__DEV__) {
            return;
        }

        router.replace('/(tabs)/home/homeScreen');
    }, [router]);

    const statusMessage = useMemo(() => {
        if (verification?.emailVerified) {
            return 'Your email has been verified. Redirecting you to the app...';
        }

        if (verification?.status === 'failed' || verification?.lastDelivery?.failed) {
            return 'We could not deliver the last verification email. Please request another one.';
        }

        if (cooldown > 0) {
            const seconds = cooldown;
            if (seconds >= 3600) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const hourLabel = hours === 1 ? 'hour' : 'hours';
                const minuteLabel = minutes === 1 ? 'minute' : 'minutes';
                if (minutes > 0) {
                    return `A verification email was recently sent. You can request another in ${hours} ${hourLabel} and ${minutes} ${minuteLabel}.`;
                }
                return `A verification email was recently sent. You can request another in ${hours} ${hourLabel}.`;
            }

            if (seconds >= 60) {
                const minutes = Math.floor(seconds / 60);
                const remainder = seconds % 60;
                const minuteLabel = minutes === 1 ? 'minute' : 'minutes';
                if (remainder > 0) {
                    return `A verification email was recently sent. You can request another in ${minutes} ${minuteLabel} and ${remainder} seconds.`;
                }
                return `A verification email was recently sent. You can request another in ${minutes} ${minuteLabel}.`;
            }

            return `A verification email was recently sent. You can request another in ${seconds} seconds.`;
        }

        if (verification?.status === 'sent') {
            return 'We sent a verification email. Please check your inbox and follow the link.';
        }

        return 'Your email verification is pending. Please check your inbox for the verification link.';
    }, [cooldown, verification]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {backArrow()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {verificationInfo()}
                    {resendInfo()}
                    {verifyButton()}
                    {skipDevButton()}
                    {statusFeedback()}
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

    function skipDevButton() {
        if (!__DEV__) {
            return null;
        }

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSkipDev}
                style={{
                    ...styles.buttonStyle,
                    backgroundColor: Colors.bgColor,
                    marginTop: -Sizes.fixPadding,
                }}
            >
                <Text style={{ ...Fonts.blackColor17Medium }}>
                    Skip verification (dev)
                </Text>
            </TouchableOpacity>
        )
    }

    function resendInfo() {
        const resendDisabled = isLoading || cooldown > 0 || verification?.canRequest === false;
        const resendLabel = verification?.emailVerified
            ? 'Email Verified'
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : 'Resend Email';

        return (
            <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.grayColor14Regular }}>
                Didn’t receive the email? { }
                <Text
                    onPress={resendDisabled || verification?.emailVerified ? undefined : handleResend}
                    style={{
                        ...Fonts.primaryColor15Medium,
                        opacity: resendDisabled || verification?.emailVerified ? 0.5 : 1,
                    }}
                >
                    {resendLabel}
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
                {reasonMessage ? (
                    <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                        {reasonMessage}
                    </Text>
                ) : null}
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    {statusMessage}
                </Text>
                {statusError ? (
                    <Text style={{ ...Fonts.dangerColor14Medium, marginTop: Sizes.fixPadding }}>
                        {statusError}
                    </Text>
                ) : null}
            </View>
        )
    }

    function statusFeedback() {
        if (!verification?.lastError) {
            return null;
        }

        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.dangerColor14Medium }}>
                    {verification.lastError.message || 'The last verification attempt reported an error. Please try resending.'}
                </Text>
            </View>
        );
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