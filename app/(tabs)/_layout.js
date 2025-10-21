import { Tabs } from 'expo-router';
import React, { useState, useCallback } from "react";
import { BackHandler, Text, View, StyleSheet, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons';
import { Colors, Sizes, Fonts } from "../../constants/styles";
import { useFocusEffect } from 'expo-router';
import MyStatusBar from "../../components/myStatusBar";

export default function TabLayout() {

  const backAction = () => {
    backClickCount == 1 ? BackHandler.exitApp() : _spring();
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => {
        backHandler.remove();
      };
    }, [backAction])
  );

  function _spring() {
    setBackClickCount(1);
    setTimeout(() => {
      setBackClickCount(0)
    }, 1000)
  }

  const [backClickCount, setBackClickCount] = useState(0);

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
          tabBarStyle: { ...styles.tabBarStyle },
          tabBarButton: (props) => (
            <Pressable
              {...props}
              android_ripple={{
                color: Colors.whiteColor,
              }}
            />
          ),
        }}
      >
        <Tabs.Screen
          name='home/homeScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ iconName: 'home', focused })
          }}
        />
        <Tabs.Screen
          name='swipe'
          options={{
            title: 'Swipe',
            tabBarIcon: ({ focused }) => tabShort({ iconName: 'heart', focused })
          }}
        />
        <Tabs.Screen
          name='chat/chatScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ iconName: 'message-circle', focused })
          }}
        />
        <Tabs.Screen
          name='shortlist/shortlistScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ iconName: 'star', focused })
          }}
        />
        <Tabs.Screen
          name='profile/profileScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ iconName: 'user', focused })
          }}
        />
      </Tabs>
      {exitInfo()}
    </View>
  );

  function exitInfo() {
    return (
      backClickCount == 1
        ?
        <View style={styles.exitWrapStyle}>
          <Text style={{ ...Fonts.whiteColor15Medium }}>
            Press Back Once Again to Exit.
          </Text>
        </View>
        :
        null
    )
  }

  function tabShort({ iconName, focused }) {
    return (
      <View style={[styles.tabIconWrapStyle, focused && styles.activeTabIconWrapStyle]}>
        <Feather
          name={iconName}
          size={24}
          color={focused ? Colors.primaryColor : Colors.grayColor}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  exitWrapStyle: {
    backgroundColor: Colors.grayColor,
    position: "absolute",
    bottom: 20,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding * 3.0,
    paddingHorizontal: Sizes.fixPadding + 10.0,
    paddingVertical: Sizes.fixPadding + 3.0,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBarStyle: {
    height: 70.0,
    backgroundColor: Colors.whiteColor,
    borderTopWidth: 0.0,
    elevation: 3.0,
    paddingTop: Sizes.fixPadding + 7.0
  },
  tabIconWrapStyle: {
    width: 44.0,
    height: 44.0,
    borderRadius: 22.0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.whiteColor,
  },
  activeTabIconWrapStyle: {
    borderColor: Colors.primaryColor,
    borderWidth: 1.5,
  },
})
