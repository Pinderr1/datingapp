import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Colors, Fonts, screenWidth, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const termsOfUse = [
    'Lorem ipsum dolor sit amet, consectetur adipiscin elit. Mattis platea mauris ridiculus odio mattis morbi consectetur.',
    'Egestas nisi, fringilla fames nis pellentesque ac ideget vel. Malesuada in velit, justo nunc in convallisd aliquam sollicitudin. Vitae euismod tristique sed eugiat dignissim eget proin tristique cursus.',
    'Et mauris platea porta et posuere. Lectus conseq-uat rhoncus pharetra fames eget dictum. Non a habitasse velit enim.'
];

const companyPolicies = [
    'Lorem ipsum dolor sit amet, consectetur adipiscin elit. Mattis platea mauris ridiculus odio mattis morbi consectetur.',
    'Egestas nisi, fringilla fames nis pellentesque ac ideget vel. Malesuada in velit, justo nunc in convallisd aliquam sollicitudin. Vitae euismod tristique sed eugiat dignissim eget proin tristique cursus.',
    'Et mauris platea porta et posuere. Lectus conseq-uat rhoncus pharetra fames eget dictum. Non a habitasse velit enim.'
];

const TermsAndConditionScreen = () => {

    const navigation = useNavigation();

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2.0 }}>
                    {termsOfUseInfo()}
                    {companyPolicyInfo()}
                </ScrollView>
            </View>
        </View>
    )

    function companyPolicyInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.blackColor17Bold, marginBottom: Sizes.fixPadding * 1.5, }}>
                    Company Policy
                </Text>
                {
                    companyPolicies.map((item, index) => (
                        <Text
                            key={`${index}`}
                            style={{ ...Fonts.grayColor15Regular, lineHeight: 23.0, marginBottom: Sizes.fixPadding + 2.0 }}
                        >
                            {item}
                        </Text>
                    ))
                }
            </View>
        )
    }

    function termsOfUseInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor17Bold, marginBottom: Sizes.fixPadding * 1.5, }}>
                    Terms of Use
                </Text>
                {
                    termsOfUse.map((item, index) => (
                        <Text
                            key={`${index}`}
                            style={{ ...Fonts.grayColor15Regular, lineHeight: 23.0, marginBottom: Sizes.fixPadding + 2.0 }}
                        >
                            {item}
                        </Text>
                    ))
                }
            </View>
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, justifyContent: 'center' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.pop() }}
                    style={styles.backArrowIconWrapStyle}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0, }} />
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', maxWidth: screenWidth - 130, ...Fonts.blackColor18Bold }}>
                    Terms & Conditions
                </Text>
            </View>
        )
    }
}

export default TermsAndConditionScreen

const styles = StyleSheet.create({
    backArrowIconWrapStyle: {
        position: 'absolute',
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    }
})