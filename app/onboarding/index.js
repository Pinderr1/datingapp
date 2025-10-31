// app/onboarding/index.js
// Two-step onboarding for Pinged (Expo 54 + Firebase v9 modular + Expo Router)

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { auth, db, storage } from '../../firebaseConfig'
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { Colors, Fonts } from '../../constants/styles'

const isFabricEnabled =
  (typeof global !== 'undefined' && Boolean(global?.nativeFabricUIManager)) ||
  Boolean(global?.RNNewArchitectureEnabled)

if (
  Platform.OS === 'android' &&
  !isFabricEnabled &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const clamp = (s = '', max = 120) => (s.length > max ? s.slice(0, max) : s).trim()
const isAdult = (n) => /^\d+$/.test(String(n)) && parseInt(String(n), 10) >= 18

const getImagePickerImageMediaTypes = () => {
  const newEnum = ImagePicker.MediaType?.Images
  if (newEnum !== undefined) {
    return [newEnum]
  }
  const legacyEnum =
    ImagePicker.MediaTypeOptions?.Images ??
    (ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : undefined)
  return legacyEnum ?? 'images'
}

async function pickImageFromLibrary() {
  const { status, granted, ios } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  const hasAccess = granted || ios?.accessPrivileges === 'limited'
  if (!hasAccess) {
    Alert.alert('Photo access needed', 'Enable photo library access in settings.')
    throw new Error('Permission denied')
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getImagePickerImageMediaTypes(),
    allowsEditing: true,
    quality: 0.8,
  })
  if (result.canceled) return null
  return result.assets?.[0] || null
}

