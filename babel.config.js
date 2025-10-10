module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin', // if you use it; remove if not
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
