import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';

export default function TrendingBadge({ trending, style }) {
  if (!trending) return null;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="trending-up" size={12} color="#FF6B6B" style={styles.icon} />
      <Text style={styles.label}>Trending</Text>
    </View>
  );
}

TrendingBadge.propTypes = {
  trending: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFB3B3',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  icon: {
    marginRight: 4,
  },
});
