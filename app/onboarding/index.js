// app/onboarding/index.js
// Onboarding for NEW Pinged (Expo 54, Firebase v9 modular, Expo Router)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

// Firebase (v9 modular)
import { auth, db, storage } from '../../firebaseConfig';
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Colors, Fonts } from '../../constants/styles';

const REQUIRED_KEYS = ['avatar', 'displayName', 'ageGender'];

const clamp = (s = '', max = 120) => (s.length > max ? s.slice(0, max) : s).trim();
const isAdult = (n) => /^\d+$/.test(String(n)) && parseInt(String(n), 10) >= 18;

async function pickImageFromLibrary() {
  const { status, granted, ios } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const hasAccess = granted || ios?.accessPrivileges === 'limited';
  if (!hasAccess) {
    if (status === 'denied') {
      Alert.alert(
        'Photo access needed',
        'Please enable photo library access in your settings to upload an image.'
      );
    }
    throw new Error('Permission denied');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType,
  };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const theme = useMemo(
    () => ({
      background: isDarkMode ? Colors.slate900 : Colors.bgColor,
      card: isDarkMode ? Colors.overlayBackdrop : Colors.whiteColor,
      text: isDarkMode ? Colors.whiteColor : Colors.blackColor,
      subtext: Colors.grayColor,
      accent: Colors.primaryColor,
      line: isDarkMode ? Colors.overlaySoft : Colors.dividerColor,
      placeholder: Colors.grayColor,
    }),
    [isDarkMode]
  );

  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);

  const steps = useMemo(
    () => [
      { key: 'avatar', label: 'Upload your photo' },
      { key: 'displayName', label: 'What’s your name?' },
      { key: 'ageGender', label: 'Age & gender' },
      { key: 'bio', label: 'Write a short bio (optional)' },
      { key: 'location', label: 'Where are you located? (optional)' },
    ],
    []
  );

  const [answers, setAnswers] = useState({
    avatar: '',
    displayName: '',
    age: '',
    gender: '',
    bio: '',
    location: '',
  });

  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [step, setStep] = useState(0);

  const progressAnim = useRef(new Animated.Value(1 / steps.length)).current;
  const progress = (step + 1) / steps.length;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Already onboarded? Go to tabs.
  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, 'users', u.uid));
      const data = snap.exists() ? snap.data() : null;
      if (data?.onboardingComplete) router.replace('/(tabs)/home');
    })().catch(() => {});
  }, [router]);

  const currentKey = steps[step].key;
  const validateField = () => {
    if (!REQUIRED_KEYS.includes(currentKey)) return true;
    if (currentKey === 'avatar') return Boolean(avatarUrl?.trim());
    if (currentKey === 'displayName') return clamp(answers.displayName, 40).length >= 1;
    if (currentKey === 'ageGender') return isAdult(answers.age) && !!answers.gender;
    return true;
  };
  const isValid = validateField();

  const ensureSignedIn = () => {
    const u = auth.currentUser;
    if (!u) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return null;
    }
    return u;
  };

  const onPickAvatar = async () => {
    let fallbackUri = '';
    try {
      await Haptics.selectionAsync();
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      fallbackUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setAnswers((p) => ({ ...p, avatar: fallbackUri }));
      setAvatarUrl('');

      if (!asset.uri) {
        console.warn('Selected avatar is missing a file URI; using fallback data URI.');
        setAvatarUrl(fallbackUri);
        return;
      }

      const user = ensureSignedIn();
      if (!user) {
        setAvatarUrl(fallbackUri);
        setAnswers((p) => ({ ...p, avatar: fallbackUri }));
        return;
      }

      if (!storage) {
        console.warn('Firebase storage unavailable; using local avatar data URI.');
        setAvatarUrl(fallbackUri);
        setAnswers((p) => ({ ...p, avatar: fallbackUri }));
        return;
      }

      setUploadingAvatar(true);
      let blob;
      try {
        const response = await fetch(asset.uri);
        blob = await response.blob();
        const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(avatarRef, blob, {
          contentType: asset.mimeType || 'image/jpeg',
        });
        const url = await getDownloadURL(avatarRef);
        setAvatarUrl(url);
        setAnswers((p) => ({ ...p, avatar: url }));
      } catch (uploadError) {
        console.error('avatar upload error', uploadError);
        Alert.alert('Upload failed', uploadError?.code || uploadError?.message || String(uploadError));
        setAvatarUrl(fallbackUri);
        setAnswers((p) => ({ ...p, avatar: fallbackUri }));
      } finally {
        if (blob && typeof blob.close === 'function') {
          blob.close();
        }
        setUploadingAvatar(false);
      }
    } catch (e) {
      console.error('avatar upload error', e);
      Alert.alert('Upload failed', e?.code || e?.message || String(e));
      if (fallbackUri) {
        setAvatarUrl(fallbackUri);
        setAnswers((p) => ({ ...p, avatar: fallbackUri }));
      } else {
        setAvatarUrl('');
      }
    }
  };

  const autofillLocation = async () => {
    try {
      await Haptics.selectionAsync();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync(loc.coords);
      const g = geo?.[0];
      if (g) {
        const city = g.city || g.subregion || '';
        const region = g.region || g.country || '';
        const label = [city, region].filter(Boolean).join(', ');
        setAnswers((p) => ({ ...p, location: label }));
      }
    } catch {
      // silent
    }
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (saving) return;
    if (uploadingAvatar) {
      Alert.alert('Please wait', 'Your photo is still uploading.');
      return;
    }

    if (step < steps.length - 1) {
      if (!isValid) {
        Alert.alert('Incomplete', 'Please complete this step to continue.');
        return;
      }
      setStep((s) => s + 1);
      return;
    }

    // Final save
    const photoURL = avatarUrl?.trim();
    if (
      !(
        isAdult(answers.age) &&
        answers.gender &&
        answers.displayName.trim() &&
        photoURL
      )
    ) {
      Alert.alert('Incomplete', 'Please finish the required fields.');
      return;
    }
    const u = ensureSignedIn();
    if (!u) return;

    setSaving(true);
    try {
      const profile = {
        uid: u.uid,
        email: u.email || '',
        displayName: clamp(answers.displayName, 40),
        name: clamp(answers.displayName, 40),
        age: parseInt(String(answers.age), 10),
        gender: String(answers.gender),
        bio: clamp(answers.bio, 200),
        location: clamp(answers.location, 80),
        onboardingComplete: true,
      };
      const payload = {
        ...profile,
        photoURL,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) {
        payload.photoURLs = arrayUnion(photoURL);
      }
      await setDoc(
        doc(db, 'users', u.uid),
        payload,
        { merge: true }
      );

      router.replace('/(tabs)/home');
    } catch (e) {
      console.error('avatar upload error', e);
      Alert.alert('Upload failed', e?.code || e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    await Haptics.selectionAsync();
    if (step > 0) {
      setStep((s) => Math.max(0, s - 1));
      return;
    }

    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/loginScreen');
    }
  };

  const renderStepInput = () => {
    if (currentKey === 'avatar') {
      return (
        <>
          <TouchableOpacity style={styles.imagePicker} onPress={onPickAvatar}>
            {answers.avatar ? (
              <Image source={{ uri: answers.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>Add a clear photo of your face.</Text>
        </>
      );
    }

    if (currentKey === 'displayName') {
      return (
        <TextInput
          style={styles.input}
          value={answers.displayName}
          onChangeText={(t) => setAnswers((p) => ({ ...p, displayName: t }))}
          placeholder="Your name"
          placeholderTextColor={theme.placeholder}
          autoCapitalize="words"
        />
      );
    }

    if (currentKey === 'ageGender') {
      return (
        <View>
          <TextInput
            style={styles.input}
            value={String(answers.age || '')}
            onChangeText={(t) => setAnswers((p) => ({ ...p, age: t.replace(/[^\d]/g, '') }))}
            placeholder="Age (18+)"
            placeholderTextColor={theme.placeholder}
            keyboardType="number-pad"
          />
          <View style={{ height: 12 }} />
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setAnswers((p) => ({ ...p, gender: g }))}
                style={[styles.genderPill, answers.gender === g && styles.genderPillActive]}
              >
                <Text style={[styles.genderPillText, answers.gender === g && styles.genderPillTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (currentKey === 'bio') {
      return (
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          value={answers.bio}
          onChangeText={(t) => setAnswers((p) => ({ ...p, bio: t }))}
          placeholder="Short bio (optional)"
          placeholderTextColor={theme.placeholder}
          multiline
        />
      );
    }

    if (currentKey === 'location') {
      return (
        <View>
          <TouchableOpacity style={styles.locationBtn} onPress={autofillLocation}>
            <Text style={styles.locationBtnText}>
              {answers.location ? `📍 ${answers.location}` : 'Use my location'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
          <TextInput
            style={styles.input}
            value={answers.location}
            onChangeText={(t) => setAnswers((p) => ({ ...p, location: t }))}
            placeholder="City, Region (optional)"
            placeholderTextColor={theme.placeholder}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {step === 0 ? (
          <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
            <Text style={styles.headerBackIcon}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}

        <Text style={styles.title}>Let’s get you set up</Text>

        <View style={styles.headerPlaceholder} />
      </View>
      <Text style={styles.stepText}>{`Step ${step + 1} of ${steps.length}`}</Text>

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

      <View style={styles.card}>
        <Text style={styles.question}>{steps[step].label}</Text>
        {renderStepInput()}
      </View>

      <View style={styles.row}>
        {step > 0 ? (
          <TouchableOpacity style={[styles.button, styles.ghost]} onPress={handleBack} disabled={saving}>
            <Text style={[styles.buttonText, styles.buttonGhostText]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.rowPlaceholder} />
        )}

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isValid || saving || uploadingAvatar}
        >
          <Text style={styles.buttonText}>
            {step < steps.length - 1
              ? uploadingAvatar && currentKey === 'avatar'
                ? 'Uploading…'
                : 'Next'
              : saving
              ? 'Saving…'
              : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        By continuing you agree to our basic guidelines. Keep it kind, keep it real.
      </Text>
    </View>
  );
}

function createStyles(theme, isDarkMode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: Platform.select({ ios: 64, android: 24 }),
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerBack: {
      paddingHorizontal: 4,
      paddingVertical: 8,
      minWidth: 48,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerBackIcon: {
      ...(isDarkMode ? Fonts.whiteColor20Bold : Fonts.blackColor20Bold),
      fontSize: 24,
    },
    headerPlaceholder: { width: 48 },
    title: {
      ...(isDarkMode ? Fonts.whiteColor20Bold : Fonts.blackColor22Bold),
      fontSize: 22,
      flex: 1,
      textAlign: 'center',
      marginBottom: 0,
    },
    stepText: {
      ...Fonts.grayColor13Regular,
      color: theme.subtext,
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
    },
    question: {
      ...(isDarkMode ? Fonts.whiteColor18Bold : Fonts.blackColor18Bold),
      marginBottom: 12,
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
    hint: {
      ...Fonts.grayColor13Regular,
      color: theme.subtext,
      textAlign: 'center',
      marginTop: 8,
    },
    input: {
      ...Fonts.blackColor16Regular,
      color: theme.text,
      borderBottomWidth: 2,
      borderColor: theme.accent,
      paddingVertical: 10,
    },
    genderRow: { flexDirection: 'row', gap: 8 },
    genderPill: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDarkMode ? Colors.grayColor : Colors.dividerColor,
      backgroundColor: isDarkMode ? Colors.overlaySoft : Colors.whiteColor,
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
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
    button: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      minWidth: 112,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.5 },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.accent,
    },
    rowPlaceholder: { width: 112 },
    buttonText: {
      ...Fonts.whiteColor16Bold,
    },
    buttonGhostText: {
      ...Fonts.primaryColor16Bold,
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
    footerText: {
      ...Fonts.grayColor13Regular,
      color: theme.subtext,
      textAlign: 'center',
      marginTop: 16,
    },
  });
}
