import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import PropTypes from 'prop-types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function CountdownRing({
  progress = 0,
  size = 48,
  strokeWidth = 4,
  color = '#ff9a9e',
  backgroundColor = 'rgba(255,255,255,0.25)',
  style,
}) {
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const animated = useRef(new Animated.Value(clamp(progress, 0, 1))).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamp(progress, 0, 1),
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animated, progress]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </Animated.View>
  );
}

CountdownRing.propTypes = {
  progress: PropTypes.number,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  color: PropTypes.string,
  backgroundColor: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
