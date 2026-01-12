import { env } from '../env';

export const flags = {
  webhooks: env.ENABLE_WEBHOOKS,
  exports: env.ENABLE_EXPORTS,
  notifications: env.ENABLE_NOTIFICATIONS,
};

export type FeatureFlag = keyof typeof flags;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return flags[feature];
};

export default flags;
