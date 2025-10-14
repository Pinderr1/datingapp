import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';

const defaultStart = { x: 0, y: 0 };
const defaultEnd = { x: 1, y: 1 };

/**
 * Shared wrapper that renders the themed gradient background used across arcade screens.
 */
export default function GradientBackground({
  children,
  colors,
  start = defaultStart,
  end = defaultEnd,
  style,
}) {
  const { theme } = useTheme();
  const gradientColors = colors ?? theme.gradient;

  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={[styles.container, style]}
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
  container: {
    flex: 1,
  },
});
