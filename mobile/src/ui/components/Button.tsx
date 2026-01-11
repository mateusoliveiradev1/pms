import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '../../ui/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  style?: ViewStyle;
};

const Button: React.FC<Props> = ({ title, onPress, disabled, variant = 'primary', style }) => {
  let bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? '#e9ecef' : colors.danger;
  let textColor = variant === 'secondary' ? colors.text : '#FFF';
  let borderStyle = {};

  if (variant === 'outline') {
      bg = 'transparent';
      textColor = colors.primary;
      borderStyle = { borderWidth: 1, borderColor: colors.primary };
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bg }, borderStyle, style, disabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
