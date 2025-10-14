import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useGameSessions } from '../contexts/GameSessionContext';
import { useChats } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { games } from '../games';
import Card from './Card';
import GradientButton from './GradientButton';

export default function ActiveGamesPreview() {
  const router = useRouter();
  const { theme } = useTheme();
  const { sessions } = useGameSessions();
  const { matches } = useChats();
  const { user } = useUser();
  const styles = getStyles(theme);

  const list = sessions.slice(0, 3);
  if (list.length === 0) return null;

  const renderItem = (item) => {
    const otherId = item.players.find((p) => p !== user.uid);
    const match = matches.find((m) => m.otherUserId === otherId);
    const name = match?.displayName || 'Opponent';
    const title = games[item.gameId]?.meta?.title || 'Game';
    return (
      <Card
        key={item.id}
        onPress={() =>
          router.push({
            pathname: '/games',
            params: {
              sessionId: item.id,
              gameId: item.gameId,
              opponentId: otherId,
            },
          })
        }
        style={[styles.card, { backgroundColor: theme.card }]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={{ color: theme.textSecondary }}>{name}</Text>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Games</Text>
      {list.map(renderItem)}
      <GradientButton
        text="View All"
        onPress={() => router.push('/games')}
        style={{ alignSelf: 'center', width: 160, marginTop: 4 }}
      />
    </View>
  );
}


const getStyles = (theme) =>
  StyleSheet.create({
    container: { marginBottom: 24, width: '100%' },
    title: {
      fontSize: 16,
      fontWeight: '700',
      alignSelf: 'center',
      marginBottom: 8,
      color: theme.accent,
    },
    card: { marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  });
