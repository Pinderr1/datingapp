import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/styles';

export default function ProgressBar({ value = 0, max = 100, color = Colors.primaryColor, height = 8 }) {
  const progress = Math.min(1, Math.max(0, value / max));
  return (
    <View style={[styles.container, { height }]}>
      <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
});
