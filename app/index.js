import { StyleSheet, View, Image } from 'react-native'
import React, { useEffect } from 'react'
import { Colors, Sizes } from '../constants/styles'
import MyStatusBar from '../components/myStatusBar'
import { useRouter } from 'expo-router'
import { ensureAuth } from '../services/authService'

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const result = await ensureAuth();
      if (result.ok) {
        router.replace('/(tabs)/home/homeScreen');
        return;
      }

      if (result.error?.code === 'email-not-verified') {
        router.replace('/auth/verificationScreen');
        return;
      }

      router.replace('/auth/loginScreen');
    };

    redirect();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <MyStatusBar />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {appIconWithTitle()}
      </View>
    </View>
  );

  function appIconWithTitle() {
    return (
      <View style={styles.appIconWithTitleWrapStyle}>
        <Image
          source={require('../assets/images/appIcon.png')}
          style={{ width: 40.0, height: 40.0, resizeMode: 'contain' }}
        />
        <Image
          source={require('../assets/images/appTitle.png')}
          style={{ ...styles.appTitleStyle }}
        />
      </View>
    );
  }
};

export default SplashScreen;

const styles = StyleSheet.create({
  appIconWithTitleWrapStyle: {
    backgroundColor: Colors.primaryColor,
    padding: Sizes.fixPadding * 2.0,
    borderRadius: Sizes.fixPadding * 2.0,
    alignItems: 'center',
  },
  appTitleStyle: {
    width: 80.0,
    height: 20.0,
    resizeMode: 'contain',
    marginTop: Sizes.fixPadding,
  },
});
