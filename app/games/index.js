import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useGameSessions } from '../../contexts/GameSessionContext';
import { useChats } from '../../contexts/ChatContext';
import { useUser } from '../../contexts/UserContext';
import { useDev } from '../../contexts/DevContext';
import { useMatchmaking } from '../../contexts/MatchmakingContext';
import SyncedGame from '../../components/SyncedGame';
import GradientButton from '../../components/GradientButton';
import GradientBackground from '../../components/GradientBackground';
import SafeKeyboardView from '../../components/SafeKeyboardView';
import Header from '../../components/Header';
import GameCard from '../../components/GameCard';
import GamePreviewModal from '../../components/GamePreviewModal';
import GameFilters from '../../components/GameFilters';
import EmptyState from '../../components/EmptyState';
import getGlobalStyles from '../../styles';
import { allGames } from '../../data/games';
import { getRandomBot } from '../../ai/bots';
import { SPACING, HEADER_SPACING } from '../../layout';
import { games } from '../../games/registry';

const toStr = (v) => (Array.isArray(v) ? v[0] : typeof v === 'string' ? v : undefined);

const deriveRegistryId = (game) => {
  if (!game) return 'ticTacToe';

  const matchedKey = Object.keys(games).find((key) => {
    const title = games[key]?.meta?.title;
    return title && game.title && title.toLowerCase() === game.title.toLowerCase();
  });

  if (matchedKey) return matchedKey;

  const fallback = Object.keys(games).find((key) => games[key]?.meta?.id === game.route);
  return fallback || 'ticTacToe';
};

