import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import React, { useState, useCallback } from 'react'
import { Colors, Fonts, screenWidth, Sizes, CommonStyles } from '../../constants/styles'
import { MaterialIcons, FontAwesome } from '@expo/vector-icons'
import { Slider } from '@miblanchard/react-native-slider';
import RangeSlider from 'rn-range-slider';
import { Dropdown } from 'react-native-element-dropdown';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const educations = [
    { label: 'Information Technology (IT)' },
    { label: 'Mechanical Engineering' },
    { label: 'B. Tech/ B.E' },
    { label: 'Nursing' },
    { label: 'BPharma- Bachelor of Pharmacy' },
    { label: 'Electronics and Communication Engineering' },
    { label: 'Interior Designering' },
    { label: 'Bachelor of Dental Surgery' },
    { label: 'Civil Engineering' },
    { label: 'Aeronautical Engineering' },
];

const professions = [
    { label: 'Software Engineer' },
    { label: 'Junior Front-End Developer' },
    { label: 'Businessman' },
    { label: 'Python Developer' },
    { label: 'Teacher' },
    { label: 'Physician' },
    { label: 'Flutter Developer' },
    { label: 'Scientist' },
    { label: 'JavaScript Developer' },
    { label: 'Designer' },
    { label: 'Architect' },
    { label: 'Electrician' },
    { label: 'Engineer' },
    { label: 'Actress' }
];

const religions = [
    { label: 'Hindu' },
    { label: 'Christian' },
    { label: 'Islam' },
    { label: 'Buddh' },
    { label: 'Jain' },
    { label: 'Sikh' }
];

