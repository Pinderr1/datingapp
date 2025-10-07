const defaultUserImage = require('../assets/images/users/user1.png');

export const getUserImageSource = (user, fallbackImage) => {
    const defaultImage = fallbackImage ?? defaultUserImage;

    if (!user) {
        return defaultImage;
    }

    const { image, photoURL } = user;

    if (typeof image === 'number') {
        return image;
    }

    if (image && typeof image === 'object') {
        return image;
    }

    if (typeof image === 'string' && image.trim().length > 0) {
        return { uri: image };
    }

    if (typeof photoURL === 'string' && photoURL.trim().length > 0) {
        return { uri: photoURL };
    }

    if (photoURL && typeof photoURL === 'object') {
        return photoURL;
    }

    return defaultImage;
};

export const defaultUserImageSource = defaultUserImage;
