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

import Header from '../../../components/Header';
import ScreenContainer from '../../../components/ScreenContainer';
import GradientButton from '../../../components/GradientButton';
import GamePreviewModal from '../../../components/GamePreviewModal';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors, Fonts, Sizes } from '../../../constants/styles';
import { bots, getRandomBot } from '../../../ai/bots';
import { allGames } from '../../../data/games';
import { games } from '../../../games/registry';
import { HEADER_SPACING } from '../../../layout';

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

const personalityCopy = {
  friendly: 'Friendly and encouraging',
  competitive: 'Strategic challenger',
  sarcastic: 'Playful banter guaranteed',
};

export default function AIGamesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const availableGames = useMemo(
    () =>
      allGames
        .map((game) => ({ ...game, registryId: deriveRegistryId(game) }))
        .filter((game) => game.registryId),
    []
  );

  const [selectedGame, setSelectedGame] = useState(() => availableGames[0] || null);
  const [selectedBot, setSelectedBot] = useState(() => bots[0] || null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    const initialGameId = toSingleValue(params.gameId);
    if (initialGameId) {
      const match = availableGames.find((game) => game.registryId === initialGameId);
      if (match) {
        setSelectedGame(match);
      }
    }
    const initialBotId = toSingleValue(params.botId);
    if (initialBotId) {
      const botMatch = bots.find((bot) => bot.id === initialBotId);
      if (botMatch) {
        setSelectedBot(botMatch);
      }
    }
  }, [availableGames, params.gameId, params.botId]);

  const startGame = useCallback(() => {
    if (!selectedGame?.registryId || !selectedBot?.id) return;
    router.push({
      pathname: '/games/GameWithBotScreen',
      params: { game: selectedGame.registryId, botId: selectedBot.id },
    });
  }, [router, selectedBot, selectedGame]);

  const openPreview = useCallback(() => {
    if (!selectedGame) return;
    setPreviewVisible(true);
  }, [selectedGame]);

  const closePreview = useCallback(() => setPreviewVisible(false), []);

  const inviteFriend = useCallback(() => {
    if (!selectedGame?.registryId) return;
    setPreviewVisible(false);
    router.push({ pathname: '/invite', params: { gameId: selectedGame.registryId } });
  }, [router, selectedGame]);

  const pickAnotherBot = useCallback(() => {
    setSelectedBot((current) => {
      if (bots.length <= 1) return current;
      let next = getRandomBot();
      while (current && next.id === current.id) {
        next = getRandomBot();
      }
      return next;
    });
  }, []);

  const renderBot = useCallback(
    ({ item }) => {
      const isActive = selectedBot?.id === item.id;
      return (
        <TouchableOpacity
          style={[styles.botCard, isActive && styles.botCardActive]}
          onPress={() => setSelectedBot(item)}
          activeOpacity={0.85}
        >
          <Image source={item.image} style={styles.botAvatar} />
          <Text style={[styles.botName, isActive && styles.botNameActive]}>{item.name}</Text>
          {item.personality ? (
            <Text style={styles.botPersona}>{personalityCopy[item.personality] || 'Ready to play'}</Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [selectedBot, styles]
  );

  const renderGame = useCallback(
    ({ item }) => {
      const isActive = selectedGame?.id === item.id;
      return (
        <TouchableOpacity
          style={[styles.gameCard, isActive && styles.gameCardActive]}
          onPress={() => setSelectedGame(item)}
          activeOpacity={0.85}
        >
          <View style={styles.gameIcon}>{item.icon}</View>
          <Text style={[styles.gameTitle, isActive && styles.gameTitleActive]}>{item.title}</Text>
          {item.category ? <Text style={styles.gameCategory}>{item.category}</Text> : null}
          {item.speed ? <Text style={styles.gameMeta}>{item.speed} pace</Text> : null}
        </TouchableOpacity>
      );
    },
    [selectedGame, styles]
  );

  return (
    <View style={styles.container}>
      <Header />
      <ScreenContainer contentStyle={[styles.content, { paddingTop: HEADER_SPACING }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Play with an AI buddy</Text>
          <Text style={styles.subtitle}>
            Perfect for practice rounds or keeping your streak alive. Pick a bot, choose a game, and start playing right away.
          </Text>

          <Text style={styles.sectionTitle}>Choose your bot</Text>
          <FlatList
            data={bots}
            keyExtractor={(item) => item.id}
            renderItem={renderBot}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.botList}
          />

          <TouchableOpacity style={styles.randomBotButton} onPress={pickAnotherBot} activeOpacity={0.8}>
            <Text style={styles.randomBotText}>Surprise me with a new bot</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Pick a game</Text>
          <FlatList
            data={availableGames}
            keyExtractor={(item) => item.registryId}
            renderItem={renderGame}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gameList}
          />

          <View style={styles.actions}>
            <GradientButton text="Start match" onPress={startGame} style={styles.actionButton} />
            <GradientButton
              text="Preview game"
              onPress={openPreview}
              style={styles.actionButton}
            />
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/invite', params: { gameId: selectedGame?.registryId } })}
              activeOpacity={0.8}
            >
              <Text style={styles.inviteLink}>Invite a friend instead</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>

      <GamePreviewModal
        visible={previewVisible}
        game={selectedGame}
        onClose={closePreview}
        onPlayFriend={inviteFriend}
        onPracticeBot={startGame}
        friendLabel="Invite a friend"
        botLabel={selectedBot ? `Play with ${selectedBot.name}` : 'Play with bot'}
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
      marginBottom: Sizes.fixPadding,
      marginTop: Sizes.fixPadding * 2,
    },
    botList: {
      paddingVertical: Sizes.fixPadding,
    },
    botCard: {
      width: 180,
      marginRight: Sizes.fixPadding,
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: Sizes.fixPadding * 1.5,
      alignItems: 'center',
    },
    botCardActive: {
      borderWidth: 2,
      borderColor: Colors.primaryColor,
    },
    botAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      marginBottom: Sizes.fixPadding,
    },
    botName: {
      ...Fonts.blackColor16Bold,
      color: theme.text,
    },
    botNameActive: {
      color: Colors.primaryColor,
    },
    botPersona: {
      ...Fonts.blackColor13Regular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: Sizes.fixPadding * 0.6,
    },
    randomBotButton: {
      alignSelf: 'flex-start',
      marginBottom: Sizes.fixPadding,
    },
    randomBotText: {
      ...Fonts.blackColor14Medium,
      color: Colors.primaryColor,
    },
    gameList: {
      paddingVertical: Sizes.fixPadding,
    },
    gameCard: {
      width: 180,
      marginRight: Sizes.fixPadding,
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: Sizes.fixPadding * 1.5,
    },
    gameCardActive: {
      borderWidth: 2,
      borderColor: Colors.primaryColor,
    },
    gameIcon: {
      marginBottom: Sizes.fixPadding,
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
    gameMeta: {
      ...Fonts.blackColor13Regular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    actions: {
      marginTop: Sizes.fixPadding * 2,
      gap: Sizes.fixPadding * 1.2,
    },
    actionButton: {
      borderRadius: 16,
    },
    inviteLink: {
      ...Fonts.blackColor14Medium,
      color: Colors.primaryColor,
      textAlign: 'center',
      marginTop: Sizes.fixPadding,
    },
  });