export default function OnboardingScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const theme = useMemo(
    () => ({
      background: isDark ? Colors.slate900 : Colors.bgColor,
      card: isDark ? Colors.overlayBackdrop : Colors.whiteColor,
      text: isDark ? Colors.whiteColor : Colors.blackColor,
      subtext: Colors.grayColor,
      accent: Colors.primaryColor,
      line: isDark ? Colors.overlaySoft : Colors.dividerColor,
      placeholder: Colors.grayColor,
    }),
    [isDark]
  )

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark])

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [expandedTerms, setExpandedTerms] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const [answers, setAnswers] = useState({
    displayName: '',
    age: '',
    gender: '',
    bio: '',
    preferredSex: '',
    locationPref: '',
    location: '',
  })

  const progressAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / 2,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start()
  }, [step])

  useEffect(() => {
    (async () => {
      const u = auth.currentUser
      if (!u) return
      const snap = await getDoc(doc(db, 'users', u.uid))
      if (snap.exists() && snap.data()?.onboardingComplete) router.replace('/(tabs)/home')
    })().catch(() => {})
  }, [router])

  const ensureSignedIn = () => {
    const u = auth.currentUser
    if (!u) {
      Alert.alert('Not signed in', 'Please sign in first.')
      return null
    }
    return u
  }

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => Math.max(prev - 1, 0))
      return
    }

    if (typeof router?.back === 'function') {
      const canGoBack = router.canGoBack?.()
      if (canGoBack === undefined || canGoBack) {
        router.back()
        return
      }
      // If back() exists but navigation stack is empty, fall through to replace.
    }

    if (typeof router?.replace === 'function') {
      router.replace('/auth/loginScreen')
    }
  }

  const onPickAvatar = async () => {
    try {
      await Haptics.selectionAsync()
      const asset = await pickImageFromLibrary()
      if (!asset?.uri) return
      const user = ensureSignedIn()
      if (!user) return
      setUploading(true)
      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const contentType = asset.mimeType || blob.type || 'image/jpeg'
      const refPath = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`)
      const uploadTask = uploadBytesResumable(refPath, blob, { contentType })
      await uploadTask
      const url = await getDownloadURL(uploadTask.snapshot.ref)
      setAvatarUrl(url)
    } catch (e) {
      console.warn('avatar upload failed', e?.code, e?.message || String(e))
      Alert.alert('Upload failed', e.message || String(e))
    } finally {
      setUploading(false)
    }
  }

  const autofillLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({})
      const geo = await Location.reverseGeocodeAsync(loc.coords)
      const g = geo?.[0]
      const city = g.city || g.subregion || ''
      const region = g.region || g.country || ''
      const label = [city, region].filter(Boolean).join(', ')
      setAnswers((p) => ({ ...p, location: label }))
    } catch {}
  }

  const isValidStep1 = () =>
    avatarUrl &&
    clamp(answers.displayName, 40) &&
    isAdult(answers.age) &&
    answers.gender &&
    agreed

  const isValidStep2 = () =>
    answers.preferredSex && answers.locationPref && !saving && !uploading

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (step === 0) {
      if (!isValidStep1()) {
        Alert.alert('Incomplete', 'Please fill all required fields and accept terms.')
        return
      }
      setStep(1)
      return
    }
    if (!isValidStep2()) {
      Alert.alert('Incomplete', 'Please fill all required fields.')
      return
    }
    const u = ensureSignedIn()
    if (!u) return
    setSaving(true)
    try {
      const payload = {
        uid: u.uid,
        email: u.email || '',
        displayName: clamp(answers.displayName, 40),
        name: clamp(answers.displayName, 40),
        age: parseInt(answers.age, 10),
        gender: answers.gender,
        bio: clamp(answers.bio, 200),
        photoURL: avatarUrl,
        preferredSex: answers.preferredSex,
        locationPref: answers.locationPref,
        location: clamp(answers.location, 80),
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      }
      if (avatarUrl) payload.photoURLs = arrayUnion(avatarUrl)
      await setDoc(doc(db, 'users', u.uid), payload, { merge: true })
      router.replace('/(tabs)/home')
    } catch (e) {
      Alert.alert('Save failed', e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.imagePicker} onPress={onPickAvatar} disabled={uploading}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {uploading ? 'Uploading…' : 'Tap to add photo'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={answers.displayName}
        onChangeText={(t) => setAnswers((p) => ({ ...p, displayName: t }))}
        placeholder="First name"
        placeholderTextColor={theme.placeholder}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        value={answers.age}
        onChangeText={(t) => setAnswers((p) => ({ ...p, age: t.replace(/[^\d]/g, '') }))}
        placeholder="Age (18+)"
        placeholderTextColor={theme.placeholder}
        keyboardType="number-pad"
      />
      <View style={styles.genderRow}>
        {['Male', 'Female', 'Both', 'Other'].map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setAnswers((p) => ({ ...p, gender: g }))}
            style={[styles.genderPill, answers.gender === g && styles.genderPillActive]}
          >
            <Text
              style={[
                styles.genderPillText,
                answers.gender === g && styles.genderPillTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { height: 90, textAlignVertical: 'top', marginTop: 10 }]}
        value={answers.bio}
        onChangeText={(t) => setAnswers((p) => ({ ...p, bio: t }))}
        placeholder="Short bio (optional)"
        placeholderTextColor={theme.placeholder}
        multiline
      />

      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.easeInEaseOut()
          setExpandedTerms((v) => !v)
        }}
        style={styles.termsHeader}
      >
        <Text style={styles.termsHeaderText}>
          {expandedTerms ? '▼ Terms & Conditions' : '► Terms & Conditions'}
        </Text>
      </TouchableOpacity>

      {expandedTerms && (
        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            Welcome to Pinged! Be respectful, no hate speech, no spam, and play fair in all
            games. Violations may result in removal. For full details visit
            buyshrooms.net/terms or contact support.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.checkBoxStyle,
          { backgroundColor: agreed ? theme.accent : 'transparent' },
        ]}
        onPress={() => setAgreed((v) => !v)}
      >
        {agreed && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      <Text style={styles.agreeText}>I agree to the Terms & Conditions</Text>
    </ScrollView>
  )

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.question}>Who are you interested in?</Text>
      <View style={styles.genderRow}>
        {['Men', 'Women', 'Both'].map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setAnswers((p) => ({ ...p, preferredSex: g }))}
            style={[styles.genderPill, answers.preferredSex === g && styles.genderPillActive]}
          >
            <Text
              style={[
                styles.genderPillText,
                answers.preferredSex === g && styles.genderPillTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 20 }} />
      <Text style={styles.question}>Location preference</Text>
      <View style={styles.genderRow}>
        {['Local', 'International', 'Both'].map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setAnswers((p) => ({ ...p, locationPref: g }))}
            style={[styles.genderPill, answers.locationPref === g && styles.genderPillActive]}
          >
            <Text
              style={[
                styles.genderPillText,
                answers.locationPref === g && styles.genderPillTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 20 }} />
      <TouchableOpacity style={styles.locationBtn} onPress={autofillLocation}>
        <Text style={styles.locationBtnText}>
          {answers.location ? `📍 ${answers.location}` : 'Use my location'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        value={answers.location}
        onChangeText={(t) => setAnswers((p) => ({ ...p, location: t }))}
        placeholder="City, Region (optional)"
        placeholderTextColor={theme.placeholder}
      />
    </ScrollView>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{step === 0 ? 'About You' : 'Who You’re Looking For'}</Text>

      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.card}>{step === 0 ? renderStep1() : renderStep2()}</View>

      <View style={styles.row}>
        {step === 1 && (
          <TouchableOpacity
            style={[styles.button, styles.ghost]}
            onPress={handleBack}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.buttonGhostText]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            step === 0 && !isValidStep1() ? styles.buttonDisabled : null,
            step === 1 && !isValidStep2() ? styles.buttonDisabled : null,
          ]}
          onPress={handleNext}
          disabled={
            (step === 0 && !isValidStep1()) || (step === 1 && !isValidStep2()) || saving
          }
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving…' : step === 0 ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function createStyles(theme, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: Platform.select({ ios: 60, android: 24 }),
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginBottom: 12,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignSelf: 'flex-start',
    },
    backIcon: {
      ...(isDark ? Fonts.whiteColor20Bold : Fonts.blackColor20Bold),
      marginTop: Platform.select({ ios: -2, android: 0 }),
    },
    backLabel: {
      ...(isDark ? Fonts.whiteColor15Medium : Fonts.blackColor15Medium),
    },
    title: {
      ...(isDark ? Fonts.whiteColor22Bold : Fonts.blackColor22Bold),
      textAlign: 'center',
      marginBottom: 16,
    },
    progressContainer: {
      height: 6,
      width: '100%',
      backgroundColor: theme.line,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressBar: { height: '100%', backgroundColor: theme.accent },
    card: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.line,
      flex: 1,
    },
    imagePicker: { alignSelf: 'center', marginVertical: 16 },
    avatar: { width: 160, height: 160, borderRadius: 80 },
    placeholder: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      ...Fonts.grayColor14Regular,
      color: theme.subtext,
      textAlign: 'center',
    },
    input: {
      ...Fonts.blackColor16Regular,
      color: theme.text,
      borderBottomWidth: 2,
      borderColor: theme.accent,
      paddingVertical: 10,
      marginTop: 10,
    },
    genderRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    genderPill: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? Colors.grayColor : Colors.dividerColor,
      backgroundColor: isDark ? Colors.overlaySoft : Colors.whiteColor,
    },
    genderPillActive: {
      borderColor: theme.accent,
      backgroundColor: theme.accent,
    },
    genderPillText: {
      ...Fonts.grayColor14Regular,
      color: theme.subtext,
    },
    genderPillTextActive: {
      ...Fonts.whiteColor15Medium,
    },
    termsHeader: { marginTop: 16 },
    termsHeaderText: {
      ...Fonts.primaryColor15Medium,
    },
    termsBox: {
      backgroundColor: theme.line,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
    },
    termsText: {
      ...Fonts.grayColor13Regular,
      color: theme.subtext,
    },
    checkBoxStyle: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    checkMark: { color: Colors.whiteColor, fontSize: 14 },
    agreeText: {
      ...Fonts.grayColor14Regular,
      color: theme.subtext,
      marginTop: 6,
    },
    locationBtn: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 10,
    },
    locationBtnText: {
      ...Fonts.whiteColor16Bold,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    button: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      minWidth: 112,
      alignItems: 'center',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.accent,
    },
    buttonText: {
      ...Fonts.whiteColor16Bold,
    },
    buttonGhostText: {
      ...Fonts.primaryColor16Bold,
    },
    buttonDisabled: { opacity: 0.5 },
    question: {
      ...(isDark ? Fonts.whiteColor18Bold : Fonts.blackColor18Bold),
      marginBottom: 8,
    },
  })
}
