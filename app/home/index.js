import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Sizes } from '../../constants/styles';
import { useUser } from '../../contexts/UserContext';
import { useChats } from '../../contexts/ChatContext';
import useWinLossStats from '../../hooks/useWinLossStats';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loginBonus } = useUser();
  const { matches } = useChats();
  const winLossStats = useWinLossStats(user?.uid);

  const [showBonus, setShowBonus] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const defaultUserImage = require('../../assets/images/users/user1.png');

  const level = Math.floor((user?.xp || 0) / 100);
  const xpProgress = (user?.xp || 0) % 100;
  const streakProgress = Math.min((user?.streak || 0) % 7, 7);

  useEffect(() => {
    if (loginBonus) {
      setShowBonus(true);
      const t = setTimeout(() => setShowBonus(false), 4000);
      return () => clearTimeout(t);
    }
  }, [loginBonus]);

  const avatarSource = user?.photoURL ? { uri: user.photoURL } : defaultUserImage;

  const quickPlayOptions = [
    { key: 'invite', title: 'Invite Match', emoji: '👥', path: '/invite' },
    { key: 'ai', title: 'Play AI', emoji: '🤖', path: '/games/ai' },
    { key: 'stranger', title: 'Play Stranger', emoji: '🎲', path: '/matchmaking' },
    { key: 'browse', title: 'Browse Games', emoji: '🕹️', path: '/(tabs)/games' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Sizes.fixPadding * 8),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <View style={styles.profileSummary}>
              <Image
                source={avatarSource}
                style={styles.profileAvatar}
                resizeMode="cover"
              />
              <View style={styles.profileInfo}>
                <Text
                  numberOfLines={1}
                  style={{ ...Fonts.blackColor18Bold, marginBottom: 4 }}
                >
                  {user?.displayName ? `Welcome, ${user.displayName}` : 'Welcome!'}
                </Text>
                <View style={styles.profileMetaRow}>
                  <View style={styles.metaPill}>
                    <MaterialCommunityIcons
                      name="flash"
                      size={16}
                      color={Colors.primaryColor}
                    />
                    <Text style={styles.metaPillText}>{user?.xp ?? 0} XP</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <MaterialCommunityIcons
                      name="fire"
                      size={16}
                      color={Colors.primaryColor}
                    />
                    <Text style={styles.metaPillText}>
                      {user?.streak ?? 0}-day streak
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile/profileScreen')}
              style={styles.iconWrapStyle}
            >
              <MaterialIcons
                name="settings"
                size={22}
                color={Colors.primaryColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Level / XP Card */}
        <View style={styles.group}>
          <View style={styles.progressCard}>
            <Text style={styles.levelText}>Level {level}</Text>
            <ProgressBar value={xpProgress} max={100} color={Colors.primaryColor} />
            <Text style={styles.streakLabel}>
              {streakProgress}/7 Day Progress
            </Text>
            <ProgressBar value={streakProgress} max={7} color="#2ecc71" />
          </View>
        </View>

        {/* Daily Bonus */}
        {showBonus && (
          <Text style={styles.bonus}>🔥 Daily Bonus +5 XP</Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Stat label="Matches" value={matches?.length ?? 0} />
          <Stat label="Wins" value={winLossStats.wins ?? 0} />
          <Stat label="Losses" value={winLossStats.losses ?? 0} />
        </View>

        {/* Quick Play */}
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Quick Play</Text>
          {quickPlayOptions.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.fullTile}
              activeOpacity={0.8}
              onPress={() => router.push(item.path)}
            >
              <Text style={styles.tileEmoji}>{item.emoji}</Text>
              <Text style={styles.fullTileText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Games */}
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Active Games</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.fullTile}
            onPress={() => router.push('/(tabs)/games')}
          >
            <Text style={styles.tileEmoji}>🎮</Text>
            <Text style={styles.fullTileText}>Continue or Start New Games</Text>
          </TouchableOpacity>
        </View>

        {/* Matches */}
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Your Matches</Text>
          {matches?.length ? (
            matches.slice(0, 3).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.matchCard}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/chat/chatScreen',
                    params: { matchId: m.id },
                  })
                }
              >
                <Image
                  source={
                    m.image ? { uri: m.image } : defaultUserImage
                  }
                  style={styles.matchAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchName}>{m.displayName || 'Player'}</Text>
                  <Text style={styles.matchSub}>Tap to chat</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No matches yet. Start swiping!</Text>
          )}
        </View>

        {/* Games CTA */}
        <View style={styles.group}>
          <TouchableOpacity
            style={styles.fullTile}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/games')}
          >
            <Text style={styles.tileEmoji}>🕹️</Text>
            <Text style={styles.fullTileText}>Browse All Games</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Buttons */}
        <View style={{ paddingHorizontal: Sizes.fixPadding * 2 }}>
          <GradientButton
            text="Swipe Now"
            onPress={() => router.push('/swipe')}
          />
        </View>
      </ScrollView>

      {/* Example modal placeholder */}
      <Modal visible={showGamePicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
              Choose a Game
            </Text>
            <TouchableOpacity onPress={() => setShowGamePicker(false)}>
              <Text style={{ color: Colors.primaryColor }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Subcomponent for stats
const Stat = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: Sizes.fixPadding * 2,
    paddingHorizontal: Sizes.fixPadding * 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.bgColor,
    marginRight: Sizes.fixPadding,
  },
  profileInfo: { flex: 1 },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  metaPillText: {
    ...Fonts.blackColor13Regular,
    marginLeft: 4,
  },
  iconWrapStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonus: {
    fontSize: 14,
    color: '#2ecc71',
    marginBottom: 8,
    alignSelf: 'center',
  },
  group: {
    marginBottom: Sizes.fixPadding * 3,
    paddingHorizontal: Sizes.fixPadding * 2,
  },
  progressCard: {
    borderRadius: Sizes.fixPadding * 2,
    backgroundColor: Colors.bgColor,
    padding: Sizes.fixPadding * 2,
  },
  levelText: { ...Fonts.blackColor16Bold, marginBottom: 8 },
  streakLabel: { ...Fonts.grayColor13Regular, marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgColor,
    borderRadius: Sizes.fixPadding * 1.5,
    padding: Sizes.fixPadding * 1.5,
    marginHorizontal: Sizes.fixPadding * 2,
    marginBottom: Sizes.fixPadding * 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Fonts.blackColor16Bold },
  statLabel: { ...Fonts.grayColor13Regular },
  sectionTitle: {
    ...Fonts.blackColor16Bold,
    marginBottom: Sizes.fixPadding,
  },
  fullTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.bgColor,
    marginBottom: 12,
  },
  tileEmoji: { fontSize: 26, marginRight: 10 },
  fullTileText: { ...Fonts.blackColor15Regular },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgColor,
    borderRadius: 12,
    padding: Sizes.fixPadding * 1.5,
    marginBottom: Sizes.fixPadding,
  },
  matchAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: Sizes.fixPadding,
  },
  matchName: { ...Fonts.blackColor15Bold },
  matchSub: { ...Fonts.grayColor13Regular },
  emptyText: {
    ...Fonts.grayColor14Regular,
    textAlign: 'center',
    marginTop: Sizes.fixPadding,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: Colors.whiteColor,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
});

export default HomeScreen;
