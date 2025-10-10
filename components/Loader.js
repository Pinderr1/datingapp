import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Loader({ size = 'large', style }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <ActivityIndicator size={size} />
    </View>
  );
}
