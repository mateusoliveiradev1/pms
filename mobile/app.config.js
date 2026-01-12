export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl: process.env.MOBILE_API_URL || 'http://192.168.3.118:3000/api',
      env: process.env.APP_ENV || 'development',
    },
  };
};
