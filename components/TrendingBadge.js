import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

export default function TrendingBadge({ trending, style }) {
  if (!trending) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Trending</Text>
    </View>
  );
}

TrendingBadge.propTypes = {
  trending: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

TrendingBadge.defaultProps = {
  trending: false,
  style: undefined,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B81',
    zIndex: 1,
  },
  text: {
    color: '#FF6B81',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
