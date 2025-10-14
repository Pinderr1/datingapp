import React, { useMemo, useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function CountdownRing({
  progress = 1,
  size = 48,
  strokeWidth = 4,
  color = '#FF6B81',
  backgroundColor = 'rgba(255,255,255,0.15)',
  showLabel = false,
  style,
}) {
  const clampedProgress = useMemo(() => clamp(progress ?? 0, 0, 1), [progress]);
  const animated = useRef(new Animated.Value(clampedProgress)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clampedProgress,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [animated, clampedProgress]);

  const scale = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <View
        style={[
          styles.outer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            backgroundColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.inner,
          {
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            transform: [{ scale }],
            backgroundColor: color,
          },
        ]}
      />
      {showLabel && (
        <Text style={styles.label}>{Math.round(clampedProgress * 100)}</Text>
      )}
    </View>
  );
}

CountdownRing.propTypes = {
  progress: PropTypes.number,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  color: PropTypes.string,
  backgroundColor: PropTypes.string,
  showLabel: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

CountdownRing.defaultProps = {
  progress: 1,
  size: 48,
  strokeWidth: 4,
  color: '#FF6B81',
  backgroundColor: 'rgba(255,255,255,0.15)',
  showLabel: false,
  style: undefined,
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  label: {
    position: 'absolute',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
