import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { icebreakers } from '../data/prompts';
import { allGames } from '../data/games';

export async function handleLike({
  currentUser,
  targetUser,
  firestore: _legacyFirestore,
  navigation,
  likesUsed = 0,
  isPremiumUser = false,
  devMode = false,
  setLikesUsed = () => {},
  showNotification = () => {},
  addMatch = () => {},
  setMatchedUser = () => {},
  setMatchLine = () => {},
  setMatchGame = () => {},
  play = () => {},
  setShowFireworks = () => {},
  MAX_LIKES = 100,
}) {
  if (!targetUser) return false;

  void _legacyFirestore;

  if (likesUsed >= MAX_LIKES && !isPremiumUser && !devMode) {
    navigation.navigate('PremiumPaywall', { context: 'paywall' });
    return false;
  }

  setLikesUsed((prev) => prev + 1);
  showNotification(`You liked ${targetUser.displayName}`);

  if (currentUser?.uid && targetUser.id && !devMode) {
    try {
      const outgoingLikeRef = doc(db, 'likes', currentUser.uid, 'liked', targetUser.id);
      const incomingLikeRef = doc(db, 'likes', targetUser.id, 'likedBy', currentUser.uid);
      const reciprocalLikeRef = doc(db, 'likes', targetUser.id, 'liked', currentUser.uid);

      const now = serverTimestamp();
      await Promise.all([
        setDoc(outgoingLikeRef, { createdAt: now }, { merge: true }),
        setDoc(incomingLikeRef, { createdAt: now }, { merge: true }),
      ]);

      const reciprocal = await getDoc(reciprocalLikeRef);

      if (reciprocal.exists) {
        const matchDocRef = doc(collection(db, 'matches'));
        const createdAt = serverTimestamp();
        const updatedAt = serverTimestamp();
        const matchedAt = serverTimestamp();
        await setDoc(matchDocRef, {
          users: [currentUser.uid, targetUser.id],
          createdAt,
          updatedAt,
          matchedAt,
        });

        addMatch({
          id: matchDocRef.id,
          displayName: targetUser.displayName,
          age: targetUser.age,
          image: targetUser.images[0],
          messages: [],
          matchedAt: 'now',
          activeGameId: null,
          pendingInvite: null,
        });

        setMatchedUser(targetUser);
        setMatchLine(
          icebreakers[Math.floor(Math.random() * icebreakers.length)] || ''
        );
        setMatchGame(
          allGames[Math.floor(Math.random() * allGames.length)] || null
        );
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        play('match');
        Toast.show({ type: 'success', text1: "It's a match!" });
        showNotification("It's a match!");
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 2000);
        return true;
      }
    } catch (e) {
      console.warn('Failed to process like', e);
      return false;
    }
  } else if (devMode) {
    addMatch({
      id: targetUser.id,
      displayName: targetUser.displayName,
      age: targetUser.age,
      image: targetUser.images[0],
      messages: [],
      matchedAt: 'now',
      activeGameId: null,
      pendingInvite: null,
    });
    setMatchedUser(targetUser);
    setMatchLine(
      icebreakers[Math.floor(Math.random() * icebreakers.length)] || ''
    );
    setMatchGame(allGames[Math.floor(Math.random() * allGames.length)] || null);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
    play('match');
    Toast.show({ type: 'success', text1: "It's a match!" });
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 2000);
    return true;
  }

  return true;
}
