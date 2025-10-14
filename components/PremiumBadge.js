import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';

export default function PremiumBadge({ premium, accent = '#ff9a9e', route, style }) {
  if (!premium) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: accent }, style]}
      accessibilityLabel={route ? `Premium game ${route}` : 'Premium game'}
    >
      <Ionicons name="diamond" size={12} color="#fff" style={styles.icon} />
      <Text style={styles.label}>Premium</Text>
    </View>
  );
}

PremiumBadge.propTypes = {
  premium: PropTypes.bool,
  accent: PropTypes.string,
  route: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ff9a9e',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icon: {
    marginRight: 4,
  },
});
