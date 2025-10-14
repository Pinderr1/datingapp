import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';

export default function FavoriteStar({ isFavorite, onPress, style, size = 22 }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? '#FFC107' : '#D0D0D0'}
      />
    </TouchableOpacity>
  );
}

FavoriteStar.propTypes = {
  isFavorite: PropTypes.bool,
  onPress: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
  size: PropTypes.number,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
});
