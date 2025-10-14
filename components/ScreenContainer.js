import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';

const ScreenContainer = ({ children, style, contentStyle, edges }) => (
  <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
    <View style={[styles.content, contentStyle]}>{children}</View>
  </SafeAreaView>
);

ScreenContainer.propTypes = {
  children: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  contentStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  edges: PropTypes.arrayOf(
    PropTypes.oneOf(['top', 'right', 'bottom', 'left'])
  ),
};

ScreenContainer.defaultProps = {
  children: null,
  style: undefined,
  contentStyle: undefined,
  edges: undefined,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenContainer;
