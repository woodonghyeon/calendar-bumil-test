const { override, addWebpackAlias } = require("customize-cra");

module.exports = override((config) => {
  config.resolve.fallback = {
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    stream: require.resolve("stream-browserify"),
    util: require.resolve("util/"),
    url: require.resolve("url/"),
    assert: require.resolve("assert/"),
    zlib: require.resolve("browserify-zlib"),
  };
  return config;
});
