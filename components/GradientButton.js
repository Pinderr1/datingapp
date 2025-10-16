// components/GradientButton.js
import { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { BUTTON_STYLE, FONT_SIZES } from '../layout';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * @param {object} props
 * @param {string} props.text
 * @param {() => void} [props.onPress]
 * @param {number | string} [props.width]
 * @param {number} [props.marginVertical]
 * @param {import('react').ReactNode} [props.icon]
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style]
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onPressIn]
 * @param {() => void} [props.onPressOut]
 */
export default function GradientButton({
  text,
  onPress,
  width = '100%',
  marginVertical = 8,
  icon,
  style,
  disabled,
  onPressIn,
  onPressOut,
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.5);
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    onPressIn?.();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPressOut?.();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], width, marginVertical }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <AnimatedLinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
          {
            borderRadius: 30,
            paddingVertical: BUTTON_STYLE.paddingVertical,
            paddingHorizontal: BUTTON_STYLE.paddingHorizontal,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 2,
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
        >
          <AnimatedLinearGradient
            pointerEvents="none"
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 30,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            }}
          />
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: FONT_SIZES.MD }}>
            {text}
          </Text>
        </AnimatedLinearGradient>
      </Pressable>
    </Animated.View>
  );
}

