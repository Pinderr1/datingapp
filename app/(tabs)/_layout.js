import { Tabs } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { BackHandler, Text, View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import MyStatusBar from '../../components/myStatusBar';
import { Colors, Sizes } from '../../constants/styles';

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
          tabBarActiveTintColor: Colors.primaryColor,
          tabBarInactiveTintColor: Colors.grayColor,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              android_ripple={{ color: `${Colors.primaryColor}1A` }}
            />
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
          focused && { borderColor: Colors.primaryColor, borderWidth: 1.5 },
        ]}
      >
        <Feather
          name={name}
          size={24}
          color={focused ? Colors.primaryColor : Colors.grayColor}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  tabBar: {
    height: Sizes.fixPadding * 7,
    backgroundColor: Colors.bgColor,
    borderTopWidth: 0,
    elevation: 4,
    shadowColor: Colors.blackColor,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    paddingTop: Sizes.fixPadding,
  },
  iconWrap: {
    width: Sizes.fixPadding * 4.4,
    height: Sizes.fixPadding * 4.4,
    borderRadius: Sizes.fixPadding * 2.2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.whiteColor,
  },
  exitNotice: {
    backgroundColor: `${Colors.blackColor}CC`,
    position: 'absolute',
    bottom: Sizes.fixPadding * 2,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding * 2,
    paddingHorizontal: Sizes.fixPadding * 2,
    paddingVertical: Sizes.fixPadding * 0.8,
  },
  exitText: {
    color: Colors.whiteColor,
    fontSize: 14,
  },
});
