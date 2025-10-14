import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Fonts, Sizes, screenWidth } from '../../../constants/styles';
import { fetchLikedProfiles, likeUser } from '../../../services/userService';

const defaultUserImage = require('../../../assets/images/users/user1.png');

const ShortlistScreen = () => {
  const navigation = useNavigation();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('Removed from Shortlist');
  const [errorMessage, setErrorMessage] = useState(null);

  const getUserImageSource = useCallback((user) => {
    if (!user) return defaultUserImage;
    if (typeof user.image === 'number') return user.image;
    if (user.image) return { uri: user.image };
    if (user.photoURL) return { uri: user.photoURL };
    return defaultUserImage;
  }, []);

  const openProfileDetail = useCallback(
    (profile) => {
      if (!profile) return;
      navigation.push('profileDetail/profileDetailScreen', {
        userId: profile.id,
        user: profile,
      });
    },
    [navigation]
  );

  const loadProfiles = useCallback(
    async ({ showLoader = true, cancelRef } = {}) => {
      if (showLoader) setLoading(true);
      setErrorMessage(null);
      try {
        const result = await fetchLikedProfiles();
        if (cancelRef?.canceled) return;

        if (result.ok) {
          const nextProfiles = (result.data?.users ?? []).map((profile) => ({
            ...profile,
            isFavorite: true,
          }));
          setProfiles(nextProfiles);
        } else {
          setErrorMessage(result.error?.message ?? 'Failed to load shortlist.');
        }
      } catch (error) {
        console.error('Failed to load shortlist.', error);
        if (cancelRef?.canceled) return;
        setErrorMessage('Failed to load shortlist. Please try again later.');
      } finally {
        if (showLoader && !cancelRef?.canceled) {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const cancelRef = { canceled: false };
      loadProfiles({ showLoader: true, cancelRef });
      return () => {
        cancelRef.canceled = true;
      };
    }, [loadProfiles])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfiles({ showLoader: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadProfiles]);

  const handleRemove = useCallback(
    async ({ item, rowMap }) => {
      const targetId = item?.id;
      if (!targetId || removingId === targetId) return;

      if (rowMap?.[targetId]) {
        rowMap[targetId].closeRow();
      }

      setRemovingId(targetId);
      try {
        const result = await likeUser({ targetUserId: targetId, liked: false });
        if (!result.ok) {
          Alert.alert('Action failed', result.error?.message ?? 'Please try again later.');
          return;
        }

        setProfiles((prev) => prev.filter((profile) => profile.id !== targetId));
        setSnackbarMessage('Removed from Shortlist');
        setShowSnackBar(true);
      } catch (error) {
        console.error('Failed to remove shortlist entry.', error);
        Alert.alert('Action failed', 'Please try again later.');
      } finally {
        setRemovingId(null);
      }
    },
    [removingId]
  );

  const renderLoadingState = () => (
    <View style={styles.centerWrap}>
      <ActivityIndicator />
      <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
        Loading shortlist…
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerWrap}>
      <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center', marginBottom: Sizes.fixPadding }}>
        {errorMessage ?? 'Failed to load shortlist.'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => loadProfiles({ showLoader: true })}
        style={styles.retryButton}
      >
        <MaterialCommunityIcons name="refresh" size={24} color={Colors.whiteColor} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateWrap}>
      <View style={[styles.roundButtonStyle, { backgroundColor: Colors.grayColor }]}>
        <MaterialIcons name="favorite-border" size={25} color={Colors.whiteColor} />
      </View>
      <Text style={{ ...Fonts.grayColor18Medium, marginTop: Sizes.fixPadding }}>
        Nothing In Shortlist
      </Text>
      <Text
        style={{
          ...Fonts.grayColor14Regular,
          marginTop: Sizes.fixPadding,
          textAlign: 'center',
          marginHorizontal: Sizes.fixPadding * 3.0,
        }}
      >
        Tap the heart on a profile to add it to your shortlist.
      </Text>
    </View>
  );

  const renderItem = (data) => {
    const { item } = data;
    const subtitleParts = [
      item?.profession ?? item?.jobTitle ?? null,
      item?.distance ?? null,
      item?.address ?? null,
    ].filter(Boolean);

    return (
      <TouchableHighlight activeOpacity={0.9} style={{ backgroundColor: Colors.whiteColor }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openProfileDetail(item)}
          style={styles.shortlistDataWrapStyle}
        >
          <Image source={getUserImageSource(item)} style={styles.profileImageStyle} />
          <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0 }}>
            <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
              {item?.name ?? item?.displayName ?? 'Unknown'}
            </Text>
            {subtitleParts.length > 0 ? (
              <Text
                numberOfLines={1}
                style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 8.0 }}
              >
                {subtitleParts.join(' • ')}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </TouchableHighlight>
    );
  };

  const renderHiddenItem = (data, rowMap) => (
    <View style={styles.hiddenRowContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.backDeleteContinerStyle}
        onPress={() => handleRemove({ item: data.item, rowMap })}
        disabled={removingId === data.item.id}
      >
        <View
          style={[
            styles.roundButtonStyle,
            removingId === data.item.id && styles.disabledRoundButton,
          ]}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={24}
            color={Colors.whiteColor}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading && profiles.length === 0) return renderLoadingState();
    if (errorMessage && profiles.length === 0) return renderErrorState();
    if (!loading && profiles.length === 0) return renderEmptyState();

    return (
      <SwipeListView
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        rightOpenValue={-70}
        disableRightSwipe
        onRefresh={onRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Shortlisted</Text>
        <View style={{ flex: 1 }}>{renderContent()}</View>
      </View>
      <Snackbar
        style={styles.snackBarStyle}
        visible={showSnackBar}
        onDismiss={() => setShowSnackBar(false)}
      >
        <Text style={{ ...Fonts.whiteColor15Medium }}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
};

export default ShortlistScreen;

const styles = StyleSheet.create({
  headerTitle: {
    textAlign: 'center',
    margin: Sizes.fixPadding * 2.0,
    ...Fonts.blackColor18Bold,
  },
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
    alignItems: 'center',
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
  disabledRoundButton: {
    opacity: 0.5,
  },
  hiddenRowContainer: {
    alignItems: 'center',
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Sizes.fixPadding * 2.0,
  },
  emptyStateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Sizes.fixPadding * 2.0,
  },
  retryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
