import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'premium', label: 'Premium' },
  { key: 'favorites', label: 'Favorites' },
];

export default function FilterTabs({ filter, setFilter }) {
  const { theme } = useTheme();
  const options = useMemo(() => FILTER_OPTIONS, []);

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 6,
        marginHorizontal: 16,
      }}
    >
      {options.map(({ key, label }) => {
        const isActive = filter === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => {
              if (filter !== key) {
                Haptics.selectionAsync().catch(() => {});
                setFilter(key);
              }
            }}
            style={{
              flex: 1,
              paddingVertical: 6,
              marginHorizontal: 4,
              borderRadius: 12,
              backgroundColor: isActive ? theme.gradientStart : theme.card,
              elevation: isActive ? 3 : 1,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                color: isActive ? '#fff' : theme.textSecondary,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

FilterTabs.propTypes = {
  filter: PropTypes.string.isRequired,
  setFilter: PropTypes.func.isRequired,
};
