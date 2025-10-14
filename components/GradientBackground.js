import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PropTypes from 'prop-types';

const DEFAULT_COLORS = ['#fdf2f8', '#e0f2fe'];

export default function GradientBackground({
  children,
  colors = DEFAULT_COLORS,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  ...rest
}) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.gradient, style]}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}

GradientBackground.propTypes = {
  children: PropTypes.node,
  colors: PropTypes.arrayOf(PropTypes.string),
  start: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  end: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
