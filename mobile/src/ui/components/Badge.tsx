import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing } from '../../ui/theme';

type Props = {
  text: string;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
};

const Badge: React.FC<Props> = ({ text, color = '#1976d2', backgroundColor = '#e3f2fd', style }) => {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default Badge;
