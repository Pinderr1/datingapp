import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, Sizes, CommonStyles } from '../../constants/styles'
import { Feather, MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebaseConfig'

const RegisterScreen = () => {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeWithTerms, setAgreeWithTerms] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName || !phoneNumber || !password) {
      Alert.alert('Missing Info', 'Please fill out all fields.')
      return
    }
    if (!agreeWithTerms) {
      Alert.alert('Terms Required', 'Please agree to the terms and conditions.')
      return
    }
    try {
      setLoading(true)
      const email = `${phoneNumber}@pinged.app`
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: fullName })
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName: fullName,
        phoneNumber,
        createdAt: serverTimestamp(),
        onboardingComplete: false,
      })
      setLoading(false)
      router.push('/onboarding')
    } catch (e) {
      setLoading(false)
      Alert.alert('Signup Failed', e.message)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <MyStatusBar />
      <View style={{ flex: 1 }}>
        {backArrow()}
        <ScrollView automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          {registerInfo()}
          {fullNameInfo()}
          {phoneNumberField()}
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
        onPress={() => router.back()}
        style={styles.backArrowIconWrapStyle}>
        <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2 }} />
      </TouchableOpacity>
    )
  }

  function alreadyAccountInfo() {
    return (
      <Text style={{ textAlign: 'center', margin: Sizes.fixPadding * 2 }}>
        <Text style={{ ...Fonts.grayColor15Regular }}>Already have an account? </Text>
        <Text onPress={() => router.push('/auth/loginScreen')} style={{ ...Fonts.primaryColor15Medium }}>
          Login
        </Text>
      </Text>
    )
  }

  function otherOptions() {
    return (
      <View style={{ marginHorizontal: Sizes.fixPadding }}>
        <Text style={{ textAlign: 'center', ...Fonts.grayColor15Regular }}>OR</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.socialMediaIconWrapStyle}>
            <Image
              source={require('../../assets/images/icons/google.png')}
              style={{ width: 24, height: 24, resizeMode: 'contain' }}
            />
          </View>
          <View style={styles.socialMediaIconWrapStyle}>
            <Image
              source={require('../../assets/images/icons/facebook.png')}
              style={{ width: 24, height: 24, resizeMode: 'contain' }}
            />
          </View>
        </View>
      </View>
    )
  }

  function signupButton() {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={handleSignup} style={styles.buttonStyle} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.whiteColor} />
        ) : (
          <Text style={{ ...Fonts.whiteColor20Medium }}>Sign Up</Text>
        )}
      </TouchableOpacity>
    )
  }

  function agreeWithTermsInfo() {
    return (
      <View style={styles.agreeWithTermsInfoWrapStyle}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAgreeWithTerms(!agreeWithTerms)}
          style={{
            backgroundColor: agreeWithTerms ? Colors.primaryColor : Colors.bgColor,
            ...styles.checkBoxStyle,
          }}>
          {agreeWithTerms && <MaterialIcons name="check" size={16} color={Colors.whiteColor} />}
        </TouchableOpacity>
        <Text style={{ lineHeight: 23, ...Fonts.grayColor15Regular, flex: 1 }}>
          By creating an account, you agree to our{' '}
          <Text style={{ ...Fonts.primaryColor15Medium }}>Terms and Conditions</Text>
        </Text>
      </View>
    )
  }

  function passwordField() {
    return (
      <View
        style={{
          ...styles.infoWrapStyle,
          borderColor: password ? Colors.primaryColor : Colors.bgColor,
        }}>
        <Feather name="lock" size={18} color={Colors.grayColor} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          cursorColor={Colors.primaryColor}
          style={styles.textFieldStyle}
          numberOfLines={1}
          placeholder="Enter Password"
          placeholderTextColor={Colors.grayColor}
          secureTextEntry={!showPassword}
          selectionColor={Colors.primaryColor}
        />
        <Feather
          name={showPassword ? 'eye' : 'eye-off'}
          size={18}
          color={Colors.grayColor}
          onPress={() => setShowPassword(!showPassword)}
        />
      </View>
    )
  }

  function phoneNumberField() {
    return (
      <View
        style={{
          ...styles.infoWrapStyle,
          marginBottom: Sizes.fixPadding * 2.5,
          borderColor: phoneNumber ? Colors.primaryColor : Colors.bgColor,
        }}>
        <Feather name="phone" size={18} color={Colors.grayColor} />
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
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

  function fullNameInfo() {
    return (
      <View
        style={{
          ...styles.infoWrapStyle,
          marginBottom: Sizes.fixPadding * 2.5,
          borderColor: fullName ? Colors.primaryColor : Colors.bgColor,
        }}>
        <Feather name="user" size={18} color={Colors.grayColor} />
        <TextInput
          value={fullName}
          onChangeText={setFullName}
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
      <View style={{ marginHorizontal: Sizes.fixPadding * 2, marginBottom: Sizes.fixPadding * 3.5 }}>
        <Text style={{ ...Fonts.blackColor24Bold }}>Get Started!</Text>
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
    marginLeft: Sizes.fixPadding + 2,
  },
  infoWrapStyle: {
    backgroundColor: Colors.bgColor,
    borderRadius: Sizes.fixPadding,
    padding: Sizes.fixPadding + 2,
    marginHorizontal: Sizes.fixPadding * 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  buttonStyle: {
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Sizes.fixPadding,
    marginHorizontal: Sizes.fixPadding * 2,
    marginVertical: Sizes.fixPadding * 3.5,
    padding: Sizes.fixPadding + 8,
    elevation: 1,
    ...CommonStyles.buttonShadow,
  },
  socialMediaIconWrapStyle: {
    flex: 1,
    backgroundColor: Colors.bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Sizes.fixPadding,
    padding: Sizes.fixPadding + 5,
    marginHorizontal: Sizes.fixPadding,
    marginVertical: Sizes.fixPadding * 2,
  },
  backArrowIconWrapStyle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgColor,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Sizes.fixPadding * 2,
  },
  checkBoxStyle: {
    width: 18,
    height: 18,
    borderRadius: Sizes.fixPadding - 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.fixPadding + 2,
    borderColor: Colors.primaryColor,
    borderWidth: 1,
  },
  agreeWithTermsInfoWrapStyle: {
    marginTop: Sizes.fixPadding + 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Sizes.fixPadding * 2,
  },
})
