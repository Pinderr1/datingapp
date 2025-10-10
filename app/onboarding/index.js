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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

// Firebase (v9 modular)
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

// Centralized uploads
import { uploadAvatarAsync } from '../../utils/upload';

const COLORS = {
  bg: '#0b0b0f',
  card: '#16161d',
  text: '#f2f2f7',
  subtext: '#a1a1a8',
  accent: '#7c5cff',
  danger: '#ff5c5c',
  line: '#242433',
};

const REQUIRED_KEYS = ['avatar', 'displayName', 'ageGender'];

const clamp = (s = '', max = 120) => (s.length > max ? s.slice(0, max) : s).trim();
const isAdult = (n) => /^\d+$/.test(String(n)) && parseInt(String(n), 10) >= 18;

async function pickImageFromLibrary() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Permission denied');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled) return null;
  const uri = result.assets?.[0]?.uri || null;
  return uri;
}

export default function OnboardingScreen() {
  const router = useRouter();

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

  const [saving, setSaving] = useState(false);
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
      if (data?.onboardingComplete) router.replace('/(tabs)');
    })().catch(() => {});
  }, [router]);

  const currentKey = steps[step].key;
  const validateField = () => {
    if (!REQUIRED_KEYS.includes(currentKey)) return true;
    if (currentKey === 'avatar') return Boolean(answers.avatar);
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
    try {
      await Haptics.selectionAsync();
      const uri = await pickImageFromLibrary();
      if (!uri) return;
      setAnswers((p) => ({ ...p, avatar: uri }));
    } catch (e) {
      Alert.alert('Photo error', e.message || 'Could not select photo.');
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

    // Upload avatar early when leaving the avatar step
    if (currentKey === 'avatar' && answers.avatar && !answers.avatar.startsWith('http')) {
      const u = ensureSignedIn();
      if (!u) return;
      try {
        const url = await uploadAvatarAsync(answers.avatar, u.uid);
        setAnswers((p) => ({ ...p, avatar: url }));
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload your photo. Try again.');
        return;
      }
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
    if (!(isAdult(answers.age) && answers.gender && answers.avatar && answers.displayName.trim())) {
      Alert.alert('Incomplete', 'Please finish the required fields.');
      return;
    }
    const u = ensureSignedIn();
    if (!u) return;

    setSaving(true);
    try {
      const photoURL = await uploadAvatarAsync(answers.avatar, u.uid);

      const profile = {
        uid: u.uid,
        email: u.email || '',
        displayName: clamp(answers.displayName, 40),
        name: clamp(answers.displayName, 40),
        age: parseInt(String(answers.age), 10),
        gender: String(answers.gender),
        bio: clamp(answers.bio, 200),
        location: clamp(answers.location, 80),
        photoURL: photoURL || '',
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      };

      const userRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, { ...profile, createdAt: serverTimestamp() }, { merge: true });
      } else {
        await updateDoc(userRef, profile);
      }

      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    await Haptics.selectionAsync();
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSkip = async () => {
    const u = ensureSignedIn();
    if (!u) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', u.uid);
      await setDoc(
        userRef,
        {
          uid: u.uid,
          email: u.email || '',
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Skip failed', e.message || 'Could not skip now.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepInput = () => {
    if (currentKey === 'avatar') {
      return (
        <>
          <TouchableOpacity style={S.imagePicker} onPress={onPickAvatar}>
            {answers.avatar ? (
              <Image source={{ uri: answers.avatar }} style={S.avatar} />
            ) : (
              <View style={S.placeholder}>
                <Text style={S.placeholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={S.hint}>Add a clear photo of your face.</Text>
        </>
      );
    }

    if (currentKey === 'displayName') {
      return (
        <TextInput
          style={S.input}
          value={answers.displayName}
          onChangeText={(t) => setAnswers((p) => ({ ...p, displayName: t }))}
          placeholder="Your name"
          placeholderTextColor={COLORS.subtext}
          autoCapitalize="words"
        />
      );
    }

    if (currentKey === 'ageGender') {
      return (
        <View>
          <TextInput
            style={S.input}
            value={String(answers.age || '')}
            onChangeText={(t) => setAnswers((p) => ({ ...p, age: t.replace(/[^\d]/g, '') }))}
            placeholder="Age (18+)"
            placeholderTextColor={COLORS.subtext}
            keyboardType="number-pad"
          />
          <View style={{ height: 12 }} />
          <View style={S.genderRow}>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setAnswers((p) => ({ ...p, gender: g }))}
                style={[S.genderPill, answers.gender === g && S.genderPillActive]}
              >
                <Text style={[S.genderPillText, answers.gender === g && S.genderPillTextActive]}>
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
          style={[S.input, { height: 100, textAlignVertical: 'top' }]}
          value={answers.bio}
          onChangeText={(t) => setAnswers((p) => ({ ...p, bio: t }))}
          placeholder="Short bio (optional)"
          placeholderTextColor={COLORS.subtext}
          multiline
        />
      );
    }

    if (currentKey === 'location') {
      return (
        <View>
          <TouchableOpacity style={S.locationBtn} onPress={autofillLocation}>
            <Text style={S.locationBtnText}>
              {answers.location ? `📍 ${answers.location}` : 'Use my location'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
          <TextInput
            style={S.input}
            value={answers.location}
            onChangeText={(t) => setAnswers((p) => ({ ...p, location: t }))}
            placeholder="City, Region (optional)"
            placeholderTextColor={COLORS.subtext}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={S.container}>
      <Text style={S.title}>Let’s get you set up</Text>
      <Text style={S.stepText}>{`Step ${step + 1} of ${steps.length}`}</Text>

      <View style={S.progressContainer}>
        <Animated.View
          style={[
            S.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={S.card}>
        <Text style={S.question}>{steps[step].label}</Text>
        {renderStepInput()}
      </View>

      <View style={S.row}>
        {step > 0 ? (
          <TouchableOpacity style={[S.button, S.ghost]} onPress={handleBack} disabled={saving}>
            <Text style={[S.buttonText, { color: COLORS.accent }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 112 }} />
        )}

        <TouchableOpacity
          style={[S.button, !isValid && S.buttonDisabled]}
          onPress={handleNext}
          disabled={!isValid || saving}
        >
          <Text style={S.buttonText}>{step < steps.length - 1 ? 'Next' : saving ? 'Saving…' : 'Finish'}</Text>
        </TouchableOpacity>
      </View>

      {step >= 2 && (
        <TouchableOpacity onPress={handleSkip} disabled={saving} style={S.skip}>
          <Text style={S.skipText}>Complete profile later</Text>
        </TouchableOpacity>
      )}

      <Text style={S.footerText}>
        By continuing you agree to our basic guidelines. Keep it kind, keep it real.
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.select({ ios: 64, android: 24 }),
    paddingHorizontal: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepText: { color: COLORS.subtext, textAlign: 'center', marginBottom: 16 },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: COLORS.line,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: { height: '100%', backgroundColor: COLORS.accent },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
  },
  question: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagePicker: { alignSelf: 'center', marginVertical: 16 },
  avatar: { width: 160, height: 160, borderRadius: 80 },
  placeholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: COLORS.subtext },
  hint: { color: COLORS.subtext, textAlign: 'center', marginTop: 8 },
  input: {
    borderBottomWidth: 2,
    borderColor: COLORS.accent,
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: 'transparent',
  },
  genderPillActive: { borderColor: COLORS.accent, backgroundColor: '#1f1a33' },
  genderPillText: { color: COLORS.subtext },
  genderPillTextActive: { color: COLORS.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  button: {
    backgroundColor: COLORS.accent,
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
    borderColor: COLORS.accent,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  skip: { alignSelf: 'center', marginTop: 16 },
  skipText: { color: COLORS.accent, textDecorationLine: 'underline' },
  locationBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 10,
  },
  locationBtnText: { color: '#fff', fontWeight: '600' },
  footerText: {
    color: COLORS.subtext,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
});
