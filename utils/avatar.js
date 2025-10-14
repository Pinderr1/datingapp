export const imageSource = (img, fallback) => {
  if (!img) return fallback;
  // allow either remote URI string or require() number
  return typeof img === 'string' ? { uri: img } : img;
};

export const avatarSource = (uri) =>
  imageSource(uri, require('../assets/images/users/user1.png'));

export const eventImageSource = (uri) =>
  imageSource(uri, require('../assets/logo.png'));

export const overlayAssets = {
  heart: require('../assets/heart.png'),
  star: require('../assets/star.png'),
  badge: require('../assets/star.png'),
};

export const overlaySource = (id) => overlayAssets[id] || null;
