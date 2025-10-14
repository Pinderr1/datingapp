import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

export default function PremiumBadge({
  premium,
  accent = '#FF6B81',
  style,
  text,
  route,
}) {
  if (!premium) {
    return null;
  }

  const inferred = route && route.includes('premium') ? 'Premium' : 'Locked';
  const label = text || inferred;

  return (
    <View style={[styles.container, { backgroundColor: accent }, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

PremiumBadge.propTypes = {
  premium: PropTypes.bool,
  accent: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
  text: PropTypes.string,
  route: PropTypes.string,
};

PremiumBadge.defaultProps = {
  premium: false,
  accent: '#FF6B81',
  style: undefined,
  text: undefined,
  route: undefined,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
