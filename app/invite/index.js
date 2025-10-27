import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Header from '../../components/Header';
import ScreenContainer from '../../components/ScreenContainer';
import GamePreviewModal from '../../components/GamePreviewModal';
import GradientButton from '../../components/GradientButton';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../contexts/ThemeContext';
import { useChats } from '../../contexts/ChatContext';
import { useMatchmaking } from '../../contexts/MatchmakingContext';
import { allGames } from '../../data/games';
import { games } from '../../games/registry';
import { Colors, Fonts, Sizes } from '../../constants/styles';
import { getRandomBot } from '../../ai/bots';
import { HEADER_SPACING } from '../../layout';

const defaultAvatar = require('../../assets/images/users/user1.png');

const toSingleValue = (value) => (Array.isArray(value) ? value[0] : value);

const deriveRegistryId = (game) => {
  if (!game) return null;
  const normalizedTitle = game.title ? game.title.toLowerCase() : null;
  const matchedKey = Object.keys(games).find((key) => {
    const title = games[key]?.meta?.title;
    return title && normalizedTitle && title.toLowerCase() === normalizedTitle;
  });
  if (matchedKey) return matchedKey;
  const fallback = Object.keys(games).find((key) => {
    const id = games[key]?.meta?.id;
    return id && game.route && id.toLowerCase() === game.route.toLowerCase();
  });
  return fallback || null;
};

