import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Easing,
} from 'react-native';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import GradientBackground from '../../components/GradientBackground';
import Header from '../../components/Header';
import ScreenContainer from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useDev } from '../../contexts/DevContext';
import { useGameLimit } from '../../contexts/GameLimitContext';
import { HEADER_SPACING } from '../../layout';
import { useUser } from '../../contexts/UserContext';
import { db } from '../../firebaseConfig';
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import getGlobalStyles from '../../styles';
import { games } from '../../games/registry';
import SyncedGame from '../../components/SyncedGame';
import GameOverModal from '../../components/GameOverModal';
import GameContainer from '../../components/GameContainer';
import { useMatchmaking } from '../../contexts/MatchmakingContext';
import { snapshotExists } from '../../utils/firestore';
import { createMatchIfMissing } from '../../utils/matchUtils';
import Toast from 'react-native-toast-message';
import { bots, getRandomBot } from '../../ai/bots';
import { generateReply } from '../../ai/chatBot';
import useBotGame from '../../hooks/useBotGame';
import { getBotMove } from '../../ai/botMoves';
import SafeKeyboardView from '../../components/SafeKeyboardView';
import Loader from '../../components/Loader';
import { useSound } from '../../contexts/SoundContext';
import EmptyState from '../../components/EmptyState';
import useGameSession from '../../hooks/useGameSession';
import { logGameStats } from '../../utils/gameStats';
import useRequireGameCredits from '../../hooks/useRequireGameCredits';
import useDebouncedCallback from '../../hooks/useDebouncedCallback';
import PlayerInfoBar from '../../components/PlayerInfoBar';
import useUserProfile from '../../hooks/useUserProfile';
import PropTypes from 'prop-types';
import { computeBadges } from '../../utils/badges';
import { Colors, Fonts, Sizes } from '../../constants/styles';
const toSingleValue = (value) =>
  Array.isArray(value) ? value[0] : value;

