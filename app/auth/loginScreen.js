import { StyleSheet, Text, View, BackHandler, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState, useCallback } from 'react'
import { Colors, Fonts, Sizes, CommonStyles } from '../../constants/styles'
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';
import { useUser } from '../../context/userContext';
import { auth, db } from '../../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const LoginScreen = () => {

    const navigation = useNavigation();
    const { setProfile } = useUser();

    const backAction = () => {
        backClickCount == 1 ? BackHandler.exitApp() : _spring();
        return true;
    };

    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => {
                backHandler.remove();
            };
        }, [backAction])
    );

    function _spring() {
        setBackClickCount(1);
        setTimeout(() => {
            setBackClickCount(0)
        }, 1000)
    }

    const [backClickCount, setBackClickCount] = useState(0);
    const [phoneNumber, setphoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setpassword] = useState('');
    const [showPassword, setshowPassword] = useState(false);

    const handleLogin = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            if (userDoc.exists()) {
                setProfile(userDoc.data());
            }
            Alert.alert('Success', 'Logged in successfully');
            navigation.push('(tabs)');
        } catch (error) {
            Alert.alert('Login Error', error.message);
        }
    };

    const handleRegister = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const profileData = {
                name: '',
                age: 0,
                email: userCredential.user.email,
            };
            await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
            setProfile(profileData);
            Alert.alert('Success', 'Account created successfully');
            navigation.push('(tabs)');
        } catch (error) {
            Alert.alert('Registration Error', error.message);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {loginInfo()}
                    {phoneNumberField()}
                    {emailField()}
                    {passwordField()}
                    {forgetPasswordText()}
                    {loginButton()}
                    {otherOptions()}
                </ScrollView>
            </View>
            {dontAccountInfo()}
            {exitInfo()}
        </View>
    )

    function exitInfo() {
        return (
            backClickCount == 1
                ?
                <View style={styles.exitWrapStyle}>
                    <Text style={{ ...Fonts.whiteColor15Medium }}>
                        Press Back Once Again to Exit.
                    </Text>
                </View>
                :
                null
        )
    }

    function dontAccountInfo() {
        return (
            <Text style={{ textAlign: 'center', margin: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Don’t have an account? { }
                </Text>
                <Text onPress={handleRegister} style={{ ...Fonts.primaryColor15Medium }}>
                    Sign Up
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

    function loginButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogin}
                style={styles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Login
                </Text>
            </TouchableOpacity>
        )
    }

    function forgetPasswordText() {
        return (
            <Text style={styles.forgetPasswordTextStyle}>
                Forget password?
            </Text>
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
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Phone Number"
                    placeholderTextColor={Colors.grayColor}
                    keyboardType="phone-pad"
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
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                    placeholder="Enter Email"
                    placeholderTextColor={Colors.grayColor}
                    keyboardType="email-address"
                />
            </View>
        )
    }

    function loginInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 3.5 }}>
                <Text style={{ ...Fonts.blackColor24Bold }}>
                    Let’s sign you in.
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
                    Welcome Back. You’ve been missed!
                </Text>
            </View>
        )
    }
}

export default LoginScreen

const styles = StyleSheet.create({
    infoWrapStyle: {
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    forgetPasswordTextStyle: {
        ...Fonts.primaryColor14Regular,
        textAlign: 'right',
        textDecorationLine: 'underline',
        marginTop: Sizes.fixPadding + 5.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
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
    exitWrapStyle: {
        backgroundColor: Colors.grayColor,
        position: "absolute",
        bottom: 20,
        alignSelf: 'center',
        borderRadius: Sizes.fixPadding * 3.0,
        paddingHorizontal: Sizes.fixPadding + 10.0,
        paddingVertical: Sizes.fixPadding + 3.0,
        justifyContent: "center",
        alignItems: "center",
    },
    textFieldStyle: {
        padding: 0,
        flex: 1,
        ...Fonts.blackColor16Regular,
        marginLeft: Sizes.fixPadding + 2.0
    }
})
