// Mirrorbite metro config — extends expo/metro-config (required by expo doctor)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