export default function InviteScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matches = [], loading } = useChats();
  const { sendGameInvite } = useMatchmaking();

  const availableGames = useMemo(
    () =>
      allGames
        .map((game) => ({ ...game, registryId: deriveRegistryId(game) }))
        .filter((game) => game.registryId),
    []
  );

  const [selectedGame, setSelectedGame] = useState(() => availableGames[0] || null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    const initialGameId = toSingleValue(params.gameId);
    if (!initialGameId) return;
    const nextGame = availableGames.find((game) => game.registryId === initialGameId);
    if (nextGame) {
      setSelectedGame(nextGame);
    }
  }, [availableGames, params.gameId]);

  const openPreview = useCallback((match) => {
    setSelectedMatch(match);
    setModalVisible(true);
    setInviteError('');
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setInviteError('');
  }, []);

  const handlePracticeBot = useCallback(() => {
    if (!selectedGame) return;
    closeModal();
    const bot = getRandomBot();
    router.push({
      pathname: '/games/GameWithBotScreen',
      params: { game: selectedGame.registryId, botId: bot.id },
    });
  }, [closeModal, router, selectedGame]);

  const handleSendInvite = useCallback(async () => {
    if (inviteLoading) return;
    if (!selectedMatch?.otherUserId || !selectedGame?.registryId) {
      setInviteError('Select a match and a game to continue.');
      return;
    }
    try {
      setInviteLoading(true);
      const inviteId = await sendGameInvite(selectedMatch.otherUserId, selectedGame.registryId);
      closeModal();
      router.push({
        pathname: '/games/GameSessionScreen',
        params: {
          inviteId,
          status: 'waiting',
          game: JSON.stringify({ id: selectedGame.registryId, title: selectedGame.title }),
          opponent: JSON.stringify({
            id: selectedMatch.otherUserId,
            displayName: selectedMatch.displayName || 'Opponent',
            photo: selectedMatch.photoURL || selectedMatch.image || null,
          }),
        },
      });
    } catch (error) {
      setInviteError('Failed to send invite. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  }, [closeModal, inviteLoading, router, selectedGame, selectedMatch, sendGameInvite]);

  const renderGame = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.gameChip, selectedGame?.id === item.id ? styles.gameChipActive : null]}
        onPress={() => setSelectedGame(item)}
        activeOpacity={0.8}
      >
        <View style={styles.gameIcon}>{item.icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gameTitle, selectedGame?.id === item.id && styles.gameTitleActive]}>
            {item.title}
          </Text>
          {item.category ? (
            <Text style={styles.gameCategory}>{item.category}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [selectedGame, styles]
  );

  const renderMatch = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => openPreview(item)}
        activeOpacity={0.85}
      >
        <Image
          source={item.photoURL ? { uri: item.photoURL } : defaultAvatar}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.matchName}>{item.displayName || 'Player'}</Text>
          <Text style={styles.matchSubtitle}>Tap to choose a game</Text>
        </View>
      </TouchableOpacity>
    ),
    [openPreview, styles]
  );

  return (
    <View style={styles.container}>
      <Header />
      <ScreenContainer contentStyle={[styles.content, { paddingTop: HEADER_SPACING }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Invite a Match</Text>
          <Text style={styles.subtitle}>
            Pick a game and send an invite to one of your matches. They’ll get a notification right away.
          </Text>

          <Text style={styles.sectionTitle}>Choose a Game</Text>
          <FlatList
            data={availableGames}
            keyExtractor={(item) => item.registryId}
            renderItem={renderGame}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gameList}
          />

          <Text style={styles.sectionTitle}>Your Matches</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading matches…</Text>
          ) : matches.length ? (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.id}
              renderItem={renderMatch}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: Sizes.fixPadding * 1.2 }} />}
            />
          ) : (
            <EmptyState
              text="No matches yet. Keep swiping to meet new people!"
              style={{ marginTop: Sizes.fixPadding * 4 }}
            />
          )}

          {inviteError ? <Text style={styles.errorText}>{inviteError}</Text> : null}

          <GradientButton
            text="Browse Games"
            onPress={() => router.push('/(tabs)/games')}
            style={styles.catalogButton}
          />
        </ScrollView>
      </ScreenContainer>

      <GamePreviewModal
        visible={modalVisible}
        game={selectedGame}
        onClose={closeModal}
        onPlayFriend={handleSendInvite}
        onPracticeBot={handlePracticeBot}
        friendLabel={inviteLoading ? 'Sending…' : 'Send Invite'}
        botLabel="Practice with an AI bot"
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: Sizes.fixPadding * 2,
      paddingBottom: Sizes.fixPadding * 6,
    },
    title: {
      ...Fonts.blackColor20Bold,
      color: theme.text,
      marginBottom: Sizes.fixPadding,
    },
    subtitle: {
      ...Fonts.blackColor14Medium,
      color: theme.textSecondary,
      marginBottom: Sizes.fixPadding * 2,
      lineHeight: 20,
    },
    sectionTitle: {
      ...Fonts.blackColor18Bold,
      color: theme.text,
      marginBottom: Sizes.fixPadding,
      marginTop: Sizes.fixPadding * 2,
    },
    gameList: {
      paddingVertical: Sizes.fixPadding,
    },
    gameChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: Sizes.fixPadding * 1.2,
      borderRadius: 16,
      marginRight: Sizes.fixPadding,
      width: 200,
    },
    gameChipActive: {
      borderWidth: 2,
      borderColor: Colors.primaryColor,
    },
    gameIcon: {
      marginRight: Sizes.fixPadding,
    },
    gameTitle: {
      ...Fonts.blackColor16Bold,
      color: theme.text,
    },
    gameTitleActive: {
      color: Colors.primaryColor,
    },
    gameCategory: {
      ...Fonts.blackColor13Regular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    matchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: Sizes.fixPadding * 1.2,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginRight: Sizes.fixPadding,
    },
    matchName: {
      ...Fonts.blackColor16Bold,
      color: theme.text,
    },
    matchSubtitle: {
      ...Fonts.blackColor13Regular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    loadingText: {
      ...Fonts.blackColor14Regular,
      color: theme.textSecondary,
    },
    catalogButton: {
      marginTop: Sizes.fixPadding * 3,
      borderRadius: 16,
    },
    errorText: {
      ...Fonts.blackColor14Medium,
      color: Colors.dangerColor,
      marginTop: Sizes.fixPadding * 2,
    },
  });
