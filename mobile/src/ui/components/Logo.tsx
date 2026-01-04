import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Animated } from 'react-native';
import { colors, radius } from '../../ui/theme';

type Props = {
  size?: number;
  variant?: 'light' | 'dark';
  style?: ViewStyle;
  animate?: boolean;
  duration?: number;
  animateKey?: number;
};

const Logo: React.FC<Props> = ({ size = 80, variant = 'light', style, animate = false, duration = 1200, animateKey }) => {
  const bg = variant === 'dark' ? '#3f3f41' : colors.surface;
  const textColor = variant === 'dark' ? '#f4f4f4' : colors.text;
  const box = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.25),
    backgroundColor: bg,
  };
  const fontSize = Math.round(size * 0.3);
  const swashHeight = Math.round(size * 0.12);
  const swashY = Math.round(size * 0.78);
  const pathLen = Math.max(80, Math.round(size * 2));
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const dashRef = useRef(new Animated.Value(0));
  useEffect(() => {
    if (animate) {
      dashRef.current.setValue(pathLen);
      Animated.timing(dashRef.current, { toValue: 0, duration, useNativeDriver: false }).start();
    }
  }, [animate, duration, pathLen, animateKey]);

  return (
    <View style={[styles.container, box, style]}>
      <Text style={[styles.text, { color: textColor, fontSize }]}>{'PMS'}</Text>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', bottom: 0, left: 0 }}
      >
        <Defs>
          <LinearGradient id="swashGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#1f1f20" stopOpacity="0.9" />
            <Stop offset="0.35" stopColor="#6f6f72" stopOpacity="0.85" />
            <Stop offset="0.7" stopColor="#cfcfd4" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#f0f0f3" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        {animate ? (
          <>
            <AnimatedPath
              d={`M ${size * 0.12} ${swashY}
                  C ${size * 0.35} ${swashY - swashHeight},
                    ${size * 0.62} ${swashY + swashHeight * 0.4},
                    ${size * 0.86} ${swashY - swashHeight * 0.2}`}
              stroke="url(#swashGrad)"
              strokeWidth={Math.max(2, Math.round(size * 0.02))}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={pathLen}
              strokeDashoffset={dashRef.current}
            />
            <AnimatedPath
              d={`M ${size * 0.1} ${swashY + 3}
                  C ${size * 0.28} ${swashY - swashHeight * 0.4},
                    ${size * 0.55} ${swashY + swashHeight * 0.9},
                    ${size * 0.8} ${swashY + 1}`}
              stroke="#1f1f20"
              strokeWidth={Math.max(2, Math.round(size * 0.018))}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
              strokeDasharray={pathLen}
              strokeDashoffset={dashRef.current}
            />
          </>
        ) : (
          <>
            <Path
              d={`M ${size * 0.12} ${swashY}
                  C ${size * 0.35} ${swashY - swashHeight},
                    ${size * 0.62} ${swashY + swashHeight * 0.4},
                    ${size * 0.86} ${swashY - swashHeight * 0.2}`}
              stroke="url(#swashGrad)"
              strokeWidth={Math.max(2, Math.round(size * 0.02))}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M ${size * 0.1} ${swashY + 3}
                  C ${size * 0.28} ${swashY - swashHeight * 0.4},
                    ${size * 0.55} ${swashY + swashHeight * 0.9},
                    ${size * 0.8} ${swashY + 1}`}
              stroke="#1f1f20"
              strokeWidth={Math.max(2, Math.round(size * 0.018))}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  swashLight: {},
  swashDark: {},
});

export default Logo;
