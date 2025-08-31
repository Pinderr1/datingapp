import { Tabs } from 'expo-router';
import React, { useState, useCallback } from "react";
import { BackHandler, Text, View, StyleSheet, Image, Pressable } from 'react-native'
import { Colors, Sizes, Fonts } from "../../constants/styles";
import { useFocusEffect } from '@react-navigation/native';
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
            tabBarIcon: ({ focused }) => tabShort({ icon: require('../../assets/images/icons/home.png'), focused: focused })
          }}
        />
        <Tabs.Screen
          name='shortlist/shortlistScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ icon: require('../../assets/images/icons/shortlist.png'), focused: focused })
          }}
        />
        <Tabs.Screen
          name='chat/chatScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ icon: require('../../assets/images/icons/chat.png'), focused: focused })
          }}
        />
        <Tabs.Screen
          name='profile/profileScreen'
          options={{
            tabBarIcon: ({ focused }) => tabShort({ icon: require('../../assets/images/icons/user.png'), focused: focused })
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

  function tabShort({ icon, focused }) {
    return (
      <View style={{ backgroundColor: focused ? Colors.primaryColor : Colors.whiteColor, ...styles.tabIconWrapStyle, }}>
        <Image
          source={icon}
          style={{ width: 25.0, height: 25.0, resizeMode: 'contain', tintColor: focused ? Colors.whiteColor : Colors.grayColor }}
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
    justifyContent: 'center'
  },
})
