import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Colors, Fonts, screenHeight, screenWidth, Sizes, CommonStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import { Dropdown } from 'react-native-element-dropdown';
import MyStatusBar from '../../components/myStatusBar';
import { useRouter } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { auth, db, storage } from '../../firebaseConfig';
import { arrayUnion, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const getImagePickerImageMediaTypes = () => {
    const mediaType =
        ImagePicker.MediaType?.IMAGES ??
        ImagePicker.MediaType?.IMAGE ??
        ImagePicker.MediaType?.Images ??
        ImagePicker.MediaType?.Image ??
        ImagePicker.MediaType?.image;

    if (mediaType !== undefined) {
        return mediaType;
    }

    return 'image';
};

const agesList = [
    { label: '25 Years' },
    { label: '26 Years' },
    { label: '27 Years' },
    { label: '28 Years' },
    { label: '29 Years' },
    { label: '30 Years' },
    { label: '31 Years' },
    { label: '32 Years' },
    { label: '33 Years' },
    { label: '34 Years' },
    { label: '35 Years' },
    { label: '36 Years' },
    { label: '37 Years' },
    { label: '38 Years' },
    { label: '39 Years' },
    { label: '40 Years' },
];

const EditProfileScreen = () => {

    const router = useRouter();
    const { profile, setProfile } = useUser();

    if (!profile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.whiteColor }}>
                <ActivityIndicator size="large" color={Colors.primaryColor} />
            </View>
        );
    }

    const [name, setname] = useState(profile?.name ?? '');
    const [age, setage] = useState(profile?.age ? `${profile.age} Years` : '');
    const [gender, setgender] = useState(profile?.gender ?? '');
    const [about, setabout] = useState(profile?.bio ?? '');
    const [updating, setUpdating] = useState(false);
    const [photoUri, setPhotoUri] = useState(profile?.photoURL ?? '');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        setPhotoUri(profile?.photoURL ?? '');
    }, [profile?.photoURL]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {profilePics()}
                    {fullNameInfo()}
                    {ageAndGenderInfo()}
                    {aboutInfo()}
                </ScrollView>
            </View>
            {updateButton()}
        </View>
    )

    function updateButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                disabled={updating || uploadingPhoto}
                onPress={async () => {
                    const uid = auth.currentUser?.uid;
                    if (!uid) return;
                    const userRef = doc(db, 'users', uid);
                    const parsedAge = Number.parseInt(age, 10);
                    if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 120) {
                        Alert.alert('Invalid age', 'Enter a valid age (18–120)');
                        return;
                    }
                    if (uploadingPhoto) {
                        Alert.alert('Please wait', 'Your photo is still uploading.');
                        return;
                    }
                    setUpdating(true);
                    try {
                        const trimmedName = name.trim();
                        const trimmedGender = gender.trim();
                        const trimmedBio = about.trim();
                        const fallbackPhoto = selectedAsset?.downloadUrl || selectedAsset?.fallbackUri || '';
                        const photoUrl = (photoUri || fallbackPhoto)?.trim();
                        await setDoc(
                            userRef,
                            {
                                uid,
                                email: profile.email,
                                name: trimmedName,
                                gender: trimmedGender,
                                bio: trimmedBio,
                                age: parsedAge,
                                ...(photoUrl ? { photoURL: photoUrl, photoURLs: arrayUnion(photoUrl) } : {}),
                                updatedAt: serverTimestamp(),
                            },
                            { merge: true }
                        );
                        const userDoc = await getDoc(userRef);
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setProfile(prev => ({ ...prev, ...userData, ...(photoUrl ? { photoURL: photoUrl } : {}) }));
                        }
                        router.back();
                    } catch (error) {
                        const friendlyMessage = error instanceof Error ? error.message : String(error);
                        Alert.alert('Update failed', friendlyMessage);
                    } finally {
                        setUpdating(false);
                    }
                }}
                style={[styles.buttonStyle, (updating || uploadingPhoto) && { opacity: 0.5 }]}
            >
                <Text style={{ ...Fonts.whiteColor20Medium }}>
                    Update
                </Text>
            </TouchableOpacity>
        )
    }

    function aboutInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    About me
                </Text>
                <TextInput
                    placeholder='Enter About'
                    placeholderTextColor={Colors.grayColor}
                    value={about}
                    onChangeText={(value) => setabout(value)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{ ...styles.infoWrapStyle }}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    function ageAndGenderInfo() {
        return (
            <View style={{ flexDirection: 'row', marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <View style={{ flex: 1, marginRight: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        Age
                    </Text>
                    <Dropdown
                        data={agesList}
                        value={age}
                        onChange={item => { setage(item.label) }}
                        placeholder={'Select Age'}
                        labelField="label"
                        valueField="label"
                        maxHeight={screenHeight / 2.0}
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
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        Gender
                    </Text>
                    <Dropdown
                        data={[{ label: 'Male' }, { label: 'Female' }]}
                        value={gender}
                        onChange={item => { setgender(item.label) }}
                        placeholder={'Select Gender'}
                        labelField="label"
                        valueField="label"
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
            </View>
        )
    }

    function fullNameInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0 }}>
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
                    numberOfLines={1}
                    selectionColor={Colors.primaryColor}
                />
            </View>
        )
    }

    async function handlePickProfilePhoto() {
        try {
            const { status, granted, ios } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            const hasAccess = granted || ios?.accessPrivileges === 'limited';
            if (!hasAccess) {
                if (status === 'denied') {
                    Alert.alert(
                        'Photo access needed',
                        'Please enable photo library access in your settings to upload an image.'
                    );
                }
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: getImagePickerImageMediaTypes(),
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });
            if (result.canceled) {
                return;
            }
            const asset = result.assets?.[0];
            if (!asset) {
                return;
            }
            const fallbackUri = asset.base64
                ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
                : asset.uri;
            setSelectedAsset({ ...asset, fallbackUri });
            if (fallbackUri) {
                setPhotoUri(fallbackUri);
            }
            if (!asset.uri) {
                Alert.alert('Upload failed', 'Selected image is missing a file URI; using a local copy instead.');
                return;
            }
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Not signed in', 'Please sign in again.');
                return;
            }
            if (!storage) {
                console.warn('Firebase storage unavailable; using local avatar data URI.');
                return;
            }
            setUploadingPhoto(true);
            let blob;
            try {
                const response = await fetch(asset.uri);
                blob = await response.blob();
                const fileExtension = asset.fileName?.split('.').pop() || 'jpg';
                const photoRef = ref(storage, `avatars/${user.uid}/${Date.now()}.${fileExtension}`);
                const selectContentType = () => {
                    const candidates = [asset?.mimeType, blob?.type];
                    return (
                        candidates.find((value) => typeof value === 'string' && /^image\//.test(value)) ||
                        'image/jpeg'
                    );
                };
                const uploadTask = uploadBytesResumable(photoRef, blob, {
                    contentType: selectContentType(),
                });
                await uploadTask;
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                setPhotoUri(downloadUrl);
                setSelectedAsset({ ...asset, fallbackUri, downloadUrl });
            } catch (error) {
                console.warn('avatar upload failed', error?.code, error?.message || String(error));
                Alert.alert('Upload failed', error?.code || error?.message || String(error));
                setPhotoUri(fallbackUri);
                setSelectedAsset({ ...asset, fallbackUri });
            } finally {
                if (blob && typeof blob.close === 'function') {
                    blob.close();
                }
                setUploadingPhoto(false);
            }
        } catch (error) {
            console.warn('avatar upload failed', error?.code, error?.message || String(error));
            Alert.alert('Upload failed', error?.code || error?.message || String(error));
            setUploadingPhoto(false);
        }
    }

    function profilePics() {
        const fallbackImage = require('../../assets/images/users/user17.png');
        const source = photoUri ? { uri: photoUri } : fallbackImage;
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickProfilePhoto}
                    style={styles.profileImageWrapper}
                >
                    <Image
                        source={source}
                        style={styles.profileImage}
                    />
                    <View style={styles.photoOverlay}>
                        {uploadingPhoto ? (
                            <ActivityIndicator color={Colors.whiteColor} />
                        ) : (
                            <MaterialIcons name="photo-camera" size={28} color={Colors.whiteColor} />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        )
    }

    function header() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, justifyContent: 'center' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { router.back() }}
                    style={styles.backArrowIconWrapStyle}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={Colors.blackColor} style={{ left: 2.0, }} />
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', maxWidth: screenWidth - 130, ...Fonts.blackColor18Bold }}>
                    Edit Profile
                </Text>
            </View>
        )
    }
}

export default EditProfileScreen

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
    profileImageWrapper: {
        borderRadius: Sizes.fixPadding,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
    },
    profileImage: {
        height: screenWidth / 1.7,
        width: '100%',
        borderRadius: Sizes.fixPadding,
    },
    photoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoWrapStyle: {
        ...Fonts.blackColor16Regular,
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical:Sizes.fixPadding+3.0,
        marginTop: Sizes.fixPadding - 2.0
    },
    dropDownMenuStyle: {
        marginTop: Sizes.fixPadding + 5.0,
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical: Sizes.fixPadding+3.0,
    },
    buttonStyle: {
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        margin: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 8.0,
        elevation: 1.0,
        ...CommonStyles.buttonShadow
    }
})