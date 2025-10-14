import React, { useState, useRef, useEffect } from 'react';
import { Text, FlatList, View, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import GradientBackground from '../../components/GradientBackground';
import SafeKeyboardView from '../../components/SafeKeyboardView';
import getGlobalStyles from '../../styles';
import Header from '../../components/Header';

import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useDev } from '../../contexts/DevContext';
import { useGameLimit } from '../../contexts/GameLimitContext';
import GameCard from '../../components/GameCard';
import GamePreviewModal from '../../components/GamePreviewModal';
import GameFilters from '../../components/GameFilters';
import EmptyState from '../../components/EmptyState';

import { allGames } from '../../data/games';           // your static list
import { games as gameRegistry } from './registry';     // boardgame registry
import { getRandomBot } from '../../ai/bots';
import { HEADER_SPACING } from '../../layout';

const aiGameMap = allGames.reduce((acc, g) => {
  const key = Object.keys(gameRegistry).find((k) => gameRegistry[k].meta.title === g.title);
  if (key) acc[g.id] = key;
  return acc;
}, {});

export const deriveRegistryId = (game) => {
  if (!game) return 'ticTacToe';
  if (aiGameMap[game.id]) return aiGameMap[game.id];

  const matchedKey = Object.keys(gameRegistry).find((k) => {
    const title = gameRegistry[k]?.meta?.title;
    return title && game.title && title.toLowerCase() === game.title.toLowerCase();
  });

  return matchedKey || 'ticTacToe';
};

const getAllCategories = () => ['All', ...new Set(allGames.map((g) => g.category))];

export default function PlayScreen() {
  const router = useRouter();
  const { darkMode, theme } = useTheme();
  const styles = getGlobalStyles(theme);
  const { user } = useUser();
  const { devMode } = useDev();
  const { gamesLeft } = useGameLimit();
  const isPremiumUser = !!user?.isPremium;

  const [filter, setFilter] = useState('All');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [previewGame, setPreviewGame] = useState(null);
  const flatListRef = useRef();

  const toggleFavorite = (id) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredGames = allGames.filter((game) => {
    const matchCategory =
      filter === 'All' ||
      (filter === 'Free' && !game.premium) ||
      (filter === 'Premium' && game.premium) ||
      (filter === 'Favorites' && favorites.includes(game.id));
    const matchSearch = game.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = category === 'All' || game.category === category;
    return matchCategory && matchSearch && matchTag;
  });

  useEffect(() => {
    if (filter === 'Premium') {
      const firstPremiumIndex = filteredGames.findIndex((g) => g.premium);
      if (firstPremiumIndex >= 0) {
        setTimeout(() => flatListRef.current?.scrollToIndex({ index: firstPremiumIndex, animated: true }), 200);
      }
    }
  }, [filter, filteredGames]);

  const goToCatalogWith = (params) => router.push({ pathname: '/games', params });

  const handleStartGame = () => {
    if (!previewGame) return;
    setPreviewGame(null);
    const registryId = deriveRegistryId(previewGame);
    if (previewGame.premium && !isPremiumUser && !devMode) {
      goToCatalogWith({ gameId: registryId }); // optionally redirect to paywall if you have one
      return;
    }
    // lightweight “select this game” → index route knows what to do
    goToCatalogWith({ gameId: registryId });
  };

  const handlePracticeGame = () => {
    if (!previewGame) return;
    setPreviewGame(null);
    const registryId = deriveRegistryId(previewGame);
    if (previewGame.premium && !isPremiumUser && !devMode) {
      goToCatalogWith({ gameId: registryId });
      return;
    }
    const bot = getRandomBot();
    goToCatalogWith({ gameId: registryId, botId: bot.id }); // index can decide how to start a bot session
  };

  const renderItem = ({ item }) => (
    <GameCard
      item={item}
      isFavorite={favorites.includes(item.id)}
      trending={false}
      toggleFavorite={() => toggleFavorite(item.id)}
      onPress={() => {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setPreviewGame(item);
      }}
    />
  );

  return (
    <GradientBackground style={styles.swipeScreen}>
      <Header showLogoOnly />
      <SafeKeyboardView style={{ flex: 1, paddingTop: HEADER_SPACING }}>
        <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 40, marginBottom: 6 }}>
          Break the ice with games
        </Text>

        <GameFilters
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          category={category}
          setCategory={setCategory}
          categories={getAllCategories()}
        />

        <FlatList
          ref={flatListRef}
          data={filteredGames}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 8 }}
          columnWrapperStyle={{ justifyContent: 'center' }}
          renderItem={renderItem}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={<EmptyState text="No games found." image={require('../../assets/logo.png')} />}
        />

        <GamePreviewModal
          visible={!!previewGame}
          game={previewGame}
          onClose={() => setPreviewGame(null)}
          onPlayFriend={handleStartGame}
          onPracticeBot={handlePracticeGame}
        />
      </SafeKeyboardView>
    </GradientBackground>
  );
}
