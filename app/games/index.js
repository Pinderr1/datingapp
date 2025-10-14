import React, { useCallback, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useGameSessions } from '../../contexts/GameSessionContext';
import { useChats } from '../../contexts/ChatContext';
import { useUser } from '../../contexts/UserContext';
import SyncedGame from '../../components/SyncedGame';
import GradientButton from '../../components/GradientButton';
import { SPACING } from '../../layout';
import { games, gameList } from './registry'; // named exports are fine from TS

const toStr = (v) => (Array.isArray(v) ? v[0] : typeof v === 'string' ? v : undefined);

export default function GamesRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, darkMode } = useTheme();
  const { sessions = [] } = useGameSessions();
  const { matches = [] } = useChats();
  const { user } = useUser();

  const sessionId = toStr(params.sessionId);
  const paramGameId = toStr(params.gameId);
  const paramOpponentId = toStr(params.opponentId);

  const session = useMemo(
    () => sessions.find((s) => s?.id === sessionId),
    [sessions, sessionId]
  );

  const resolvedGameId = session?.gameId || paramGameId;
  const gameEntry = resolvedGameId ? games[resolvedGameId] : undefined;

  const opponent = useMemo(() => {
    const players = Array.isArray(session?.players) ? session.players : [];
    const sessionOpponent = players.find((p) => p && p !== user?.uid);
    const opponentId = paramOpponentId || sessionOpponent;
    if (!opponentId) return undefined;
    const match = matches.find((m) => m.otherUserId === opponentId);
    return { id: opponentId, displayName: match?.displayName || 'Opponent' };
  }, [matches, paramOpponentId, session?.players, user?.uid]);

  const backgroundColor = darkMode ? '#0F172A' : '#F3F4F6';
  const topOffset = insets.top + SPACING.LG;
  const bottomOffset = insets.bottom + SPACING.XL;

  const handleBackToCatalog = useCallback(() => router.replace('/games'), [router]);

  const openSession = useCallback(
    (target) =>
      router.replace({
        pathname: '/games',
        params: { sessionId: target.id, gameId: target.gameId, opponentId: target.opponentId },
      }),
    [router]
  );

  const handleSelectGame = useCallback(
    (id) => router.replace({ pathname: '/games', params: { gameId: id } }),
    [router]
  );

  const activeSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    return sessions
      .map((item) => {
        const entry = games[item.gameId];
        if (!entry) return null;
        const players = Array.isArray(item.players) ? item.players : [];
        const youIndex = user?.uid ? players.indexOf(user.uid) : -1;
        const opponentId = players.find((pid) => pid && pid !== user?.uid);
        const match = opponentId ? matches.find((m) => m.otherUserId === opponentId) : undefined;
        return {
          id: item.id,
          gameId: item.gameId,
          title: entry.meta?.title ?? entry.meta?.id ?? 'Game',
          opponentId,
          opponentName: match?.displayName || 'Opponent',
          isYourTurn: youIndex >= 0 && String(youIndex) === String(item.currentPlayer),
        };
      })
      .filter(Boolean);
  }, [sessions, matches, user?.uid]);

  const activeIds = useMemo(
    () => new Set(activeSessions.map((s) => s.gameId)),
    [activeSessions]
  );

  if (sessionId && resolvedGameId && gameEntry) {
    return (
      <View style={styles.gameScreen}>
        <SyncedGame
          sessionId={sessionId}
          gameId={resolvedGameId}
          opponent={opponent}
          onGameEnd={handleBackToCatalog}
        />

        <View style={[styles.gameOverlayTop, { top: topOffset, backgroundColor: theme.headerBackground }]}>
          <TouchableOpacity onPress={handleBackToCatalog} style={styles.backPill}>
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <View style={styles.overlayTitles}>
            <Text style={[styles.overlayTitle, { color: theme.text }]}>{gameEntry.meta?.title || 'Game'}</Text>
            {opponent?.displayName && (
              <Text style={[styles.overlaySubtitle, { color: theme.textSecondary }]}>vs {opponent.displayName}</Text>
            )}
          </View>
        </View>

        <View style={[styles.gameOverlayBottom, { bottom: bottomOffset }]}>
          <GradientButton text="Back to catalog" onPress={handleBackToCatalog} />
        </View>
      </View>
    );
  }

  if (sessionId && resolvedGameId && !gameEntry) {
    return (
      <View style={[styles.fallbackScreen, { backgroundColor }]}>
        <Text style={[styles.fallbackTitle, { color: theme.text }]}>Game unavailable</Text>
        <Text style={[styles.fallbackMessage, { color: theme.textSecondary }]}>
          We couldn't find the game for this session. Please return to the catalog and try again.
        </Text>
        <GradientButton text="Back to catalog" onPress={handleBackToCatalog} width="70%" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor }]} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={[styles.heading, { color: theme.text }]}>Arcade Lobby</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Continue an active match or browse the catalog to plan your next game night.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Active games</Text>
        {activeSessions.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active games yet. Challenge a match from your chats to get started!
          </Text>
        ) : (
          activeSessions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.sessionCard, { backgroundColor: theme.card }]}
              activeOpacity={0.9}
              onPress={() => openSession(item)}
            >
              <Text style={[styles.sessionTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.sessionOpponent, { color: theme.textSecondary }]}>vs {item.opponentName}</Text>
              <Text
                style={[
                  styles.sessionStatus,
                  { color: item.isYourTurn ? theme.accent : theme.textSecondary },
                ]}
              >
                {item.isYourTurn ? 'Your turn' : 'Waiting for opponent'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Game catalog</Text>
        <View style={styles.gameGrid}>
          {gameList.map((item) => {
            const isActive = activeIds.has(item.id);
            const isSelected = item.id === resolvedGameId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.gameCard,
                  { backgroundColor: theme.card, borderColor: isSelected ? theme.accent : 'transparent' },
                ]}
                activeOpacity={0.9}
                onPress={() => handleSelectGame(item.id)}
              >
                <Text style={[styles.gameTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.gameMeta, { color: theme.textSecondary }]}>
                  {isActive
                    ? 'You have an active match—select it above to continue.'
                    : 'Create a new session from a chat to start playing.'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: SPACING.LG, paddingBottom: SPACING.XXL },
  headerBlock: { paddingTop: SPACING.XL, paddingBottom: SPACING.LG },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: SPACING.SM },
  subtitle: { fontSize: 16, lineHeight: 22 },
  section: { marginBottom: SPACING.XL },
  sectionHeading: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.MD },
  sessionCard: {
    borderRadius: 18, padding: SPACING.LG, marginBottom: SPACING.MD,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 2,
  },
  sessionTitle: { fontSize: 16, fontWeight: '600' },
  sessionOpponent: { marginTop: SPACING.SM, fontSize: 14 },
  sessionStatus: { marginTop: SPACING.SM, fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  gameGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.SM },
  gameCard: {
    width: '48%', borderRadius: 20, padding: SPACING.LG, marginHorizontal: SPACING.SM, marginBottom: SPACING.LG,
    borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 1,
  },
  gameTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.SM },
  gameMeta: { fontSize: 13, lineHeight: 18 },
  gameScreen: { flex: 1, backgroundColor: '#000' },
  gameOverlayTop: {
    position: 'absolute', left: SPACING.LG, right: SPACING.LG, borderRadius: 20,
    paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backPill: { paddingHorizontal: SPACING.MD, paddingVertical: SPACING.SM, borderRadius: 999, backgroundColor: '#00000020' },
  backText: { fontSize: 14, fontWeight: '600' },
  overlayTitles: { flex: 1, marginLeft: SPACING.MD },
  overlayTitle: { fontSize: 18, fontWeight: '700' },
  overlaySubtitle: { fontSize: 14, marginTop: 2 },
  gameOverlayBottom: { position: 'absolute', left: SPACING.LG, right: SPACING.LG },
  fallbackScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.XL },
  fallbackTitle: { fontSize: 22, fontWeight: '700', marginBottom: SPACING.MD },
  fallbackMessage: { fontSize: 15, lineHeight: 20, textAlign: 'center', marginBottom: SPACING.XL },
});
