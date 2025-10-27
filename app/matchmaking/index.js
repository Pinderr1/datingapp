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
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import Header from '../../components/Header';
import ScreenContainer from '../../components/ScreenContainer';
import GradientButton from '../../components/GradientButton';
import GamePreviewModal from '../../components/GamePreviewModal';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../contexts/ThemeContext';
import { useMatchmaking } from '../../contexts/MatchmakingContext';
import { useUser } from '../../contexts/UserContext';
import useUserProfile from '../../hooks/useUserProfile';
import { db } from '../../firebaseConfig';
import { Colors, Fonts, Sizes } from '../../constants/styles';
import { allGames } from '../../data/games';
import { games } from '../../games/registry';
import { HEADER_SPACING } from '../../layout';

const defaultAvatar = require('../../assets/images/users/user1.png');

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

const ChallengeRow = React.memo(function ChallengeRow({ item, onJoin, joining, styles }) {
  const profile = useUserProfile(item.host);
  const displayName =
    profile?.displayName || profile?.name || profile?.fullName || 'Player';
  const avatar = profile?.photoURL || profile?.image || null;

  return (
    <View style={styles.challengeCard}>
      <View style={styles.challengeInfo}>
        <Image source={avatar ? { uri: avatar } : defaultAvatar} style={styles.challengeAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.challengeTitle}>{item.gameTitle}</Text>
          <Text style={styles.challengeMeta}>Hosted by {displayName}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.joinChip, joining ? styles.joinChipDisabled : null]}
        onPress={() => onJoin(item)}
        disabled={joining}
        activeOpacity={0.85}
      >
        <Text style={styles.joinChipText}>{joining ? 'Joining…' : 'Join'}</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function MatchmakingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { user } = useUser();
  const { createOpenChallenge, acceptOpenChallenge } = useMatchmaking();

  const availableGames = useMemo(
    () =>
      allGames
        .map((game) => ({ ...game, registryId: deriveRegistryId(game) }))
        .filter((game) => game.registryId),
    []
  );

  const [selectedGame, setSelectedGame] = useState(() => availableGames[0] || null);
  const [challenges, setChallenges] = useState([]);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      where('type', '==', 'public'),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() || {};
            const registryId = data.gameId;
            const gameMatch = availableGames.find((game) => game.registryId === registryId);
            return {
              id: docSnap.id,
              host: data.host,
              gameId: registryId,
              gameTitle:
                gameMatch?.title || games[registryId]?.meta?.title || 'Mystery Game',
              createdAt: data.createdAt,
            };
          })
          .filter((item) => item.host && item.host !== user?.uid);

        items.sort((a, b) => {
          const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
          const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
          return aTime - bTime;
        });

        setChallenges(items);
        setError('');
      },
      () => {
        setChallenges([]);
        setError('Unable to load the matchmaking queue. Please try again later.');
      }
    );

    return () => unsubscribe();
  }, [availableGames, user?.uid]);

  const startMatchmaking = useCallback(async () => {
    if (creating) return;
    if (!selectedGame?.registryId) {
      setError('Select a game before starting matchmaking.');
      return;
    }

    try {
      setError('');
      setCreating(true);
      const inviteId = await createOpenChallenge(selectedGame.registryId);
      router.push({
        pathname: '/games/GameSessionScreen',
        params: {
          inviteId,
          status: 'waiting',
          game: JSON.stringify({ id: selectedGame.registryId, title: selectedGame.title }),
        },
      });
    } catch (err) {
      const message = typeof err?.message === 'string' ? err.message : null;
      setError(message || 'Unable to start matchmaking right now.');
    } finally {
      setCreating(false);
    }
  }, [createOpenChallenge, creating, router, selectedGame]);

  const joinChallenge = useCallback(
    async (challenge) => {
      if (joiningId) return;
      try {
        setError('');
        setJoiningId(challenge.id);
        const result = await acceptOpenChallenge(challenge.id);
        router.push({
          pathname: '/games/GameSessionScreen',
          params: {
            inviteId: challenge.id,
            status: 'ready',
            game: JSON.stringify({ id: challenge.gameId, title: challenge.gameTitle }),
            opponent: JSON.stringify({ id: result?.hostId }),
          },
        });
      } catch (err) {
        const message = typeof err?.message === 'string' ? err.message : null;
        setError(message || 'Unable to join this challenge.');
      } finally {
        setJoiningId(null);
      }
    },
    [acceptOpenChallenge, joiningId, router]
  );

  const openPreview = useCallback(() => {
    if (!selectedGame) return;
    setPreviewVisible(true);
  }, [selectedGame]);

  const closePreview = useCallback(() => setPreviewVisible(false), []);

  return (
    <View style={styles.container}>
      <Header />
      <ScreenContainer contentStyle={[styles.content, { paddingTop: HEADER_SPACING }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Find a quick match</Text>
          <Text style={styles.subtitle}>
            Queue up for a stranger match or join an open challenge. We’ll notify the host as soon as you join.
          </Text>

          <Text style={styles.sectionTitle}>Public challenges</Text>
          {challenges.length ? (
            <FlatList
              data={challenges}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChallengeRow item={item} onJoin={joinChallenge} joining={joiningId === item.id} styles={styles} />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: Sizes.fixPadding * 1.2 }} />}
            />
          ) : (
            <EmptyState
              text="No open challenges right now. Start one below and be the first in line!"
              style={{ marginTop: Sizes.fixPadding * 3 }}
            />
          )}

          <Text style={styles.sectionTitle}>Start your own</Text>
          <FlatList
            data={availableGames}
            keyExtractor={(item) => item.registryId}
            renderItem={({ item }) => {
              const isActive = selectedGame?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.gameChip, isActive && styles.gameChipActive]}
                  onPress={() => setSelectedGame(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.gameIcon}>{item.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gameTitle, isActive && styles.gameTitleActive]}>{item.title}</Text>
                    {item.category ? (
                      <Text style={styles.gameCategory}>{item.category}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gameList}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <GradientButton
            text={creating ? 'Starting…' : 'Start matchmaking'}
            onPress={startMatchmaking}
            disabled={creating}
            style={styles.actionButton}
          />

          <TouchableOpacity onPress={openPreview} activeOpacity={0.8}>
            <Text style={styles.previewLink}>Preview this game</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>

      <GamePreviewModal
        visible={previewVisible}
        game={selectedGame}
        onClose={closePreview}
        onPlayFriend={() => router.push({ pathname: '/invite', params: { gameId: selectedGame?.registryId } })}
        onPracticeBot={() =>
          router.push({ pathname: '/games/GameWithBotScreen', params: { game: selectedGame?.registryId } })
        }
        friendLabel="Invite a match from your list"
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
      lineHeight: 20,
      marginBottom: Sizes.fixPadding * 2,
    },
    sectionTitle: {
      ...Fonts.blackColor18Bold,
      color: theme.text,
      marginTop: Sizes.fixPadding * 2,
      marginBottom: Sizes.fixPadding,
    },
    challengeCard: {
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: Sizes.fixPadding * 1.5,
    },
    challengeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Sizes.fixPadding,
    },
    challengeAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: Sizes.fixPadding,
    },
    challengeTitle: {
      ...Fonts.blackColor16Bold,
      color: theme.text,
    },
    challengeMeta: {
      ...Fonts.blackColor13Regular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    joinChip: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.primaryColor,
      paddingHorizontal: Sizes.fixPadding * 1.6,
      paddingVertical: Sizes.fixPadding * 0.8,
      borderRadius: 30,
    },
    joinChipDisabled: {
      opacity: 0.6,
    },
    joinChipText: {
      ...Fonts.whiteColor15Medium,
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
    errorText: {
      ...Fonts.blackColor14Medium,
      color: Colors.dangerColor,
      marginTop: Sizes.fixPadding,
    },
    actionButton: {
      marginTop: Sizes.fixPadding * 2,
      borderRadius: 16,
    },
    previewLink: {
      ...Fonts.blackColor14Medium,
      color: Colors.primaryColor,
      textAlign: 'center',
      marginTop: Sizes.fixPadding * 1.5,
    },
  });