const parseMaybeJson = (value) => {
  const raw = toSingleValue(value);
  if (typeof raw !== 'string') return raw;
  if (!raw.length) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const useResolvedSearchParams = () => {
  const local = useLocalSearchParams();
  const global = useGlobalSearchParams();

  return useMemo(() => {
    const combined = { ...global, ...local };
    return {
      ...combined,
      botId: toSingleValue(combined.botId),
      inviteId: toSingleValue(combined.inviteId),
      sessionId: toSingleValue(combined.sessionId),
      sessionType: toSingleValue(combined.sessionType),
      status: toSingleValue(combined.status),
      game:
        combined.game !== undefined ? parseMaybeJson(combined.game) : undefined,
      opponent:
        combined.opponent !== undefined
          ? parseMaybeJson(combined.opponent)
          : undefined,
      players:
        combined.players !== undefined
          ? parseMaybeJson(combined.players)
          : undefined,
    };
  }, [global, local]);
};

const GameSessionScreen = ({ sessionType }) => {
  const router = useRouter();
  const params = useResolvedSearchParams();
  const type = sessionType || params.sessionType || (params.botId ? 'bot' : 'live');

  if (type === 'bot') {
    return <BotSessionScreen params={params} />;
  }
  if (type === 'spectator') {
    return <SpectatorSessionScreen params={params} />;
  }
  return <LiveSessionScreen params={params} router={router} />;
};


const LiveSessionScreen = ({ params, router }) => {
  const { darkMode, theme } = useTheme();
  const globalStyles = getGlobalStyles(theme);
  const local = createStyles(theme);
  const { devMode } = useDev();
  const { gamesLeft, recordGamePlayed } = useGameLimit();
  const { user, addGameXP } = useUser();
  const isPremiumUser = !!user?.isPremium;
  const requireCredits = useRequireGameCredits();
  const { sendGameInvite, cancelInvite } = useMatchmaking();

  const game = params?.game;
  const opponent = params?.opponent;
  const status = params?.status || 'waiting';
  const inviteId = params?.inviteId;

  const [inviteStatus, setInviteStatus] = useState(status);
  const [inviteData, setInviteData] = useState(null);
  const [readyUpdateSent, setReadyUpdateSent] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [devPlayer, setDevPlayer] = useState('0');
  const [gameResult, setGameResult] = useState(null);
  const gameActive = showGame && !gameResult;

  const GameComponent = game?.id ? games[game.id]?.Client : null;
  const isReady = devMode || inviteStatus === 'ready';
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [showFallback, setShowFallback] = useState(false);
  const opponentProfile = useUserProfile(opponent?.id);

  useEffect(() => {
    setInviteStatus(status);
    setInviteData(null);
    setReadyUpdateSent(false);
    setShowGame(false);
    setCountdown(null);
    setGameResult(null);
    setShowFallback(false);
  }, [inviteId, status, game?.id, opponent?.id]);

  const userBadges = computeBadges({
    xp: user?.xp,
    streak: user?.streak,
    badges: user?.badges || [],
    isPremium: user?.isPremium,
  });
  const oppBadges = computeBadges({
    xp: opponentProfile?.xp,
    streak: opponentProfile?.streak,
    badges: opponentProfile?.badges || [],
    isPremium: opponentProfile?.isPremium,
  });

  // Listen for Firestore invite status
  useEffect(() => {
    if (!inviteId || !user?.uid) return undefined;
    const ref = doc(db, 'games', inviteId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snapshotExists(snap)) {
        setInviteData(null);
        return;
      }
      const data = snap.data();
      const participants = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.players)
        ? data.players
        : [];
      if (participants.includes(user.uid)) {
        setInviteStatus(data?.status || 'waiting');
        setInviteData({ id: snap.id, ...data });
      } else {
        setInviteData(null);
      }
    });
    return unsub;
  }, [inviteId, user?.uid]);

  useEffect(() => {
    if (!inviteId || !user?.uid) return undefined;
    const ref = doc(db, 'games', inviteId);

    updateDoc(ref, { joinedPlayers: arrayUnion(user.uid) }).catch((error) => {
      console.warn('Failed to register session presence', error);
    });

    return () => {
      updateDoc(ref, { joinedPlayers: arrayRemove(user.uid) }).catch((error) => {
        console.warn('Failed to clear session presence', error);
      });
    };
  }, [inviteId, user?.uid]);

  useEffect(() => {
    if (!inviteId || !user?.uid || readyUpdateSent) return;
    if (!inviteData || inviteData.status !== 'waiting') return;

    const joinedPlayers = Array.isArray(inviteData.joinedPlayers)
      ? inviteData.joinedPlayers.filter(Boolean)
      : [];
    const uniquePlayers = joinedPlayers.filter(
      (player, index, arr) => arr.indexOf(player) === index
    );
    const opponentId = opponent?.id;

    if (!opponentId) return;
    if (
      !uniquePlayers.includes(user.uid) ||
      !uniquePlayers.includes(opponentId) ||
      uniquePlayers.length < 2
    ) {
      return;
    }

    const readyPlayers = [user.uid, opponentId];
    const uniqueReadyPlayers = readyPlayers.filter(
      (player, index, arr) => arr.indexOf(player) === index
    );

    const now = serverTimestamp();
    const payload = {
      status: 'ready',
      readyAt: now,
      updatedAt: now,
      players: uniqueReadyPlayers,
    };

    if (Array.isArray(inviteData.users) && inviteData.users.length) {
      payload.users = inviteData.users.filter(Boolean);
    } else {
      payload.users = uniqueReadyPlayers;
    }

    setReadyUpdateSent(true);
    updateDoc(doc(db, 'games', inviteId), payload).catch((error) => {
      console.warn('Failed to mark game invite ready', error);
      setReadyUpdateSent(false);
    });
  }, [inviteId, inviteData, opponent?.id, readyUpdateSent, user?.uid]);

  // Trigger countdown if ready
  useEffect(() => {
    if (isReady && !showGame && countdown === null && !devMode) {
      setCountdown(3);
    }
  }, [isReady]);

  useEffect(() => {
    if (countdown !== null) {
      scaleAnim.setValue(1.5);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [countdown]);

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: showGame ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [showGame, overlayOpacity]);

  // Show fallback if waiting too long or invite is cancelled/declined
  useEffect(() => {
    if (devMode || showGame) return;
    if (inviteStatus === 'cancelled' || inviteStatus === 'declined') {
      setShowFallback(true);
      return;
    }
    if (inviteStatus !== 'ready') {
      const t = setTimeout(() => setShowFallback(true), 20000);
      return () => clearTimeout(t);
    }
  }, [inviteStatus, showGame, devMode]);

  // Countdown logic
  useEffect(() => {
    if (countdown === null) return;
    const handleStart = async () => {
      try {
        if (!requireCredits()) return;
        setShowGame(true);
        setCountdown(null);
        recordGamePlayed();
        if (opponent?.id && user?.uid) {
          await createMatchIfMissing(user.uid, opponent.id);
        }
        if (inviteId && user?.uid) {
          const ref = doc(db, 'games', inviteId);
          const snap = await getDoc(ref);
          if (!snapshotExists(snap)) return;
          const data = snap.data();
          const participants = Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.players)
            ? data.players
            : [];
          if (participants.includes(user.uid)) {
            const now = serverTimestamp();
            const updates = {
              status: 'active',
              startedAt: now,
              updatedAt: now,
            };
            if (!Array.isArray(data?.users) || data.users.length === 0) {
              const resolved = [user.uid, opponent?.id].filter(Boolean);
              if (resolved.length) updates.users = resolved;
            }
            if (!data?.createdAt) {
              updates.createdAt = now;
            }
            if (!Object.prototype.hasOwnProperty.call(data || {}, 'matchedAt')) {
              updates.matchedAt = now;
            }
            if (!Object.prototype.hasOwnProperty.call(data || {}, 'lastMessage')) {
              updates.lastMessage = null;
            }
            await updateDoc(ref, updates);
          }
        }
      } catch (e) {
        console.warn('Failed to start game', e);
      }
    };

    if (countdown <= 0) {
      handleStart();
    } else {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown, inviteId, user?.uid]);

  const handleGameEnd = (result) => {
    if (result) {
      addGameXP();
      if (inviteId) logGameStats(inviteId);
    }
    setGameResult(result);
  };

  const handleRematch = async () => {
    try {
      if (!requireCredits()) return;
      if (inviteId && user?.uid) {
        const ref = doc(db, 'games', inviteId);
        const snap = await getDoc(ref);
        if (snapshotExists(snap)) {
          const data = snap.data();
          const participants = Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.players)
            ? data.players
            : [];
          if (participants.includes(user.uid)) {
            const now = serverTimestamp();
            const updates = {
              status: 'finished',
              endedAt: now,
              updatedAt: now,
              archived: true,
              archivedAt: now,
            };
            if (!Array.isArray(data?.users) || data.users.length === 0) {
              const resolved = [user.uid, opponent?.id].filter(Boolean);
              if (resolved.length) updates.users = resolved;
            }
            if (!data?.createdAt) {
              updates.createdAt = now;
            }
            if (!Object.prototype.hasOwnProperty.call(data || {}, 'matchedAt')) {
              updates.matchedAt = now;
            }
            if (!Object.prototype.hasOwnProperty.call(data || {}, 'lastMessage')) {
              updates.lastMessage = null;
            }
            await updateDoc(ref, updates);
          }
        }
      }

      const newId = await sendGameInvite(opponent.id, game.id);
      Toast.show({ type: 'success', text1: 'Invite sent!' });
      setGameResult(null);
      router.replace({
        pathname: '/games/GameSessionScreen',
        params: {
          ...(game ? { game: JSON.stringify(game) } : {}),
          ...(opponent ? { opponent: JSON.stringify(opponent) } : {}),
          inviteId: newId,
          status: devMode ? 'ready' : 'waiting',
        },
      });
    } catch (e) {
      console.warn('Failed to start rematch', e);
    }
  };

  const [debouncedRematch, rematchWaiting] = useDebouncedCallback(handleRematch, 800);

  const handleCancel = async () => {
    try {
      if (inviteId) await cancelInvite(inviteId);
    } catch (e) {
      console.warn('Failed to cancel invite', e);
    }
    router.back();
  };

  if (!game || !opponent) {
    return (
      <GradientBackground style={globalStyles.swipeScreen}>
        <Header showLogoOnly />
        <Text style={[local.invalidMessage, { color: theme.text }]}>Invalid game data.</Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={globalStyles.swipeScreen}>
      <Header showLogoOnly />

      <View style={local.playerRow}>
        <PlayerInfoBar
          name="You"
          xp={user?.xp || 0}
          badges={userBadges}
          isPremium={user?.isPremium}
        />
        <PlayerInfoBar
          name={opponent.displayName}
          xp={opponentProfile?.xp || 0}
          badges={oppBadges}
          isPremium={opponentProfile?.isPremium}
        />
      </View>

      <View style={local.centerContainer}>
        {GameComponent && gameActive && (
          <View style={local.centerContent}>
            {devMode ? (
              <>
                <View style={local.devControls}>
                  <TouchableOpacity
                    onPress={() => setDevPlayer('0')}
                    style={[
                      local.devButton,
                      local.devButtonSpacing,
                      devPlayer === '0' ? local.devButtonActive : null,
                    ]}
                  >
                    <Text style={local.devButtonText}>Player 1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDevPlayer('1')}
                    style={[
                      local.devButton,
                      devPlayer === '1' ? local.devButtonActive : null,
                    ]}
                  >
                    <Text style={local.devButtonText}>Player 2</Text>
                  </TouchableOpacity>
                </View>
                <GameContainer
                  player={{ name: 'You', xp: user?.xp }}
                  opponent={{ name: 'Opponent' }}
                >
                  <GameComponent playerID={devPlayer} matchID="dev" />
                </GameContainer>
              </>
            ) : (
              <SyncedGame
                sessionId={inviteId}
                gameId={game.id}
                opponent={{ id: opponent.id, photo: opponent.photo, online: true }}
                onGameEnd={handleGameEnd}
              />
            )}
          </View>
        )}
        {!showGame && (
          <Animated.View style={[local.overlay, { opacity: overlayOpacity }]}>
            {countdown === null ? (
              showFallback ? (
                <>
                  <Text style={[local.waitText, { color: theme.text }]}>Game didn't start.</Text>
                  <TouchableOpacity onPress={() => router.push('/games/GameWithBotScreen')}>
                    <Text style={local.accentLink}>Play with an AI bot instead</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancel}>
                    <Text style={local.accentLink}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[local.waitText, { color: theme.text }]}>Waiting for opponent...</Text>
                  <Loader size="small" style={local.loaderSpacing} />
                  <TouchableOpacity onPress={() => router.push('/games/GameWithBotScreen')}>
                    <Text style={local.accentLink}>Play with an AI bot instead</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              <Animated.Text style={[local.countText, { transform: [{ scale: scaleAnim }] }]}>{countdown}</Animated.Text>
            )}
          </Animated.View>
        )}
      </View>

      {/* Game Over Modal */}
      <GameOverModal
        visible={!!gameResult}
        winnerName={
          gameResult?.winner === '0'
            ? 'You'
            : gameResult?.winner === '1'
            ? opponent.displayName
            : null
        }
        winnerAvatar={
          gameResult?.winner === '0'
            ? user.photoURL
            : gameResult?.winner === '1'
            ? opponent.photo
            : null
        }
        winnerId={
          gameResult?.winner === '0'
            ? user.uid
            : gameResult?.winner === '1'
            ? opponent.id
            : null
        }
        onRematch={debouncedRematch}
        rematchDisabled={rematchWaiting}
        onExit={() => router.back()}
      />
    </GradientBackground>
  );
};