const FilterScreen = () => {

    const navigation = useNavigation();

    const [location, setlocation] = useState('Irvine, California');
    const [distance, setDistance] = useState(60);
    const [menSelected, setmenSelected] = useState(false);
    const [married, setmarried] = useState(false);
    const [minAge, setminAge] = useState(22);
    const [maxAge, setmaxAge] = useState(32);
    const [education, setEducation] = useState(null);
    const [profession, setprofession] = useState(null);
    const [religion, setreligion] = useState(null)

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Sizes.fixPadding }}>
                    {locationInfo()}
                    {distanceInfo()}
                    {genderInfo()}
                    {maritalStatusInfo()}
                    {ageRangeInfo()}
                    {educationInfo()}
                    {professionInfo()}
                    {religionInfo()}
                </ScrollView>
                {clearAndApplyButton()}
            </View>
        </View>
    )

    function clearAndApplyButton() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', margin: Sizes.fixPadding * 2.0 }}>
                <Text onPress={() => { navigation.pop() }} style={{ ...Fonts.primaryColor18Bold }}>
                    Clear
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { navigation.push('searchResults/searchResultsScreen') }}
                    style={styles.buttonStyle}
                >
                    <Text style={{ ...Fonts.whiteColor20Medium }}>
                        Apply
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    function religionInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 3.0, }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Religion
                </Text>
                <Dropdown
                    data={religions}
                    value={religion}
                    onChange={item => { setreligion(item.label) }}
                    placeholder={'Select Religion'}
                    labelField="label"
                    valueField="label"
                    maxHeight={200}
                    showsVerticalScrollIndicator={false}
                    style={styles.dropDownMenuStyle}
                    containerStyle={{ backgroundColor: Colors.whiteColor, elevation: 2.0, borderRadius: Sizes.fixPadding - 5.0 }}
                    placeholderStyle={{ ...Fonts.grayColor15Regular }}
                    selectedTextStyle={{ ...Fonts.blackColor15Regular }}
                    selectedTextProps={{ numberOfLines: 1 }}
                    iconColor={Colors.primaryColor}
                    activeColor={Colors.bgColor}
                    itemContainerStyle={{ marginBottom: -10 }}
                    itemTextStyle={{ ...Fonts.blackColor15Regular, }}
                    dropdownPosition="top"
                />
            </View>
        )
    }

    function professionInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 3.0, }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Profession
                </Text>
                <Dropdown
                    data={professions}
                    value={profession}
                    onChange={item => { setprofession(item.label); }}
                    showsVerticalScrollIndicator={false}
                    style={styles.dropDownMenuStyle}
                    containerStyle={{ backgroundColor: Colors.whiteColor, elevation: 2.0, borderRadius: Sizes.fixPadding - 5.0 }}
                    placeholderStyle={{ ...Fonts.grayColor15Regular }}
                    selectedTextStyle={{ ...Fonts.blackColor15Regular }}
                    iconColor={Colors.primaryColor}
                    maxHeight={200}
                    labelField="label"
                    valueField="label"
                    placeholder={'Select Profession'}
                    activeColor={Colors.bgColor}
                    itemContainerStyle={{ marginBottom: -10 }}
                    itemTextStyle={{ ...Fonts.blackColor15Regular, }}
                    selectedTextProps={{ numberOfLines: 1 }}
                    dropdownPosition="top"
                />
            </View>
        )
    }

    function educationInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.5, }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Education
                </Text>
                <Dropdown
                    value={education}
                    onChange={item => { setEducation(item.label); }}
                    showsVerticalScrollIndicator={false}
                    style={styles.dropDownMenuStyle}
                    containerStyle={{ backgroundColor: Colors.whiteColor, elevation: 2.0, borderRadius: Sizes.fixPadding - 5.0 }}
                    placeholderStyle={{ ...Fonts.grayColor15Regular }}
                    selectedTextStyle={{ ...Fonts.blackColor15Regular }}
                    iconColor={Colors.primaryColor}
                    data={educations}
                    maxHeight={200}
                    labelField="label"
                    valueField="label"
                    placeholder={'Select Education'}
                    activeColor={Colors.bgColor}
                    itemContainerStyle={{ marginBottom: -10 }}
                    itemTextStyle={{ ...Fonts.blackColor15Regular, }}
                    selectedTextProps={{ numberOfLines: 1 }}
                    dropdownPosition="top"
                />
            </View>
        )
    }

    function ageRangeInfo() {
        const renderThumb = useCallback(() => <View style={{ ...styles.sliderThumbStyle }} />, []);
        const renderRail = useCallback(() => <View style={{ borderRadius: Sizes.fixPadding, height: 4, width: '100%', backgroundColor: 'rgba(138, 156, 191, 0.3)' }} />, []);
        const renderRailSelected = useCallback(() => <View style={{ height: 4, backgroundColor: Colors.primaryColor }} />, []);
        const handleValueChange = useCallback((low, high) => {
            setminAge(low);
            setmaxAge(high);
        }, []);
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.fixPadding + 5.0, }}>
                    <Text style={{ flex: 1, ...Fonts.blackColor16Medium }}>
                        Age Range
                    </Text>
                    <Text style={{ ...Fonts.grayColor14Regular }}>
                        {minAge} - {maxAge}
                    </Text>
                </View>
                <RangeSlider
                    min={20}
                    max={50}
                    low={minAge}
                    high={maxAge}
                    step={1}
                    floatingLabel
                    renderThumb={renderThumb}
                    renderRail={renderRail}
                    renderRailSelected={renderRailSelected}
                    onValueChanged={handleValueChange}
                />
            </View>
        )
    }

    function maritalStatusInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 3.0, }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Marital Status
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ marginTop: Sizes.fixPadding + 5.0, alignItems: 'center' }}
                >
                    {buttonShort({ btnText: 'Married', selected: married, onPress: () => { setmarried(true) } })}
                    {buttonShort({ btnText: 'Never Married', selected: !married, btnStyle: { marginLeft: Sizes.fixPadding * 2.0, }, onPress: () => setmarried(false) })}
                </ScrollView>
            </View>
        )
    }

    function genderInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding - 5.0 }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Gender
                </Text>
                <View style={{ marginTop: Sizes.fixPadding + 5.0, flexDirection: 'row', alignItems: 'center' }}>
                    {buttonShort({ btnText: 'Man', selected: menSelected, onPress: () => { setmenSelected(true) } })}
                    {buttonShort({ btnText: 'Woman', selected: !menSelected, btnStyle: { marginLeft: Sizes.fixPadding * 2.0, }, onPress: () => setmenSelected(false) })}
                </View>
            </View>
        )
    }

    function buttonShort({ btnText, selected, btnStyle, onPress }) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                style={{
                    backgroundColor: selected ? Colors.primaryColor : Colors.bgColor,
                    paddingVertical: Sizes.fixPadding,
                    paddingHorizontal: Sizes.fixPadding * 3.0,
                    borderRadius: Sizes.fixPadding - 5.0,
                    ...btnStyle,
                }}
            >
                <Text style={selected ? { ...Fonts.whiteColor15Regular } : { ...Fonts.grayColor15Regular }}>
                    {btnText}
                </Text>
            </TouchableOpacity>
        )
    }

    function distanceInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.fixPadding + 5.0, }}>
                    <Text style={{ flex: 1, ...Fonts.blackColor16Medium }}>
                        Maximum Distance
                    </Text>
                    <Text style={{ ...Fonts.grayColor14Regular }}>
                        {distance}km
                    </Text>
                </View>
                <Slider
                    value={distance}
                    onValueChange={setDistance}
                    maximumValue={100}
                    minimumValue={0}
                    step={1}
                    allowTouchTrack
                    trackStyle={{ height: 4, }}
                    maximumTrackTintColor={'rgba(138, 156, 191, 0.3)'}
                    minimumTrackTintColor={Colors.primaryColor}
                    thumbStyle={{ ...styles.sliderThumbStyle }}
                    containerStyle={{ height: 21.0 }}
                />
            </View>
        )
    }

    function locationInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium }}>
                    Location
                </Text>
                <View style={styles.locationFieldWrapStyle}>
                    <FontAwesome name="location-arrow" size={22} color={Colors.grayColor} />
                    <TextInput
                        placeholder='Current Location'
                        value={location}
                        onChangeText={(value) => setlocation(value)}
                        style={{ padding: 0, ...Fonts.blackColor15Regular, marginLeft: Sizes.fixPadding }}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        numberOfLines={1}
                    />
                </View>
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
                    Filters
                </Text>
            </View>
        )
    }
}

export default FilterScreen

const styles = StyleSheet.create({
    backArrowIconWrapStyle: {
        position: 'absolute',
        width: 40.0,
        height: 40.0,
        backgroundColor: Colors.bgColor,
        borderRadius: 20.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    locationFieldWrapStyle: {
        marginTop: Sizes.fixPadding + 5.0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical: Sizes.fixPadding + 5.0,
    },
    sliderThumbStyle: {
        width: 20.0,
        height: 20.0,
        backgroundColor: Colors.primaryColor,
        borderColor: Colors.whiteColor,
        borderWidth: 1.0,
        borderRadius: 10.0,
        elevation: 2.0,
        shadowColor: Colors.primaryColor
    },
    dropDownMenuStyle: {
        marginTop: Sizes.fixPadding + 5.0,
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical: Sizes.fixPadding + 3.0,
    },
    buttonStyle: {
        flex: 1,
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 8.0,
        marginLeft: Sizes.fixPadding * 2.0,
        elevation: 1.0,
        ...CommonStyles.buttonShadow
    }
})