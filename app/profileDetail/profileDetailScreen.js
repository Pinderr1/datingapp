import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import CollapsibleToolbar from 'react-native-collapsible-toolbar';
import { Colors, Sizes, Fonts, screenHeight, screenWidth, CommonStyles } from '../../constants/styles';
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { fetchUserById, likeUser } from '../../services/userService';

const fallbackProfileImage = require('../../assets/images/users/user10.png');

const ProfileDetailScreen = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const rawUserId = params?.userId;
  const rawInitialProfile = params?.initialProfile;

  const userId = useMemo(() => {
    const value = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }, [rawUserId]);

  const parsedInitialProfile = useMemo(() => {
    const value = Array.isArray(rawInitialProfile) ? rawInitialProfile[0] : rawInitialProfile;
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (e) {
        console.warn('Failed to parse initial profile payload.', e);
        return null;
      }
    }
    if (typeof value === 'object') {
      return value;
    }
    return null;
  }, [rawInitialProfile]);

  const [profile, setProfile] = useState(() => {
    if (parsedInitialProfile) {
      return {
        ...parsedInitialProfile,
        id: parsedInitialProfile.id ?? userId,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!parsedInitialProfile);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(() =>
    typeof parsedInitialProfile?.isFavorite === 'boolean' ? parsedInitialProfile.isFavorite : false
  );
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (parsedInitialProfile) {
      setProfile((prev) => {
        const merged = {
          ...(prev ?? {}),
          ...parsedInitialProfile,
        };
        if (!merged.id && userId) merged.id = userId;
        return merged;
      });
      if (typeof parsedInitialProfile.isFavorite === 'boolean') {
        setIsFavorite(parsedInitialProfile.isFavorite);
      }
    }
  }, [parsedInitialProfile, userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      const result = await fetchUserById(userId);
      if (!active) return;
      if (result.ok) {
        setProfile((prev) => {
          const merged = {
            ...(prev ?? {}),
            ...(result.data ?? {}),
          };
          if (!merged.id && userId) merged.id = userId;
          return merged;
        });
        if (typeof result.data?.isFavorite === 'boolean') {
          setIsFavorite(result.data.isFavorite);
        }
      } else {
        setError(result.error?.message ?? 'Unable to load this profile.');
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const primaryImageSource = useMemo(() => {
    if (profile?.photoURL && typeof profile.photoURL === 'string') {
      return { uri: profile.photoURL };
    }
    if (typeof profile?.image === 'string') {
      return { uri: profile.image };
    }
    if (typeof profile?.image === 'number') {
      return profile.image;
    }
    if (Array.isArray(profile?.photos)) {
      const firstPhoto = profile.photos.find(
        (item) => typeof item === 'string' && item.trim().length > 0
      );
      if (firstPhoto) return { uri: firstPhoto };
    }
    if (Array.isArray(profile?.images)) {
      const firstImage = profile.images.find(
        (item) => typeof item === 'string' && item.trim().length > 0
      );
      if (firstImage) return { uri: firstImage };
    }
    return fallbackProfileImage;
  }, [profile]);

  const displayName = useMemo(() => {
    const maybeName = profile?.name ?? profile?.displayName ?? profile?.fullName;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) {
      return maybeName.trim();
    }
    return undefined;
  }, [profile]);

  const ageValue = useMemo(() => {
    const source = profile?.age ?? profile?.dobAge;
    if (typeof source === 'number' && Number.isFinite(source)) {
      return Math.round(source);
    }
    if (typeof source === 'string') {
      const parsed = parseInt(source, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
  }, [profile]);

  const professionLabel = useMemo(() => {
    const maybeProfession =
      profile?.profession ?? profile?.jobTitle ?? profile?.headline ?? profile?.occupation;
    if (typeof maybeProfession === 'string' && maybeProfession.trim().length > 0) {
      return maybeProfession.trim();
    }
    return undefined;
  }, [profile]);

  const locationLabel = useMemo(() => {
    const candidates = [];
    if (typeof profile?.location === 'string') candidates.push(profile.location);
    if (typeof profile?.address === 'string') candidates.push(profile.address);
    const cityState = [profile?.city, profile?.state ?? profile?.stateCode]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(', ');
    if (cityState.trim().length > 0) candidates.push(cityState);
    if (typeof profile?.country === 'string') candidates.push(profile.country);
    const resolved = candidates.find((value) => value && value.trim().length > 0);
    return resolved ? resolved.trim() : undefined;
  }, [profile]);

  const distanceLabel = useMemo(() => {
    const source = profile?.distance ?? profile?.distanceKm ?? profile?.distanceMiles;
    if (typeof source === 'string' && source.trim().length > 0) {
      return source.trim();
    }
    if (typeof source === 'number' && Number.isFinite(source)) {
      return `${source}km`;
    }
    return undefined;
  }, [profile]);

  const aboutParagraphs = useMemo(() => {
    const textSources = [profile?.bio, profile?.about, profile?.summary, profile?.description];
    const content = textSources.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (!content) return [];
    return content
      .split(/\n+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, [profile]);

  const compatibilityScore = useMemo(() => {
    const score = profile?.matchPercentage ?? profile?.compatibilityScore;
    if (typeof score === 'number' && Number.isFinite(score)) {
      return Math.round(score);
    }
    if (typeof score === 'string') {
      const parsed = parseInt(score, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
  }, [profile]);

  const firstName = useMemo(() => {
    if (!displayName) return undefined;
    const [first] = displayName.split(' ');
    return first;
  }, [displayName]);

  const handleToggleFavorite = async () => {
    if (!userId) {
      Alert.alert('Shortlist unavailable', 'We could not determine which profile to update.');
      return;
    }

    const nextValue = !isFavorite;
    setIsFavorite(nextValue);
    setShowSnackBar(true);
    setFavoriteLoading(true);

    const result = await likeUser({ targetUserId: userId, liked: nextValue });

    setFavoriteLoading(false);

    if (!result.ok) {
      setIsFavorite(!nextValue);
      Alert.alert(
        'Unable to update shortlist',
        result.error?.message ?? 'Please try again later.'
      );
      setShowSnackBar(true);
      return;
    }

    setProfile((prev) => (prev ? { ...prev, isFavorite: nextValue } : prev));
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
      <MyStatusBar />
      <CollapsibleToolbar
        renderContent={pageContent}
        renderNavBar={header}
        renderToolBar={profileImage}
        collapsedNavBarBackgroundColor={Colors.primaryColor}
        translucentStatusBar={false}
        toolBarHeight={screenHeight / 2.0}
        showsVerticalScrollIndicator={false}
      />
      {favoriteCloseAndChatButton()}
      {snackBarInfo()}
    </View>
  );

  function snackBarInfo() {
    return (
      <Snackbar
        style={styles.snackBarStyle}
        visible={showSnackBar}
        onDismiss={() => {
          setShowSnackBar(false);
        }}
      >
        <Text style={{ ...Fonts.whiteColor15Regular }}>
          {isFavorite ? 'Added To Shortlist' : 'Remove From Shortlist'}
        </Text>
      </Snackbar>
    );
  }

  function favoriteCloseAndChatButton() {
    return (
      <View style={styles.favoriteCloseAndChatButtonWrapStyle}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            navigation.pop();
          }}
          style={styles.bottomButtonStyle}
        >
          <MaterialIcons name="close" color={Colors.primaryColor} size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleFavorite}
          style={styles.favoriteIconWrapStyle}
          disabled={favoriteLoading}
        >
          {favoriteLoading ? (
            <ActivityIndicator color={Colors.whiteColor} />
          ) : (
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={26}
              color={Colors.whiteColor}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.bottomButtonStyle}
          onPress={() => {
            navigation.push('message/messageScreen');
          }}
        >
          <Image
            source={require('../../assets/images/icons/chat.png')}
            style={{ width: 22, height: 22.0, resizeMode: 'contain', tintColor: Colors.primaryColor }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  function profileImage() {
    return (
      <View>
        <Image source={primaryImageSource} style={styles.profileImageStyle} />
        {loading && (
          <View style={styles.profileImageLoadingOverlay}>
            <ActivityIndicator color={Colors.whiteColor} />
          </View>
        )}
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            navigation.pop();
          }}
          style={styles.headerIconWrapStyle}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.whiteColor} style={{ left: 2.0 }} />
        </TouchableOpacity>
        <MaterialIcons name="more-vert" size={24} color={Colors.whiteColor} onPress={() => {}} />
      </View>
    );
  }

  function pageContent() {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
        {userInfo()}
        {matchingInfo()}
      </View>
    );
  }

  function matchingInfo() {
    if (!profile && !loading) {
      return null;
    }

    const headline = (() => {
      if (firstName && typeof compatibilityScore === 'number') {
        return `You & ${firstName} have ${compatibilityScore}%\nmatching`;
      }
      if (firstName) {
        return `See how you and ${firstName}\nmatch up`;
      }
      return 'See how compatible you both are';
    })();

    const ctaLabel =
      typeof profile?.matchingCta === 'string' && profile.matchingCta.trim().length > 0
        ? profile.matchingCta.trim()
        : 'See more';

    return (
      <View style={styles.matchingInfoWrapStyle}>
        <View
          style={{
            flex: 1,
            justifyContent: 'space-between',
            paddingVertical: Sizes.fixPadding + 5.0,
          }}
        >
          <Text numberOfLines={2} style={{ lineHeight: 25.0, ...Fonts.whiteColor18Bold }}>
            {headline}
          </Text>
          <View style={{ marginTop: Sizes.fixPadding, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...Fonts.whiteColor15Regular, marginRight: Sizes.fixPadding - 5.0 }}>
              {ctaLabel}
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={15} color={Colors.whiteColor} />
          </View>
        </View>
        <Image
          source={require('../../assets/images/icons/goal.png')}
          style={{
            width: screenWidth / 3.5,
            height: '100%',
            resizeMode: 'stretch',
            transform: [{ rotate: '-10deg' }],
          }}
        />
      </View>
    );
  }

  function userInfo() {
    if (loading && !profile) {
      return (
        <View style={styles.infoLoadingWrap}>
          <ActivityIndicator color={Colors.primaryColor} />
          <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding }}>
            Loading profile…
          </Text>
        </View>
      );
    }

    if (!profile) {
      return (
        <View style={styles.infoLoadingWrap}>
          <Text style={{ ...Fonts.grayColor15Regular, textAlign: 'center' }}>
            {error ?? 'Profile details are unavailable.'}
          </Text>
        </View>
      );
    }

    const nameLine = [displayName, typeof ageValue === 'number' ? `${ageValue}` : undefined]
      .filter((item) => item !== undefined)
      .join(', ');

    const locationParts = [locationLabel, distanceLabel].filter(
      (item) => typeof item === 'string' && item.length > 0
    );

    return (
      <View style={{ margin: Sizes.fixPadding * 2.0 }}>
        <Text style={{ ...Fonts.blackColor20Bold }}>
          {nameLine.length > 0 ? nameLine : 'Profile'}
        </Text>
        {professionLabel ? (
          <Text
            style={{
              marginTop: Sizes.fixPadding - 5.0,
              ...Fonts.grayColor15Regular,
            }}
          >
            {professionLabel}
          </Text>
        ) : null}
        {aboutParagraphs.length > 0 ? (
          aboutParagraphs.map((item, index) => (
            <Text
              key={`${index}`}
              style={{
                marginTop: Sizes.fixPadding - 5.0,
                lineHeight: 21.0,
                ...Fonts.blackColor14Regular,
              }}
            >
              {item}
            </Text>
          ))
        ) : (
          <Text
            style={{
              marginTop: Sizes.fixPadding - 5.0,
              lineHeight: 21.0,
              ...Fonts.grayColor15Regular,
            }}
          >
            No bio available yet.
          </Text>
        )}
        {locationParts.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 2.0 }}>
            <MaterialIcons name="location-pin" size={18} color={Colors.blackColor} />
            <Text style={{ ...Fonts.blackColor15Regular, marginLeft: Sizes.fixPadding - 5.0 }}>
              {locationParts.join(' • ')}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
};

export default ProfileDetailScreen

const styles = StyleSheet.create({
    headerIconWrapStyle: {
        width: 40.0,
        height: 40.0,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerWrapStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Platform.OS == 'ios' ? -5 : Sizes.fixPadding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    matchingInfoWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryColor,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        elevation: 2.0,
        shadowColor: Colors.primaryColor,
        marginBottom: Sizes.fixPadding * 2.0,
        paddingHorizontal: Sizes.fixPadding + 5.0,
        marginVertical: Sizes.fixPadding,
    },
    bottomButtonStyle: {
        width: 43.0,
        height: 43.0,
        borderRadius: 21.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.bgColor
    },
    favoriteIconWrapStyle: {
        width: 55.0,
        height: 55.0,
        borderRadius: 27.5,
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3.0,
        ...CommonStyles.buttonShadow
    },
    favoriteCloseAndChatButtonWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        margin: Sizes.fixPadding * 2.0,
    },
    profileImageStyle: {
        height: screenHeight / 2.0,
        width: '100%',
        borderBottomLeftRadius: Sizes.fixPadding * 3.0,
        borderBottomRightRadius: Sizes.fixPadding * 3.0,
    },
    profileImageLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderBottomLeftRadius: Sizes.fixPadding * 3.0,
        borderBottomRightRadius: Sizes.fixPadding * 3.0,
    },
    infoLoadingWrap: {
        margin: Sizes.fixPadding * 2.0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    snackBarStyle: {
        backgroundColor: Colors.grayColor,
        position: 'absolute',
        bottom: -10.0,
        left: -10.0,
        right: -10.0,
    }
})