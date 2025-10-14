import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
import { getBadgeMeta } from '../utils/badges';

export default function PlayerInfoBar({ name, xp, badges = [], isPremium }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const displayBadges = useMemo(() => {
    if (!Array.isArray(badges)) return [];
    const normalized = badges.filter(Boolean);
    if (isPremium && !normalized.includes('premiumMember')) {
      normalized.push('premiumMember');
    }
    return normalized
      .map((id) => ({ id, meta: getBadgeMeta(id) }))
      .filter((entry) => entry.meta?.icon);
  }, [badges, isPremium]);

  const hasXp = xp !== undefined && xp !== null && xp !== '';

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {isPremium && <Text style={styles.premiumBadge}>Premium</Text>}
      </View>
      {(hasXp || displayBadges.length > 0) && (
        <View style={styles.metaRow}>
          {hasXp && (
            <View style={styles.xpPill}>
              <Ionicons name="flash-outline" size={14} color={theme.accent} />
              <Text style={styles.xpText}>{`${xp} XP`}</Text>
            </View>
          )}
          {displayBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {displayBadges.map(({ id, meta }) => (
                <Ionicons
                  key={id}
                  name={meta.icon}
                  size={16}
                  color={theme.accent}
                  style={styles.badgeIcon}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

PlayerInfoBar.propTypes = {
  name: PropTypes.string,
  xp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  badges: PropTypes.arrayOf(PropTypes.string),
  isPremium: PropTypes.bool,
};

PlayerInfoBar.defaultProps = {
  name: 'Player',
  xp: undefined,
  badges: [],
  isPremium: false,
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: 20,
    },
    name: {
      flexShrink: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    premiumBadge: {
      marginLeft: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: '#FFD700',
      borderRadius: 8,
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
      overflow: 'hidden',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    xpPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.card,
      marginRight: 8,
    },
    xpText: {
      marginLeft: 4,
      color: theme.text,
      fontSize: 12,
      fontWeight: '500',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    badgeIcon: {
      marginHorizontal: 2,
    },
  });

