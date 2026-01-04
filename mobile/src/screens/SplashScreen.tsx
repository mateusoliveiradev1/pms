import React, { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Logo from '../ui/components/Logo';

const SplashScreen = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={{ opacity, transform: [{ scale }, { translateY }] }}>
        <Logo size={120} variant="dark" animate duration={1300} />
      </Animated.View>
      <Text style={styles.title}>Dropship Manager</Text>
      <Text style={styles.subtitle}>Gestão centralizada de estoque virtual</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3f3f41',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '700',
    color: '#f4f4f4',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#cfcfd4',
  },
});

export default SplashScreen;
