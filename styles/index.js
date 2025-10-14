import { StyleSheet } from 'react-native';

import { HEADER_SPACING } from '../layout';

const getGlobalStyles = (theme) =>
  StyleSheet.create({
    swipeScreen: {
      flex: 1,
      paddingTop: HEADER_SPACING,
      backgroundColor:
        theme?.gradient?.[0] ?? theme?.gradientStart ?? 'rgba(0, 0, 0, 0.6)',
    },
  });

export default getGlobalStyles;
