import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { Colors, Fonts, Sizes, screenWidth } from '../../../constants/styles';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { fetchLikedProfiles, likeUser } from '../../../services/userService';

const defaultUserImage = require('../../../assets/images/users/user1.png');

const ShortlistScreen = () => {
  const navigation = useNavigation();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const rowSwipeAnimatedValues = useRef({});

  const ensureAnimatedValue = useCallback((key) => {
    if (!key) return new Animated.Value(0);
    if (!rowSwipeAnimatedValues.current[key]) {
      rowSwipeAnimatedValues.current[key] = new Animated.Value(0);
    }
    return rowSwipeAnimatedValues.current[key];
  }, []);

  const getUserImageSource = useCallback((user) => {
    if (!user) return defaultUserImage;
    if (typeof user.image === 'number') return user.image;
    if (user.image) return { uri: user.image };
    if (user.photoURL) return { uri: user.photoURL };
    return defaultUserImage;
  }, []);

  const loadShortlist = useCallback(async ({ isActiveRef, skipLoadingState = false } = {}) => {
    const isActive = () => !isActiveRef || isActiveRef.current !== false;

    if (!skipLoadingState) setLoading(true);
    try {
      const result = await fetchLikedProfiles();
      if (!isActive()) return;

      if (!result.ok) {
        Alert.alert(
          'Unable to load shortlist',
          result.error?.message ?? 'Please try again later.'
        );
        setProfiles([]);
        return;
      }

      const fetchedProfiles = Array.isArray(result.data?.profiles)
        ? result.data.profiles.filter((profile) => profile?.id)
        : [];
      setProfiles(fetchedProfiles);
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const activeRef = { current: true };
      loadShortlist({ isActiveRef: activeRef });
      return () => {
        activeRef.current = false;
      };
    }, [loadShortlist])
  );

  useEffect(() => {
    const existing = rowSwipeAnimatedValues.current;
    const nextValues = {};
    profiles.forEach((profile) => {
      if (!profile?.id) return;
      nextValues[profile.id] = existing[profile.id] ?? new Animated.Value(0);
    });
    rowSwipeAnimatedValues.current = nextValues;
  }, [profiles]);

  const closeRow = (rowMap, rowKey) => {
    if (rowMap[rowKey]) {
      rowMap[rowKey].closeRow();
    }
  };

  const deleteRow = async (rowMap, rowKey) => {
    closeRow(rowMap, rowKey);
    if (!rowKey) return;

    setRemovingId(rowKey);
    try {
      const result = await likeUser({ targetUserId: rowKey, liked: false });
      if (!result.ok) {
        Alert.alert('Unable to update shortlist', result.error?.message ?? 'Please try again later.');
        return;
      }

      setProfiles((prev) => prev.filter((item) => item.id !== rowKey));
      setShowSnackBar(true);
    } finally {
      setRemovingId(null);
    }
  };

  const onSwipeValueChange = (swipeData) => {
    const { key, value } = swipeData;
    ensureAnimatedValue(key).setValue(Math.abs(value));
  };

  const renderItem = (data) => (
    <TouchableHighlight activeOpacity={0.9} style={{ backgroundColor: Colors.whiteColor }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!data?.item?.id) return;
          navigation.push('profileDetail/profileDetailScreen', {
            userId: data.item.id,
            initialProfile: JSON.stringify({ ...data.item, id: data.item.id }),
          });
        }}
        key={`${data.item.id}`}
        style={styles.shortlistDataWrapStyle}
      >
        <Image source={getUserImageSource(data.item)} style={styles.profileImageStyle} />
        <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0 }}>
          <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
            {data.item.name ?? data.item.displayName ?? 'Someone'}
          </Text>
          <Text
            numberOfLines={1}
            style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 8.0 }}
          >
            {data.item.profession ?? ''}
            {data.item.distance ? ` • ${data.item.distance}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    </TouchableHighlight>
  );

  const renderHiddenItem = (data, rowMap) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.backDeleteContinerStyle}
        onPress={() => deleteRow(rowMap, data.item.id)}
        disabled={removingId === data.item.id}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: ensureAnimatedValue(data.item.id).interpolate({
                  inputRange: [45, 70],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        >
          <View style={styles.roundButtonStyle}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={24}
              color={Colors.whiteColor}
              style={{ alignSelf: 'center' }}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );

  const shortlistDataInfo = () => {
    if (loading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator />
          <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
            Loading shortlist…
          </Text>
        </View>
      );
    }

    if (profiles.length === 0) {
      return noDataInfo();
    }

    return (
      <SwipeListView
        data={profiles.map((item) => ({ ...item, key: item.id }))}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        rightOpenValue={-70}
        onSwipeValueChange={onSwipeValueChange}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const noDataInfo = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ ...styles.roundButtonStyle, backgroundColor: Colors.grayColor }}>
        <MaterialIcons name="favorite-border" size={25} color={Colors.whiteColor} />
      </View>
      <Text style={{ ...Fonts.grayColor18Medium, marginTop: Sizes.fixPadding + 5.0 }}>
        Nothing In Shortlist
      </Text>
    </View>
  );

  const header = () => (
    <Text style={{ textAlign: 'center', margin: Sizes.fixPadding * 2.0, ...Fonts.blackColor18Bold }}>
      Shortlisted
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <View style={{ flex: 1 }}>
        {header()}
        {shortlistDataInfo()}
      </View>
      <Snackbar style={styles.snackBarStyle} visible={showSnackBar} onDismiss={() => setShowSnackBar(false)}>
        <Text style={{ ...Fonts.whiteColor15Medium }}>Removed from Shortlist</Text>
      </Snackbar>
    </View>
  );
};

export default ShortlistScreen;

const styles = StyleSheet.create({
  shortlistDataWrapStyle: {
    backgroundColor: Colors.bgColor,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Sizes.fixPadding + 5.0,
    borderRadius: Sizes.fixPadding,
    marginBottom: Sizes.fixPadding * 2.0,
    marginHorizontal: Sizes.fixPadding * 2.0,
  },
  profileImageStyle: {
    width: screenWidth / 6.0,
    height: screenWidth / 6.0,
    borderRadius: Sizes.fixPadding,
  },
  snackBarStyle: {
    position: 'absolute',
    bottom: -10.0,
    left: -10.0,
    right: -10.0,
    backgroundColor: Colors.grayColor,
  },
  backDeleteContinerStyle: {
    bottom: 10,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 70,
    right: 0,
  },
  roundButtonStyle: {
    width: 50.0,
    height: 50.0,
    borderRadius: 25.0,
    backgroundColor: Colors.primaryColor,
    elevation: 2.0,
    shadowColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
