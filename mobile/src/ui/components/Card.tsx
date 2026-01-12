import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing, shadow } from '../../ui/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const Card: React.FC<Props> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
});

export default Card;
