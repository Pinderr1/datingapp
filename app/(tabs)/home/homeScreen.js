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
import React, { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, screenWidth, Sizes } from '../../../constants/styles';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import TinderCard from 'react-tinder-card';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSwipeCandidates, likeUser } from '../../../services/userService';

const HomeScreen = () => {
  const navigation = useNavigation();

  const [users, setUsers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [likingId, setLikingId] = useState(null);
  const [search, setSearch] = useState('');

  const searchFieldRef = useRef(null);
  const seenStateRef = useRef({ key: null, set: new Set() });
  const defaultUserImage = require('../../../assets/images/users/user1.png');

  const getTodayKey = () => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
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
        } catch (error) {
          console.error('Failed to parse seen candidates', error);
        }
      }
      seenStateRef.current = { key: todayKey, set: new Set(parsed) };
    } catch (error) {
      console.error('Failed to load seen candidates', error);
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
    } catch (error) {
      console.error('Failed to update seen candidates', error);
    }
  };

  const loadCandidates = async ({ reset = false } = {}) => {
    if (loading) return;
    setLoading(true);
    try {
      const seenState = await ensureSeenState();
      const result = await fetchSwipeCandidates({
        startAfter: reset ? null : nextCursor,
        limit: 20,
      });

      if (result.ok && result.data?.users) {
        const incoming = result.data.users.filter(
          (u) => u?.id && !seenState.set.has(u.id)
        );
        setUsers((prev) => (reset ? incoming : [...prev, ...incoming]));
        setNextCursor(result.data.nextCursor ?? null);
      } else if (!result.ok) {
        console.error('Failed to load users', result.error);
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
    markCandidateSeen(id).catch((e) =>
      console.error('Failed to persist seen candidate', e)
    );
  };

  const handleSwipe = async (direction, userId) => {
    if (!userId) return;
    const liked = direction === 'right';

    try {
      setLikingId(userId);
      const result = await likeUser({ targetUserId: userId, liked });

      if (!result.ok) {
        console.error('Failed to update like status', result.error);
        Alert.alert(
          'Action failed',
          result.error?.message ?? 'Please try again later.'
        );
      } else if (result.data?.match) {
        Alert.alert("It's a match!");
        // Navigate to chat (adjust route name if yours differs)
        const matchId = result.data.matchId;
        if (matchId) {
          navigation.push('message/messageScreen', { matchId });
        }
      }
    } finally {
      setLikingId(null);
      removeCard(userId);
      // If we’re low on cards and have a cursor, fetch more
      if (users.length < 4 && nextCursor) {
        loadCandidates();
      }
    }
  };

  const changeShortlist = ({ id }) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const getUserImageSource = (user) => {
    if (!user) return defaultUserImage;
    if (typeof user.image === 'number') return user.image;
    if (user.image) return { uri: user.image };
    if (user.photoURL) return { uri: user.photoURL };
    return defaultUserImage;
  };

  const usersInfo = () => {
    if (loading && users.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ ...Fonts.grayColor15Regular, marginTop: 8 }}>
            Loading profiles…
          </Text>
        </View>
      );
    }

    if (!loading && users.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...Fonts.grayColor15Regular, marginBottom: 12 }}>
            No more profiles right now.
          </Text>
          <TouchableOpacity
            onPress={() => loadCandidates({ reset: true })}
            style={styles.filterButtonStyle}
          >
            <MaterialCommunityIcons name="refresh" size={26} color={Colors.whiteColor} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={styles.imageBottomContainre1}>
          <View style={styles.imageBottomContainre2}>
            {users.length > 0 &&
              users.map((item) => (
                <View key={`${item.id}`} style={styles.tinderCardWrapper}>
                  <TinderCard
                    onSwipe={(direction) =>
                      likingId ? null : handleSwipe(direction, item.id)
                    }
                    onCardLeftScreen={() => {}}
                    preventSwipe={likingId === item.id ? ['left', 'right'] : []}
                  >
                    <ImageBackground
                      source={getUserImageSource(item)}
                      style={{ height: '100%', width: '100%' }}
                      resizeMode="cover"
                      borderRadius={Sizes.fixPadding * 3.0}
                    >
                      <LinearGradient
                        colors={[
                          'rgba(0, 0, 0, 0.58)',
                          'rgba(0, 0, 0, 0)',
                          'rgba(0, 0, 0, 0)',
                          'rgba(0, 0, 0, 0.58)',
                        ]}
                        style={{
                          flex: 1,
                          justifyContent: 'space-between',
                          borderRadius: Sizes.fixPadding * 3.0,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            margin: Sizes.fixPadding,
                          }}
                        >
                          <MaterialIcons
                            name="location-pin"
                            size={18}
                            color={Colors.whiteColor}
                          />
                          <Text
                            style={{
                              ...Fonts.whiteColor15Regular,
                              marginLeft: Sizes.fixPadding - 5.0,
                            }}
                          >
                            {item.address} • {item.distance}
                          </Text>
                        </View>

                        <View style={styles.userInfoWithOptionWrapper}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => (likingId ? null : handleSwipe('left', item.id))}
                            style={styles.closeAndShortlistIconWrapStyle}
                            disabled={likingId === item.id}
                          >
                            <MaterialIcons
                              name="close"
                              size={24}
                              color={Colors.primaryColor}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              navigation.push('profileDetail/profileDetailScreen');
                            }}
                            style={{
                              maxWidth: screenWidth - 190,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginHorizontal: Sizes.fixPadding,
                            }}
                          >
                            <Text numberOfLines={1} style={{ ...Fonts.whiteColor20Bold }}>
                              {item.name}, {item.age}
                            </Text>
                            <Text numberOfLines={1} style={{ ...Fonts.whiteColor15Regular }}>
                              {item.profession}
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
                  </TinderCard>
                </View>
              ))}
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
          // pull next page if available
          if (nextCursor && !loading) loadCandidates();
          else loadCandidates({ reset: true });
        }}
        style={styles.filterButtonStyle}
      >
        <MaterialCommunityIcons
          name="tune-variant"
          size={26}
          color={Colors.whiteColor}
        />
      </TouchableOpacity>
    </View>
  );

  const header = () => (
    <View
      style={{
        margin: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{ ...Fonts.grayColor15Regular, marginRight: Sizes.fixPadding - 5.0 }}
          >
            Location
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.primaryColor} />
        </View>
        <View
          style={{
            marginTop: Sizes.fixPadding - 5.0,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="location-pin" size={20} color={Colors.primaryColor} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              ...Fonts.blackColor18Bold,
              marginLeft: Sizes.fixPadding - 5.0,
            }}
          >
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <View style={{ flex: 1 }}>
        {header()}
        {searchInfo()}
        <View style={{ flex: 1 }}>{usersInfo()}</View>
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
  tinderCardWrapper: {
    height: '100%',
    alignSelf: 'center',
    width: screenWidth - 40,
    position: 'absolute',
  },
  userInfoWithOptionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Sizes.fixPadding + 8.0,
  },
});
