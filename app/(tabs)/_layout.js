import { Tabs } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { BackHandler, Text, View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import MyStatusBar from '../../components/myStatusBar';

// Unified color scheme
const Colors = {
  primary: '#ff5a5f', // coral
  gray: '#9b9b9b',
  white: '#fff',
  background: '#ffffff',
};

export default function TabLayout() {
  const [backClickCount, setBackClickCount] = useState(0);

  const backAction = () => {
    if (backClickCount === 1) BackHandler.exitApp();
    else {
      setBackClickCount(1);
      setTimeout(() => setBackClickCount(0), 1000);
    }
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => sub.remove();
    }, [backClickCount])
  );

  return (
    <View style={{ flex: 1 }}>
      <MyStatusBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.gray,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarButton: (props) => (
            <Pressable {...props} android_ripple={{ color: '#f2f2f2' }} />
          ),
        }}
      >
        <Tabs.Screen
          name="home/homeScreen"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => renderIcon('home', focused),
          }}
        />
        <Tabs.Screen
          name="swipe"
          options={{
            title: 'Swipe',
            tabBarIcon: ({ focused }) => renderIcon('heart', focused),
          }}
        />
        <Tabs.Screen
          name="games/index"
          options={{
            title: 'Games',
            tabBarIcon: ({ focused }) => renderIcon('grid', focused),
          }}
        />
        <Tabs.Screen
          name="chat/chatScreen"
          options={{
            title: 'Chat',
            tabBarIcon: ({ focused }) => renderIcon('message-circle', focused),
          }}
        />
        <Tabs.Screen
          name="shortlist/shortlistScreen"
          options={{
            title: 'Shortlist',
            tabBarIcon: ({ focused }) => renderIcon('star', focused),
          }}
        />
        <Tabs.Screen
          name="profile/profileScreen"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => renderIcon('user', focused),
          }}
        />
      </Tabs>

      {backClickCount === 1 && (
        <View style={styles.exitNotice}>
          <Text style={styles.exitText}>Press back again to exit.</Text>
        </View>
      )}
    </View>
  );

  function renderIcon(name, focused) {
    return (
      <View
        style={[
          styles.iconWrap,
          focused && { borderColor: Colors.primary, borderWidth: 1.5 },
        ]}
      >
        <Feather
          name={name}
          size={24}
          color={focused ? Colors.primary : Colors.gray}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    backgroundColor: Colors.background,
    borderTopWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    paddingTop: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  exitNotice: {
    backgroundColor: '#333',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  exitText: {
    color: Colors.white,
    fontSize: 14,
  },
});