function BotSessionScreen({ params }) {
  const botId = params?.botId;
  const initialGame = params?.game || 'ticTacToe';
  const normalizedInitialGame = initialGame;
  const [bot, setBot] = useState(
    bots.find((b) => b.id === botId) || getRandomBot()
  );
  const { theme } = useTheme();
  const botStyles = getBotStyles(theme);
  const { user } = useUser();
  const { play } = useSound();
  const [game, setGame] = useState(normalizedInitialGame);
  const gameMap = Object.keys(games).reduce((acc, key) => {
    const info = games[key];
    acc[key] = {
      title: info.meta?.title || info.name,
      board: info.Board,
      state: useBotGame(
        info.Game,
        (G, ctx, gameObj) => getBotMove(key, G, ctx.currentPlayer, gameObj),
        (res) => handleGameEnd(res, key)
      ),
    };
    return acc;
  }, {});

  const fallbackKey = gameMap[normalizedInitialGame] ? normalizedInitialGame : 'ticTacToe';
  const activeKey = gameMap[game] ? game : fallbackKey;
  if (!gameMap[game]) console.warn('Unknown game key', game);
  const { G, ctx, moves, reset } = gameMap[activeKey].state;
  const BoardComponent = gameMap[activeKey].board;
  const title = gameMap[activeKey].title;

  const [gameOver, setGameOver] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'start', sender: bot.name, text: `Hi! I'm ${bot.name}. Let's play!` },
  ]);
  const [text, setText] = useState('');
  const [showBoard, setShowBoard] = useState(true);

  function handleGameEnd(res, gameId) {
    if (gameId !== game || !res) return;
    let msg = 'Draw.';
    if (res.winner === '0') msg = 'You win!';
    else if (res.winner === '1') msg = `${bot.name} wins.`;
    setGameOver(true);
    addSystemMessage(`Game over. ${msg}`);
  }

  const addSystemMessage = (t) =>
    setMessages((m) => [{ id: Date.now().toString(), sender: 'system', text: t }, ...m]);

  const sendMessage = (t) => {
    setMessages((m) => [
      { id: Date.now().toString(), sender: 'you', text: t },
      ...m,
    ]);
    const reply = generateReply(bot.personality);
    setTimeout(
      () =>
        setMessages((m) => [
          { id: Date.now().toString(), sender: bot.name, text: reply },
          ...m,
        ]),
      600
    );
  };

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(t);
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    play('message');
  };

  const [debouncedSend, sending] = useDebouncedCallback(handleSend, 800);

  const playAgain = () => {
    reset();
    setGameOver(false);
  };

  const switchBot = () => {
    const newBot = getRandomBot();
    setBot(newBot);
    setMessages((m) => [
      {
        id: Date.now().toString(),
        sender: newBot.name,
        text: `Hi! I'm ${newBot.name}. Let's play!`,
      },
      ...m,
    ]);
    reset();
    setGameOver(false);
  };

  const switchGame = (g) => {
    if (!gameMap[g]) {
      console.warn('Unknown game key', g);
      return;
    }
    if (g === game) return;
    setGame(g);
    gameMap[g].state.reset();
    setGameOver(false);
    addSystemMessage(`Switched to ${gameMap[g].title}.`);
  };

  const renderMessage = ({ item }) => {
    if (item.sender === 'system') {
      return (
        <View style={[botStyles.messageRow, botStyles.rowCenter]}>
          <View style={[botStyles.message, botStyles.system]}>
            <Text style={botStyles.sender}>System</Text>
            <Text style={botStyles.text}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const isUser = item.sender === 'you';
    return (
      <View
        style={[
          botStyles.messageRow,
          isUser ? botStyles.rowRight : botStyles.rowLeft,
        ]}
      >
        {!isUser && <Image source={bot.image} style={botStyles.avatar} />}
        <View
          style={[
            botStyles.message,
            isUser ? botStyles.right : botStyles.left,
          ]}
        >
          <Text style={botStyles.sender}>{isUser ? 'You' : bot.name}</Text>
          <Text style={botStyles.text}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <GradientBackground style={botStyles.fullFlex}>
      <Header />
      <View style={botStyles.headerRow}>
        <PlayerInfoBar
          name="You"
          xp={user?.xp || 0}
          badges={computeBadges({
            xp: user?.xp,
            streak: user?.streak,
            badges: user?.badges || [],
            isPremium: user?.isPremium,
          })}
          isPremium={user?.isPremium}
        />
        <PlayerInfoBar name={bot.name} xp={0} badges={[]} />
      </View>
      <KeyboardAvoidingView
        style={botStyles.fullFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScreenContainer style={botStyles.screenContainer}>
          <View style={botStyles.gameTabs}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {Object.entries(gameMap).map(([key, val]) => (
              <TouchableOpacity
                key={key}
                style={[botStyles.tab, game === key ? botStyles.tabActive : null]}
                onPress={() => switchGame(key)}
              >
                <Text style={botStyles.tabText}>{val.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
          <Text style={[botStyles.heading, { color: theme.text }]}>Playing {title} with {bot.name}</Text>
          <View style={botStyles.flex}>
            <View style={botStyles.flex}>
              {showBoard && !gameOver ? (
                <GameContainer
                  onToggleChat={() => setShowBoard(false)}
                  player={{ name: 'You', xp: user?.xp }}
                  opponent={{ name: bot.name }}
                >
                  <View style={botStyles.boardWrapper}>
                    <BoardComponent
                      G={G}
                      ctx={ctx}
                      moves={moves}
                      playerID="0"
                      onGameEnd={(res) => handleGameEnd(res, game)}
                    />
                  </View>
                  <TouchableOpacity style={botStyles.resetBtn} onPress={reset}>
                    <Text style={botStyles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                </GameContainer>
              ) : !gameOver ? (
                <TouchableOpacity
                  style={botStyles.showBtn}
                  onPress={() => setShowBoard(true)}
                >
                  <Text style={botStyles.showBtnText}>Show Game</Text>
                </TouchableOpacity>
              ) : null}
              {gameOver && (
                <View style={botStyles.overButtons}>
                  <TouchableOpacity style={botStyles.againBtn} onPress={playAgain}>
                    <Text style={botStyles.primaryButtonText}>Play Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={botStyles.newBotBtn} onPress={switchBot}>
                    <Text style={botStyles.newBotBtnText}>New Bot</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={botStyles.messageSection}>
              <FlatList
                style={botStyles.messageList}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={botStyles.messageListContent}
                ListEmptyComponent={
                  <EmptyState
                    text="No messages yet."
                    image={require('../../assets/logo.png')}
                  />
                }
              />
              <SafeKeyboardView>
                <View style={botStyles.inputBar}>
                  <TextInput
                    style={botStyles.input}
                    placeholder="Type a message..."
                    value={text}
                    onChangeText={setText}
                  />
                  <TouchableOpacity
                    style={[botStyles.sendBtn, sending && botStyles.disabledButton]}
                    onPress={debouncedSend}
                    disabled={sending}
                  >
                    <Text style={botStyles.primaryButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </SafeKeyboardView>
            </View>
          </View>
        </ScreenContainer>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

function SpectatorSessionScreen({ params }) {
  const { theme } = useTheme();
  const styles = getSpectatorStyles(theme);
  const anim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef();
  const sessionId = params?.sessionId;
  const game = params?.game;
  const players = params?.players || [];
  const { moveHistory, ctx, loading } = useGameSession(sessionId, game?.id, '');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [moveHistory]);

  return (
    <GradientBackground style={styles.fullFlex}>
      <Header showLogoOnly />
      <ScreenContainer style={styles.screenContainer}>
        {loading && (
          <Animated.Text style={[styles.waiting, { opacity: anim }]}>Waiting for Players...</Animated.Text>
        )}
        <View style={styles.playerRow}>
          {players.map((p) => (
            <View key={p.id} style={styles.player}>
              <Image
                source={p.photo ? { uri: p.photo } : require('../../assets/logo.png')}
                style={styles.avatar}
              />
              <Text style={styles.playerName}>{p.displayName}</Text>
            </View>
          ))}
        </View>
        <View style={styles.logBox}>
          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
            {moveHistory.map((m, idx) => (
              <Text key={idx} style={styles.logText}>
                Player {Number(m.player) + 1}: {m.action}
              </Text>
            ))}
          </ScrollView>
        </View>
      </ScreenContainer>
    </GradientBackground>
  );
}

const getSpectatorStyles = (theme) =>
  StyleSheet.create({
    fullFlex: { flex: 1 },
    screenContainer: { paddingTop: HEADER_SPACING },
    waiting: {
      ...Fonts.whiteColor18Bold,
      textAlign: 'center',
      marginBottom: Sizes.spacing12,
    },
    playerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: Sizes.spacing12,
    },
    player: {
      alignItems: 'center',
      marginHorizontal: Sizes.spacing8,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: Sizes.radiusPill,
      marginBottom: Sizes.spacing4,
      borderWidth: 2,
      borderColor: Colors.accentSecondary,
    },
    playerName: {
      ...Fonts.blackColor12Regular,
      color: theme.text,
    },
    logBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors.accentSecondary,
      borderRadius: Sizes.radiusLg,
      padding: Sizes.spacing8,
      backgroundColor: Colors.overlayDark,
    },
    logText: {
      ...Fonts.whiteColor14Regular,
      marginBottom: Sizes.spacing2,
    },
  });

const getBotStyles = (theme) =>
  StyleSheet.create({
    fullFlex: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      paddingHorizontal: Sizes.spacing16,
      marginTop: Sizes.spacing10,
    },
    screenContainer: {
      paddingTop: HEADER_SPACING,
      paddingBottom: Sizes.spacing20,
    },
    flex: { flex: 1 },
    gameTabs: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: Sizes.spacing10,
    },
    tab: {
      paddingVertical: Sizes.spacing6,
      paddingHorizontal: Sizes.spacing12,
      marginHorizontal: Sizes.spacing4,
      borderRadius: Sizes.radiusLg,
      backgroundColor: Colors.neutralMuted,
    },
    tabActive: {
      backgroundColor: Colors.accentLavender,
    },
    tabText: {
      ...Fonts.blackColor14Bold,
    },
    heading: {
      ...Fonts.blackColor18Bold,
      marginBottom: Sizes.spacing20,
    },
    boardWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: Sizes.spacing20,
    },
    resetBtn: {
      backgroundColor: Colors.infoSurface,
      paddingHorizontal: Sizes.spacing12,
      paddingVertical: Sizes.spacing6,
      borderRadius: Sizes.radiusLg,
      alignSelf: 'center',
      marginTop: Sizes.spacing10,
    },
    resetBtnText: {
      ...Fonts.whiteColor14Bold,
    },
    showBtn: {
      backgroundColor: Colors.infoSurface,
      paddingHorizontal: Sizes.spacing12,
      paddingVertical: Sizes.spacing6,
      borderRadius: Sizes.radiusLg,
      alignSelf: 'center',
      marginBottom: Sizes.spacing10,
    },
    showBtnText: {
      ...Fonts.whiteColor14Bold,
    },
    overButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: Sizes.spacing10,
    },
    againBtn: {
      backgroundColor: Colors.successSurface,
      paddingVertical: Sizes.spacing10,
      paddingHorizontal: Sizes.spacing20,
      borderRadius: Sizes.radiusLg,
    },
    newBotBtn: {
      backgroundColor: Colors.warningSurface,
      paddingVertical: Sizes.spacing10,
      paddingHorizontal: Sizes.spacing20,
      borderRadius: Sizes.radiusLg,
    },
    primaryButtonText: {
      ...Fonts.whiteColor16Bold,
      textAlign: 'center',
    },
    newBotBtnText: {
      ...Fonts.blackColor14Bold,
      textAlign: 'center',
    },
    messageSection: {
      flex: 1,
      marginTop: Sizes.spacing10,
    },
    messageList: {
      flex: 1,
    },
    messageListContent: {
      paddingBottom: Sizes.spacing40,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Sizes.spacing8,
    },
    input: {
      flex: 1,
      backgroundColor: Colors.whiteColor,
      paddingHorizontal: Sizes.spacing12,
      paddingVertical: Sizes.spacing8,
      borderRadius: Sizes.radiusPill,
      marginRight: Sizes.spacing8,
    },
    sendBtn: {
      backgroundColor: theme.accent,
      paddingVertical: Sizes.spacing10,
      paddingHorizontal: Sizes.spacing16,
      borderRadius: Sizes.radiusPill,
    },
    disabledButton: {
      opacity: 0.6,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: Sizes.spacing4,
    },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    rowCenter: { justifyContent: 'center' },
    message: {
      padding: Sizes.spacing8,
      borderRadius: Sizes.radiusLg,
      maxWidth: '80%',
    },
    left: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.bgColor,
    },
    right: {
      alignSelf: 'flex-end',
      backgroundColor: Colors.lightPinkColor,
    },
    system: {
      alignSelf: 'center',
      backgroundColor: Colors.neutralMuted,
    },
    sender: {
      ...Fonts.blackColor12Bold,
      marginBottom: Sizes.spacing2,
    },
    text: {
      ...Fonts.blackColor15Regular,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Sizes.radiusXL,
      marginHorizontal: Sizes.spacing6,
    },
  });

const createStyles = (theme) =>
  StyleSheet.create({
    playerRow: {
      flexDirection: 'row',
      paddingHorizontal: Sizes.spacing16,
      marginTop: Sizes.spacing10,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerContent: {
      alignItems: 'center',
    },
    devControls: {
      flexDirection: 'row',
      marginBottom: Sizes.spacing8,
    },
    devButton: {
      paddingHorizontal: Sizes.spacing12,
      paddingVertical: Sizes.spacing6,
      borderRadius: Sizes.radiusMd,
      backgroundColor: Colors.neutralMuted,
    },
    devButtonSpacing: {
      marginRight: Sizes.spacing8,
    },
    devButtonActive: {
      backgroundColor: theme.accent,
    },
    devButtonText: {
      ...Fonts.whiteColor14Bold,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.overlayDark,
    },
    countText: {
      ...Fonts.whiteColor80Bold,
    },
    waitText: {
      ...Fonts.blackColor18Bold,
      textAlign: 'center',
    },
    accentLink: {
      ...Fonts.primaryColor15Medium,
      marginTop: Sizes.spacing10,
      color: theme.accent,
    },
    loaderSpacing: {
      marginTop: Sizes.spacing20,
    },
    invalidMessage: {
      ...Fonts.blackColor16Regular,
      marginTop: Sizes.spacing80,
      textAlign: 'center',
    },
  });

GameSessionScreen.propTypes = {
  sessionType: PropTypes.string,
};

export default GameSessionScreen;
