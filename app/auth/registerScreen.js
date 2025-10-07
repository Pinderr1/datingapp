import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState, useCallback } from 'react'
import { Colors, Fonts, Sizes, CommonStyles } from '../../constants/styles'
import { Feather, MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { normalizeEmail } from '../../services/authService';
import { useUser } from '../../context/userContext';

const RegisterScreen = () => {

    const navigation = useNavigation();
    const { setProfile } = useUser();
    const router = useRouter();

    const [fullName, setfullName] = useState('');
    const [phoneNumber, setphoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setpassword] = useState('');
    const [showPassword, setshowPassword] = useState(false);
    const [agreeWithTerms, setagreeWithTerms] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSignup = useCallback(async () => {
        if (isSubmitting) {
            return;
        }

        const normalizedEmail = normalizeEmail(email);
        setEmail(normalizedEmail);

        if (!normalizedEmail) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
            return;
        }

        if (!agreeWithTerms) {
            Alert.alert('Terms Required', 'Please agree to the Terms and Conditions to continue.');
            return;
        }

        try {
            setIsSubmitting(true);
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const { user } = userCredential;

            if (fullName.trim()) {
                await updateProfile(user, { displayName: fullName.trim() });
            }

            const userRef = doc(db, 'users', user.uid);
            const profileData = {
                uid: user.uid,
                email: normalizedEmail,
            };

            if (fullName.trim()) {
                profileData.name = fullName.trim();
            }

            if (phoneNumber.trim()) {
                profileData.phoneNumber = phoneNumber.trim();
            }

            await setDoc(userRef, profileData, { merge: true });

            setProfile({ ...profileData });

            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await sendEmailVerification(currentUser);
                }
            } catch (verificationError) {
                console.warn('Email verification request failed', verificationError);
                Alert.alert(
                    'Verification Email Issue',
                    'We were unable to send a verification email. You can try resending it from the verification screen.'
                );
            }

            router.replace({ pathname: '/auth/verificationScreen', params: { reason: 'account-created' } });
        } catch (error) {
            Alert.alert('Registration Error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    }, [agreeWithTerms, email, fullName, isSubmitting, password, phoneNumber, router, setProfile]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {backArrow()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {registerInfo()}
                    {fullNameInfo()}
                    {phoneNumberField()}
                    {emailField()}
                    {passwordField()}
                    {agreeWithTermsInfo()}
                    {signupButton()}
                    {otherOptions()}
                </ScrollView>
            </View>
            {alreadyAccountInfo()}
        </View>
    )

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

    function alreadyAccountInfo() {
        return (
            <Text style={{ textAlign: 'center', margin: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Already have an account? { }
                </Text>
                <Text onPress={() => { navigation.push('auth/loginScreen') }} style={{ ...Fonts.primaryColor15Medium }}>
                    Login
                </Text>
            </Text>
        )
    }

    function otherOptions() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding, }}>
                <Text style={{ textAlign: 'center', ...Fonts.grayColor15Regular }}>
                    OR
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.socialMediaIconWrapStyle}>
                        <Image
                            source={require('../../assets/images/icons/google.png')}
                            style={{ width: 24.0, height: 24.0, resizeMode: 'contain' }}
                        />
                    </View>
                    <View style={styles.socialMediaIconWrapStyle}>
                        <Image
                            source={require('../../assets/images/icons/facebook.png')}
                            style={{ width: 24.0, height: 24.0, resizeMode: 'contain' }}
                        />
                    </View>
                </View>
            </View>
        )
    }

    function signupButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSignup}
                disabled={isSubmitting}
                style={{
                    ...styles.buttonStyle,
                    opacity: isSubmitting ? 0.6 : 1,
                }}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    {isSubmitting ? 'Signing Up...' : 'Sign Up'}
                </Text>
            </TouchableOpacity>
        )
    }

    function agreeWithTermsInfo() {
        return (
            <View style={styles.agreeWithTermsInfoWrapStyle}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setagreeWithTerms(!agreeWithTerms) }}
                    style={{ backgroundColor: agreeWithTerms ? Colors.primaryColor : Colors.bgColor, ...styles.checkBoxStyle, }}
                >
                    {
                        agreeWithTerms
                            ?
                            <MaterialIcons name="check" size={16} color={Colors.whiteColor} />
                            :
                            null
                    }
                </TouchableOpacity>
                <Text style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular, flex: 1 }}>
                    By creating an account, you agree to our { }
                    <Text style={{ ...Fonts.primaryColor15Medium }}>
                        Terms and Condition
                    </Text>
                </Text>
            </View>
        )
    }

    function passwordField() {
        return (
            <View style={{ ...styles.infoWrapStyle, borderColor: password ? Colors.primaryColor : Colors.bgColor }}>
                <Feather name="lock" size={18} color={Colors.grayColor} />
                <TextInput
                    value={password}
                    onChangeText={(value) => setpassword(value)}
                    cursorColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Password"
                    placeholderTextColor={Colors.grayColor}
                    secureTextEntry={!showPassword}
                    selectionColor={Colors.primaryColor}
                />
                <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color={Colors.grayColor}
                    onPress={() => { setshowPassword(!showPassword) }}
                />
            </View>
        )
    }

    function phoneNumberField() {
        return (
            <View style={{ ...styles.infoWrapStyle, marginBottom: Sizes.fixPadding * 2.5, borderColor: phoneNumber ? Colors.primaryColor : Colors.bgColor }}>
                <Feather name="phone" size={18} color={Colors.grayColor} />
                <TextInput
                    value={phoneNumber}
                    onChangeText={(value) => setphoneNumber(value)}
                    cursorColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Phone Number"
                    placeholderTextColor={Colors.grayColor}
                    keyboardType="phone-pad"
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    function emailField() {
        return (
            <View style={{ ...styles.infoWrapStyle, marginBottom: Sizes.fixPadding * 2.5, borderColor: email ? Colors.primaryColor : Colors.bgColor }}>
                <Feather name="mail" size={18} color={Colors.grayColor} />
                <TextInput
                    value={email}
                    onChangeText={(value) => setEmail(value)}
                    cursorColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Email"
                    placeholderTextColor={Colors.grayColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    function fullNameInfo() {
        return (
            <View style={{ ...styles.infoWrapStyle, marginBottom: Sizes.fixPadding * 2.5, borderColor: fullName ? Colors.primaryColor : Colors.bgColor }}>
                <Feather name="user" size={18} color={Colors.grayColor} />
                <TextInput
                    value={fullName}
                    onChangeText={(value) => setfullName(value)}
                    cursorColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Full Name"
                    placeholderTextColor={Colors.grayColor}
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    function registerInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 3.5 }}>
                <Text style={{ ...Fonts.blackColor24Bold }}>
                    Get Started!
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    Create an account to continue.
                </Text>
            </View>
        )
    }
}

export default RegisterScreen

const styles = StyleSheet.create({
    textFieldStyle: {
        padding: 0,
        flex: 1,
        ...Fonts.blackColor16Regular,
        marginLeft: Sizes.fixPadding + 2.0
    },
    infoWrapStyle: {
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
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
    socialMediaIconWrapStyle: {
        flex: 1,
        backgroundColor: Colors.bgColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginHorizontal: Sizes.fixPadding,
        marginVertical: Sizes.fixPadding * 2.0,
    },
    backArrowIconWrapStyle: {
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center',
        margin: Sizes.fixPadding * 2.0,
    },
    checkBoxStyle: {
        width: 18.0,
        height: 18.0,
        borderRadius: Sizes.fixPadding - 8.0,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Sizes.fixPadding + 2.0,
        borderColor: Colors.primaryColor,
        borderWidth: 1.0,
    },
    agreeWithTermsInfoWrapStyle: {
        marginTop: Sizes.fixPadding + 5.0,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
    }
})