import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { icebreakers } from '../data/prompts';
import { allGames } from '../data/games';

export async function handleLike({
  currentUser,
  targetUser,
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

  if (likesUsed >= MAX_LIKES && !isPremiumUser && !devMode) {
    navigation.navigate('PremiumPaywall', { context: 'paywall' });
    return false;
  }

  setLikesUsed((prev) => prev + 1);
  showNotification(`You liked ${targetUser.displayName}`);

  if (currentUser?.uid && targetUser.id && !devMode) {
    try {
      const likedRef = doc(
        collection(db, 'likes', currentUser.uid, 'liked'),
        targetUser.id
      );
      await setDoc(likedRef, { createdAt: serverTimestamp() });

      const likedByRef = doc(
        collection(db, 'likes', targetUser.id, 'likedBy'),
        currentUser.uid
      );
      await setDoc(likedByRef, { createdAt: serverTimestamp() });

      const reciprocalRef = doc(
        collection(db, 'likes', targetUser.id, 'liked'),
        currentUser.uid
      );
      const reciprocal = await getDoc(reciprocalRef);

      if (reciprocal.exists()) {
        const [firstUserId, secondUserId] = [
          currentUser.uid,
          targetUser.id,
        ].sort();
        const matchRef = doc(
          db,
          'matches',
          `${firstUserId}_${secondUserId}`
        );

        const matchTimestamp = serverTimestamp();
        await setDoc(
          matchRef,
          {
            users: [firstUserId, secondUserId],
            createdAt: matchTimestamp,
            updatedAt: matchTimestamp,
            matchedAt: matchTimestamp,
          },
          { merge: true }
        );

        addMatch({
          id: matchRef.id,
          displayName: targetUser.displayName,
          age: targetUser.age,
          image: targetUser.images[0],
          messages: [],
          matchedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
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
      matchedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
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
