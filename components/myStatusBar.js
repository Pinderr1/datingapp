import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { Colors } from "../constants/styles";

const MyStatusBar = () => {
  return (
    <SafeAreaView style={{ backgroundColor: Colors.primaryColor }}>
      <StatusBar
        translucent={false}
        backgroundColor={Colors.primaryColor}
        barStyle={"light-content"}
      />
    </SafeAreaView>
  );
};

export default MyStatusBar;
