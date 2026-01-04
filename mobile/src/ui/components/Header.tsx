import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../ui/theme';
import Logo from './Logo';

type Props = {
  title?: string;
  onBack?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  showLogo?: boolean;
  logoSize?: number;
  animateLogo?: boolean;
  logoDuration?: number;
  animateKey?: number;
};

const Header: React.FC<Props> = ({ title, onBack, rightIcon, onRightPress, showLogo, logoSize = 32, animateLogo = false, logoDuration = 900, animateKey }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.btn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
      {showLogo ? (
        <Logo size={logoSize} variant="light" animate={animateLogo} duration={logoDuration} animateKey={animateKey} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      <View style={styles.right}>
        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} style={styles.btn}>
            <Ionicons name={rightIcon as any} size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { width: 40 },
  right: { width: 40, alignItems: 'flex-end' },
  spacer: { width: 24 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  btn: { padding: 4 },
});

export default Header;
