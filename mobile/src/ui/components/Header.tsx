import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, shadow } from '../../ui/theme';
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
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.content}>
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.btn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        
        <View style={styles.center}>
          {showLogo ? (
            <Logo size={logoSize} variant="light" animate={animateLogo} duration={logoDuration} animateKey={animateKey} />
          ) : (
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          )}
        </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.sm,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 56,
  },
  left: { zIndex: 1, width: 48, alignItems: 'flex-start' },
  center: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0, 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 0
  },
  right: { zIndex: 1, width: 48, alignItems: 'flex-end' },
  spacer: { width: 48 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  btn: { padding: 8, marginLeft: -8 },
});

export default Header;
