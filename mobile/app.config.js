export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl:
        process.env.MOBILE_API_URL ??
        'https://pms-backend-qalb.onrender.com/api',
      env: process.env.APP_ENV || 'production',
    },
  };
};