export default function GamesRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, darkMode } = useTheme();
  const globalStyles = getGlobalStyles(theme);
  const { sessions = [] } = useGameSessions();
  const { matches = [] } = useChats();
  const { user } = useUser();
  const { devMode } = useDev();
  const { sendGameInvite } = useMatchmaking();

  const sessionId = toStr(params.sessionId);
  const paramGameId = toStr(params.gameId);
  const paramOpponentId = toStr(params.opponentId);
  const paramBotId = toStr(params.botId);

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

  const [filter, setFilter] = useState('All');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [previewGame, setPreviewGame] = useState(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteTargetGame, setInviteTargetGame] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const flatListRef = useRef();

  const registryToCatalogGame = useMemo(() => {
    const map = {};
    allGames.forEach((game) => {
      const key = deriveRegistryId(game);
      if (key) map[key] = game;
    });
    return map;
  }, []);

  const allCategories = useMemo(
    () => ['All', ...new Set(allGames.map((g) => g.category))],
    []
  );

  const handleBackToCatalog = useCallback(() => router.replace('/games'), [router]);

  const openSession = useCallback(
    (target) =>
      router.replace({
        pathname: '/games',
        params: { sessionId: target.id, gameId: target.gameId, opponentId: target.opponentId },
      }),
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

  const filteredGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allGames.filter((game) => {
      const matchCategory =
        filter === 'All' ||
        (filter === 'Free' && !game.premium) ||
        (filter === 'Premium' && game.premium) ||
        (filter === 'Favorites' && favorites.includes(game.id));
      const matchSearch =
        !normalizedSearch || game.title.toLowerCase().includes(normalizedSearch);
      const matchTag = category === 'All' || game.category === category;
      return matchCategory && matchSearch && matchTag;
    });
  }, [filter, category, search, favorites]);

  useEffect(() => {
    if (!flatListRef.current) return;
    if (filter !== 'Premium') return;
    const firstPremiumIndex = filteredGames.findIndex((g) => g.premium);
    if (firstPremiumIndex >= 0) {
      const timeout = setTimeout(
        () => flatListRef.current?.scrollToIndex({ index: firstPremiumIndex, animated: true }),
        200
      );
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [filter, filteredGames]);

  useEffect(() => {
    if (sessionId) return;
    if (paramBotId) {
      const targetGame = paramGameId || 'ticTacToe';
      router.replace({
        pathname: '/games/GameWithBotScreen',
        params: { botId: paramBotId, game: targetGame },
      });
      return;
    }
    if (paramGameId && registryToCatalogGame[paramGameId]) {
      setPreviewGame(registryToCatalogGame[paramGameId]);
    }
  }, [paramBotId, paramGameId, registryToCatalogGame, router, sessionId]);

  const handleSelectGame = useCallback((game) => {
    setPreviewGame(game);
    Keyboard.dismiss();
  }, []);

  const toggleFavorite = useCallback(
    (id) =>
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
      ),
    []
  );

  const handleInviteMatch = useCallback(() => {
    if (!previewGame) return;
    setInviteError(null);
    setInviteTargetGame(previewGame);
    setPreviewGame(null);
    setInviteModalVisible(true);
  }, [previewGame]);

  const handlePlayAi = useCallback(() => {
    if (!previewGame) return;
    const registryId = deriveRegistryId(previewGame);
    const bot = getRandomBot();
    setPreviewGame(null);
    router.push({ pathname: '/games/GameWithBotScreen', params: { game: registryId, botId: bot.id } });
  }, [previewGame, router]);

  const goToGameSession = useCallback(
    ({ inviteId, opponent: opponentPayload }) => {
      if (!inviteTargetGame) return;
      const registryId = deriveRegistryId(inviteTargetGame);
      router.push({
        pathname: '/games/GameSessionScreen',
        params: {
          inviteId,
          status: devMode ? 'ready' : 'waiting',
          game: JSON.stringify({ id: registryId, title: inviteTargetGame.title }),
          opponent: JSON.stringify(opponentPayload),
        },
      });
      setInviteTargetGame(null);
    },
    [devMode, inviteTargetGame, router]
  );

  const handleSelectOpponent = useCallback(
    async (match) => {
      if (!inviteTargetGame || !match?.otherUserId) return;
      try {
        setInviteLoading(true);
        setInviteError(null);
        const registryId = deriveRegistryId(inviteTargetGame);
        const inviteId = await sendGameInvite(match.otherUserId, registryId);
        setInviteModalVisible(false);
        goToGameSession({
          inviteId,
          opponent: {
            id: match.otherUserId,
            displayName: match.displayName || match.otherUserName || 'Opponent',
            photo: match.otherUserImage || match.photo,
          },
        });
      } catch (error) {
        console.warn('Failed to invite match', error);
        setInviteError('Failed to send invite. Please try again.');
      } finally {
        setInviteLoading(false);
      }
    },
    [goToGameSession, inviteTargetGame, sendGameInvite]
  );

  const closeInviteModal = useCallback(() => {
    setInviteModalVisible(false);
    setInviteTargetGame(null);
    setInviteError(null);
  }, []);

  const renderGameCard = useCallback(
    ({ item }) => (
      <GameCard
        item={item}
        isFavorite={favorites.includes(item.id)}
        trending={false}
        toggleFavorite={() => toggleFavorite(item.id)}
        onPress={() => handleSelectGame(item)}
      />
    ),
    [favorites, handleSelectGame, toggleFavorite]
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
    <GradientBackground style={globalStyles.swipeScreen}>
      <Header showLogoOnly />
      <SafeKeyboardView style={{ flex: 1, paddingTop: HEADER_SPACING }}>
        <FlatList
          ref={flatListRef}
          data={filteredGames}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.catalogContent}
          renderItem={renderGameCard}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={<EmptyState text="No games found." image={require('../../assets/logo.png')} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.heading, { color: theme.text }]}>Arcade Lobby</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Continue an active match or browse the catalog to plan your next game night.
              </Text>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: theme.text }]}>Active games</Text>
                {activeSessions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No active games yet.</Text>
                ) : (
                  activeSessions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sessionCard, { backgroundColor: theme.card }]}
                      activeOpacity={0.9}
                      onPress={() => openSession(item)}
                    >
                      <View style={styles.sessionHeaderRow}>
                        <Text style={[styles.sessionTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text
                          style={[
                            styles.sessionStatus,
                            { color: item.isYourTurn ? theme.accent : theme.textSecondary },
                          ]}
                        >
                          {item.isYourTurn ? 'Your turn' : 'Waiting'}
                        </Text>
                      </View>
                      <Text style={[styles.sessionOpponent, { color: theme.textSecondary }]}>vs {item.opponentName}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.filtersBlock}>
                <GameFilters
                  search={search}
                  setSearch={setSearch}
                  filter={filter}
                  setFilter={setFilter}
                  category={category}
                  setCategory={setCategory}
                  categories={allCategories}
                />
              </View>
            </View>
          }
        />

        <GamePreviewModal
          visible={!!previewGame}
          game={previewGame}
          onClose={() => setPreviewGame(null)}
          onPlayFriend={handleInviteMatch}
          onPracticeBot={handlePlayAi}
        />

        <Modal
          transparent
          animationType="slide"
          visible={inviteModalVisible}
          onRequestClose={closeInviteModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}> 
              <Text style={[styles.modalTitle, { color: theme.text }]}>Invite a match</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Choose someone from your matches to send an invite.
              </Text>
              <ScrollView style={styles.modalList}>
                {matches.length === 0 ? (
                  <Text style={[styles.modalEmpty, { color: theme.textSecondary }]}>No matches yet.</Text>
                ) : (
                  matches.map((match) => (
                    <TouchableOpacity
                      key={match.id || match.otherUserId}
                      style={styles.modalRow}
                      disabled={inviteLoading}
                      onPress={() => handleSelectOpponent(match)}
                    >
                      <Text style={[styles.modalRowText, { color: theme.text }]}>
                        {match.displayName || match.otherUserName || 'Mystery match'}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              {inviteError ? <Text style={styles.modalError}>{inviteError}</Text> : null}
              {inviteLoading ? <ActivityIndicator color={theme.accent} style={{ marginVertical: SPACING.SM }} /> : null}
              <TouchableOpacity onPress={closeInviteModal} style={styles.modalCancel} disabled={inviteLoading}>
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeKeyboardView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  catalogContent: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },
  listHeader: {
    width: '100%',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.XL,
  },
  filtersBlock: { marginTop: SPACING.LG },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: SPACING.SM },
  subtitle: { fontSize: 16, lineHeight: 22 },
  section: { marginTop: SPACING.LG, marginBottom: SPACING.LG },
  sectionHeading: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.MD },
  sessionCard: {
    borderRadius: 18,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 2,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitle: { fontSize: 16, fontWeight: '600' },
  sessionOpponent: { marginTop: SPACING.SM, fontSize: 14 },
  sessionStatus: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  columnWrapper: { justifyContent: 'center' },
  gameScreen: { flex: 1, backgroundColor: '#000' },
  gameOverlayTop: {
    position: 'absolute',
    left: SPACING.LG,
    right: SPACING.LG,
    borderRadius: 20,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 999,
    backgroundColor: '#00000020',
  },
  backText: { fontSize: 14, fontWeight: '600' },
  overlayTitles: { flex: 1, marginLeft: SPACING.MD },
  overlayTitle: { fontSize: 18, fontWeight: '700' },
  overlaySubtitle: { fontSize: 14, marginTop: 2 },
  gameOverlayBottom: { position: 'absolute', left: SPACING.LG, right: SPACING.LG },
  fallbackScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.XL },
  fallbackTitle: { fontSize: 22, fontWeight: '700', marginBottom: SPACING.MD },
  fallbackMessage: { fontSize: 15, lineHeight: 20, textAlign: 'center', marginBottom: SPACING.XL },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0009',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: SPACING.LG,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: SPACING.XS },
  modalSubtitle: { fontSize: 14, marginBottom: SPACING.MD },
  modalList: { maxHeight: 240, marginBottom: SPACING.MD },
  modalRow: {
    paddingVertical: SPACING.SM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0002',
  },
  modalRowText: { fontSize: 16 },
  modalEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: SPACING.SM },
  modalCancel: { alignSelf: 'center', padding: SPACING.SM },
  modalCancelText: { fontSize: 15, fontWeight: '500' },
  modalError: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: SPACING.SM },
});
