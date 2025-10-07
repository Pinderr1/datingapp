import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Fonts, screenWidth, Sizes } from '../constants/styles';

const ProfileListSection = ({
    profiles,
    onPressProfile,
    containerStyle,
    contentContainerStyle,
    itemStyle,
    renderHeader,
}) => {
    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPressProfile(item)}
            style={[styles.searchResultWrapStyle, itemStyle]}
        >
            <Image
                source={item.image}
                style={styles.profileImageStyle}
            />
            <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0 }}>
                <Text numberOfLines={1} style={{ ...Fonts.blackColor17Medium }}>
                    {item.name}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 8.0 }}
                >
                    {item.profession} • {item.distance}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={containerStyle}>
            {renderHeader && renderHeader()}
            <FlatList
                data={profiles}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={contentContainerStyle}
            />
        </View>
    );
};

export default ProfileListSection;

const styles = StyleSheet.create({
    searchResultWrapStyle: {
        backgroundColor: Colors.bgColor,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Sizes.fixPadding + 5.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    profileImageStyle: {
        width: screenWidth / 6.0,
        height: screenWidth / 6.0,
        borderRadius: Sizes.fixPadding,
    },
});
