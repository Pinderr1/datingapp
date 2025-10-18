import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from 'react-native-deck-swiper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { fetchSwipeCandidates, likeUser } from '../../services/userService';
import GradientButton from '../../components/GradientButton';

const PAGE_SIZE = 20;

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [likingId, setLikingId] = useState(null);
  const [search, setSearch] = useState('');

  const searchFieldRef = useRef(null);
  const swiperRef = useRef(null);
  const defaultUserImage = require('../../assets/images/users/user1.png');

  const seenStateRef = useRef({ key: null, set: new Set() });
  const getTodayKey = () => {
    const isoDate = new Date().toISOString().split('T')[0];
    return `seenCandidates:${isoDate}`;
  };
  const ensureSeenState = async () => {
    const todayKey = getTodayKey();
    if (seenStateRef.current.key === todayKey) return seenStateRef.current;
    try {
      const stored = await AsyncStorage.getItem(todayKey);
      let parsed = [];
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (Array.isArray(data)) parsed = data.filter((v) => typeof v === 'string');
        } catch {}
      }
      seenStateRef.current = { key: todayKey, set: new Set(parsed) };
    } catch {
      seenStateRef.current = { key: todayKey, set: new Set() };
    }
    return seenStateRef.current;
  };
  const markCandidateSeen = async (id) => {
    if (!id) return;
    const { key, set } = await ensureSeenState();
    if (set.has(id)) return;
    set.add(id);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {}
  };

  const loadCandidates = async ({ reset = false } = {}) => {
    if (loading) return;
    setLoading(true);
    try {
      console.log('current user uid', auth.currentUser?.uid);
      const seenState = await ensureSeenState();
      const result = await fetchSwipeCandidates({
        startAfter: reset ? null : nextCursor,
        limit: PAGE_SIZE,
      });

      if (result.ok && result.data?.users) {
        const incoming = result.data.users.filter(
          (u) => u?.id && !seenState.set.has(u.id)
        );
        setUsers((prev) => (reset ? incoming : [...prev, ...incoming]));
        setNextCursor(result.data.nextCursor ?? null);
      } else if (!result.ok) {
        Alert.alert(
          'Unable to load profiles',
          result.error?.message ?? 'Please try again later.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadCandidates({ reset: true });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const removeCard = (id) => {
    setUsers((prev) => prev.filter((item) => item.id !== id));
    markCandidateSeen(id).catch(() => {});
  };

  const handleSwipe = async (direction, userId) => {
    if (!userId) return;
    const liked = direction === 'right';

    try {
      setLikingId(userId);
      const result = await likeUser({ targetUserId: userId, liked });

      if (!result.ok) {
        Alert.alert('Action failed', result.error?.message ?? 'Please try again later.');
      } else if (result.data?.match) {
        Alert.alert("It's a match!");
        const matchId = result.data.matchId;
        if (matchId) {
          router.push({
            pathname: '/message/messageScreen',
            params: { matchId },
          });
        }
      }
    } finally {
      setLikingId(null);
      removeCard(userId);

      if (users.length < 5 && nextCursor && !loading) {
        loadCandidates();
      }
    }
  };

  const changeShortlist = async ({ id }) => {
    if (!id) return;
    const target = users.find((item) => item.id === id);
    if (!target) return;

    const nextLikedState = !target.isFavorite;

    try {
      setLikingId(id);
      const result = await likeUser({ targetUserId: id, liked: nextLikedState });
      if (!result.ok) {
        Alert.alert('Unable to update shortlist', result.error?.message ?? 'Please try again later.');
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isFavorite: nextLikedState } : item
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  const getUserImageSource = (user) => {
    if (!user) return defaultUserImage;
    if (typeof user.image === 'number') return user.image;
    if (user.image) return { uri: user.image };
    if (user.photoURL) return { uri: user.photoURL };
    return defaultUserImage;
  };

  const renderCard = (item) => {
    if (!item) return <View style={styles.cardPlaceholder} />;

    return (
      <View style={styles.cardShell}>
        <ImageBackground
          source={getUserImageSource(item)}
          style={{ height: '100%', width: '100%' }}
          resizeMode="cover"
          borderRadius={Sizes.fixPadding * 3.0}
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.58)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.58)']}
            style={styles.cardGradient}
          >
            <View style={styles.locationRow}>
              <MaterialIcons name="location-pin" size={18} color={Colors.whiteColor} />
              <Text style={{ ...Fonts.whiteColor15Regular, marginLeft: Sizes.fixPadding - 5.0 }}>
                {item.address ?? 'Nearby'} • {item.distance ?? ''}
              </Text>
            </View>

            <View style={styles.userInfoWithOptionWrapper}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => swiperRef.current?.swipeLeft()}
                style={styles.closeAndShortlistIconWrapStyle}
                disabled={likingId === item.id}
              >
                <MaterialIcons name="close" size={24} color={Colors.primaryColor} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (!item?.id) return;
                  router.push({
                    pathname: '/profileDetail/profileDetailScreen',
                    params: {
                      userId: item.id,
                      initialProfile: JSON.stringify({ ...item, id: item.id }),
                    },
                  });
                }}
                style={styles.centerNameWrap}
              >
                <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
                  {item.name ?? item.displayName ?? 'Someone'}, {item.age ?? ''}
                </Text>
                <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>
                  {item.profession ?? ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => changeShortlist({ id: item.id })}
                style={styles.closeAndShortlistIconWrapStyle}
                disabled={likingId === item.id}
              >
                <MaterialIcons
                  name={item.isFavorite ? 'favorite' : 'favorite-border'}
                  size={24}
                  color={Colors.primaryColor}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  };

  const deckArea = () => {
    if (!auth.currentUser) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator />
          <Text style={{ ...Fonts.grayColor15Regular, marginTop: 8 }}>Connecting…</Text>
        </View>
      );
    }

    if (loading && users.length === 0) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator />
          <Text style={{ ...Fonts.grayColor15Regular, marginTop: 8 }}>Loading profiles…</Text>
        </View>
      );
    }

    if (!loading && users.length === 0) {
      return (
        <View style={styles.centerWrap}>
          <Text style={{ ...Fonts.grayColor15Regular, marginBottom: 12 }}>
            No more profiles right now.
          </Text>
          <TouchableOpacity onPress={() => loadCandidates({ reset: true })} style={styles.filterButtonStyle}>
            <MaterialCommunityIcons name="refresh" size={26} color={Colors.whiteColor} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={styles.imageBottomContainre1}>
          <View style={styles.imageBottomContainre2}>
            <Swiper
              ref={swiperRef}
              cards={users}
              renderCard={renderCard}
              backgroundColor="transparent"
              cardHorizontalMargin={0}
              stackSize={3}
              stackSeparation={12}
              animateCardOpacity
              onSwipedLeft={(index) => {
                const u = users[index];
                if (u?.id) handleSwipe('left', u.id);
              }}
              onSwipedRight={(index) => {
                const u = users[index];
                if (u?.id) handleSwipe('right', u.id);
              }}
              onSwipedAll={() => {
                if (nextCursor && !loading) loadCandidates();
              }}
              disableTopSwipe
              disableBottomSwipe
              outputRotationRange={["-15deg", "0deg", "15deg"]}
              overlayLabels={{
                left: { title: 'NOPE', style: { label: { color: '#ff6b6b', fontSize: 24 } } },
                right: { title: 'LIKE', style: { label: { color: '#2ecc71', fontSize: 24 } } },
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  const searchInfo = () => (
    <View style={styles.searchInfoWrapStyle}>
      <View style={styles.searchFieldWrapStyle}>
        <MaterialIcons name="search" size={22} color={Colors.grayColor} />
        <TextInput
          ref={searchFieldRef}
          placeholder="Search Partner..."
          placeholderTextColor={Colors.grayColor}
          style={{
            padding: 0,
            flex: 1,
            marginLeft: Sizes.fixPadding - 2.0,
            ...Fonts.blackColor15Regular,
            height: 20.0,
          }}
          cursorColor={Colors.primaryColor}
          value={search}
          onChangeText={(value) => setSearch(value)}
          selectionColor={Colors.primaryColor}
        />
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (nextCursor && !loading) loadCandidates();
          else loadCandidates({ reset: true });
        }}
        style={styles.filterButtonStyle}
      >
        <MaterialCommunityIcons name="tune-variant" size={26} color={Colors.whiteColor} />
      </TouchableOpacity>
    </View>
  );

  const header = () => (
    <View style={{ margin: Sizes.fixPadding * 2.0, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ ...Fonts.grayColor15Regular, marginRight: Sizes.fixPadding - 5.0 }}>Location</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.primaryColor} />
        </View>
        <View style={{ marginTop: Sizes.fixPadding - 5.0, flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="location-pin" size={20} color={Colors.primaryColor} />
          <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor18Bold, marginLeft: Sizes.fixPadding - 5.0 }}>
            Irvine, California
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => searchFieldRef.current?.focus()}
          style={styles.iconWrapStyle}
        >
          <MaterialIcons name="search" size={22} color={Colors.primaryColor} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (nextCursor && !loading) loadCandidates();
            else loadCandidates({ reset: true });
          }}
          style={[styles.iconWrapStyle, { marginLeft: Sizes.fixPadding + 5.0 }]}
        >
          <MaterialCommunityIcons name="refresh" size={22} color={Colors.primaryColor} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const footerActions = () => (
    <View style={styles.footerButtonRow}>
      <View style={[styles.footerButtonWrapper, { marginRight: Sizes.fixPadding }]}> 
        <GradientButton
          text="Find Matches"
          onPress={() => router.push('/(tabs)/swipe')}
          width="100%"
          marginVertical={0}
        />
      </View>
      <View style={styles.footerButtonWrapper}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/games')}
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Play Games"
        >
          <Text style={styles.secondaryButtonText}>Play Games</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <View style={{ flex: 1 }}>
        {header()}
        {searchInfo()}
        <View style={{ flex: 1 }}>{deckArea()}</View>
      </View>
      <View
        style={[
          styles.footerContainer,
          { paddingBottom: insets.bottom ? insets.bottom + Sizes.fixPadding : Sizes.fixPadding * 2.5 },
        ]}
      >
        {footerActions()}
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  iconWrapStyle: {
    width: 40.0,
    height: 40.0,
    borderRadius: 20.0,
    backgroundColor: Colors.bgColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInfoWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Sizes.fixPadding * 2.0,
    marginTop: Sizes.fixPadding,
    marginBottom: Sizes.fixPadding * 3.0,
  },
  searchFieldWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.bgColor,
    paddingVertical: Sizes.fixPadding + 5.0,
    paddingHorizontal: Sizes.fixPadding + 2.0,
    borderRadius: Sizes.fixPadding,
  },
  filterButtonStyle: {
    width: 50.0,
    height: 50.0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Sizes.fixPadding,
    backgroundColor: Colors.primaryColor,
    marginLeft: Sizes.fixPadding + 5.0,
  },
  closeAndShortlistIconWrapStyle: {
    width: 43.0,
    height: 43.0,
    borderRadius: 21.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageBottomContainre1: {
    borderRadius: Sizes.fixPadding * 3.0,
    backgroundColor: Colors.lightPinkColor,
    marginHorizontal: Sizes.fixPadding * 4.5,
    flex: 1,
    width: screenWidth - 100,
    paddingBottom: Sizes.fixPadding * 2.0,
    marginBottom: Sizes.fixPadding * 2.0,
    alignSelf: 'center',
  },
  imageBottomContainre2: {
    borderRadius: Sizes.fixPadding * 3.0,
    flex: 1,
    width: screenWidth - 70,
    paddingBottom: Sizes.fixPadding * 2.0,
    alignSelf: 'center',
    backgroundColor: Colors.pinkColor,
  },
  cardShell: {
    height: '100%',
    alignSelf: 'center',
    width: screenWidth - 40,
    borderRadius: Sizes.fixPadding * 3.0,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: Sizes.fixPadding * 3.0,
  },
  centerNameWrap: {
    maxWidth: screenWidth - 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Sizes.fixPadding,
  },
  userInfoWithOptionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Sizes.fixPadding + 8.0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    margin: Sizes.fixPadding,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardPlaceholder: {
    height: '100%',
    width: screenWidth - 40,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding * 3.0,
    backgroundColor: '#ddd',
  },
  footerContainer: {
    paddingHorizontal: Sizes.fixPadding * 2.0,
    paddingTop: Sizes.fixPadding,
    backgroundColor: Colors.whiteColor,
  },
  footerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButtonWrapper: {
    flex: 1,
  },
  secondaryButton: {
    borderRadius: Sizes.fixPadding * 1.5,
    borderWidth: 1,
    borderColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Sizes.fixPadding * 1.5,
  },
  secondaryButtonText: {
    ...Fonts.primaryColor18Bold,
  },
});
