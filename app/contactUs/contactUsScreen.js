import { StyleSheet, Text, View, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, screenWidth, Sizes, CommonStyles } from '../../constants/styles'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';
import { fetchJson } from '../../services/api';
import { useUser } from '../../context/userContext';

const ContactUsScreen = () => {

    const navigation = useNavigation();
    const { profile } = useUser();

    const [name, setname] = useState(profile?.name || '');
    const [email, setemail] = useState(profile?.email || '');
    const [message, setmessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        try {
            const res = await fetchJson('/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message }),
            });
            if (!res) throw new Error('Failed to send message');

            Alert.alert('Success', 'Message sent successfully');
            navigation.pop();
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.primaryColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, }}>
                <ScrollView
                    bounces={false}
                    automaticallyAdjustKeyboardInsets={true}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    {titleWithIcon()}
                    {contactInfo()}
                </ScrollView>
                {sendButton()}
            </View>
        </View>
    )

    function sendButton() {
        return (
            <View style={{ backgroundColor: Colors.whiteColor }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSend}
                    disabled={loading}
                    style={styles.buttonStyle}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.whiteColor} />
                    ) : (
                        <Text style={{ ...Fonts.whiteColor20Medium }}>
                            Send
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        )
    }

    function contactInfo() {
        return (
            <View style={styles.contactInfoWrapStyle}>
                {fullNameInfo()}
                {emailInfo()}
                {messageInfo()}
            </View>
        )
    }

    function messageInfo() {
        return (
            <View>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Message
                </Text>
                <TextInput
                    value={message}
                    onChangeText={(value) => setmessage(value)}
                    cursorColor={Colors.primaryColor}
                    style={{
                        ...styles.infoWrapStyle,
                        height: 100,
                        paddingTop: Sizes.fixPadding - 2.0
                    }}
                    placeholder="Write here..."
                    placeholderTextColor={Colors.grayColor}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    function emailInfo() {
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.5 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Email Address
                </Text>
                <TextInput
                    value={email}
                    onChangeText={(value) => setemail(value)}
                    cursorColor={Colors.primaryColor}
                    style={{ ...styles.infoWrapStyle }}
                    placeholder="Enter Email Address"
                    placeholderTextColor={Colors.grayColor}
                    keyboardType="email-address"
                    selectionColor={Colors.primaryColor}
                    numberOfLines={1}
                />
            </View>
        )
    }

    function fullNameInfo() {
        return (
            <View>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Full Name
                </Text>
                <TextInput
                    value={name}
                    onChangeText={(value) => setname(value)}
                    cursorColor={Colors.primaryColor}
                    style={{ ...styles.infoWrapStyle }}
                    placeholder="Enter FullName"
                    placeholderTextColor={Colors.grayColor}
                    selectionColor={Colors.primaryColor}
                    numberOfLines={1}
                />
            </View>
        )
    }

    function titleWithIcon() {
        return (
            <View style={{ alignItems: 'center', margin: Sizes.fixPadding * 4.0, }}>
                <Text style={{ ...Fonts.whiteColor18Bold }}>
                    GET IN TOUCH !
                </Text>
                <Text style={{ ...Fonts.whiteColor15Regular, marginTop: Sizes.fixPadding - 5.0 }}>
                    Always within your reach
                </Text>
                <Image
                    source={require('../../assets/images/icons/contactUs.png')}
                    style={styles.contactIconStyle}
                />
            </View>
        )
    }
}

export default ContactUsScreen

const styles = StyleSheet.create({
    infoWrapStyle: {
        ...Fonts.blackColor16Regular,
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical: Sizes.fixPadding + 3.0,
        marginTop: Sizes.fixPadding - 2.0
    },
    buttonStyle: {
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        margin: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 8.0,
        elevation: 1.0,
        ...CommonStyles.buttonShadow,
    },
    contactInfoWrapStyle: {
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingTop: Sizes.fixPadding * 3.0,
        paddingBottom: Sizes.fixPadding * 2.0,
        flex: 1,
        backgroundColor: Colors.whiteColor,
        borderTopLeftRadius: Sizes.fixPadding * 3.5,
        borderTopRightRadius: Sizes.fixPadding * 3.5,
    },
    contactIconStyle: {
        width: screenWidth / 2.8,
        height: screenWidth / 2.8,
        resizeMode: 'contain',
        marginTop: Sizes.fixPadding * 3.5
    }
})
