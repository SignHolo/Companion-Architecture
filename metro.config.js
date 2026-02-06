// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to listen on all interfaces
config.server = {
  ...config.server,
  port: parseInt(process.env.METRO_PORT) || 8081,
  host: '0.0.0.0',
};

// Additional resolver configuration
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'bin', 'txt', 'jpg', 'png', 'svg', 'gif', 'webp', 'ico'],
};

module.exports = config;