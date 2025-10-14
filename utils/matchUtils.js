import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { icebreakers } from '../data/prompts';
import { allGames } from '../data/games';

export async function handleLike({
  currentUser,
  targetUser,
  firestore,
  router,
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
    if (router?.push) {
      router.push({
        pathname: '/premium/premiumScreen',
        params: { context: 'paywall' },
      });
    }
    return false;
  }

  setLikesUsed((prev) => prev + 1);
  showNotification(`You liked ${targetUser.displayName}`);

  const firestoreDb = firestore ?? db;

  if (currentUser?.uid && targetUser.id && !devMode && firestoreDb) {
    try {
      const likedRef = doc(
        firestoreDb,
        'likes',
        currentUser.uid,
        'liked',
        targetUser.id
      );
      await setDoc(likedRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const likedByRef = doc(
        firestoreDb,
        'likes',
        targetUser.id,
        'likedBy',
        currentUser.uid
      );
      await setDoc(likedByRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const reciprocalRef = doc(
        firestoreDb,
        'likes',
        targetUser.id,
        'liked',
        currentUser.uid
      );
      const reciprocal = await getDoc(reciprocalRef);

      if (reciprocal.exists()) {
        const [firstId, secondId] = [currentUser.uid, targetUser.id].sort();
        const matchesCollection = collection(firestoreDb, 'matches');
        const matchRef = doc(matchesCollection, `${firstId}_${secondId}`);
        const existingMatch = await getDoc(matchRef);

        if (!existingMatch.exists()) {
          const timestamp = serverTimestamp();
          await setDoc(matchRef, {
            users: [firstId, secondId],
            createdAt: timestamp,
            updatedAt: timestamp,
            matchedAt: timestamp,
          });
        } else {
          await updateDoc(matchRef, { updatedAt: serverTimestamp() });
        }

        addMatch({
          id: matchRef.id,
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
