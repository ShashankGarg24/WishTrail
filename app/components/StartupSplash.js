import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';

const LOGO_HEIGHT = 42;
// Visible bounds of the original 1254px asset: clip transparent padding only.
const ASSET_SCALE = LOGO_HEIGHT / 491;
const LOGO_WIDTH = 826 * ASSET_SCALE;
const GAP = 1;
const timing = (value, duration) => Animated.timing(value, {
  toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true,
});

export default function StartupSplash({ destinationReady, onHidden }) {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_600SemiBold });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [finished, setFinished] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const hiddenCallback = useRef(onHidden);
  hiddenCallback.current = onHidden;

  useEffect(() => {
    if (!(fontsLoaded || fontError) || !imageLoaded || !textWidth) return;
    // Layout, bundled fonts and decoded artwork are ready before native handoff.
    SplashScreen.hideAsync().catch(() => {});
    const animation = Animated.parallel([
      Animated.sequence([timing(entrance, 350), timing(reveal, 500)]),
      Animated.sequence([Animated.delay(800), timing(tagline, 300)]),
    ]);
    animation.start(({ finished: completed }) => { if (completed) setFinished(true); });
    return () => animation.stop();
  }, [fontsLoaded, fontError, imageLoaded, textWidth, entrance, reveal, tagline]);

  useEffect(() => {
    if (!finished || !destinationReady) return;
    const fade = Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true });
    fade.start(({ finished: completed }) => { if (completed) hiddenCallback.current(); });
    return () => fade.stop();
  }, [finished, destinationReady, opacity]);

  const groupOffset = reveal.interpolate({ inputRange: [0, 1], outputRange: [(textWidth + GAP) / 2, 0] });
  const clipOffset = reveal.interpolate({ inputRange: [0, 1], outputRange: [-textWidth, 0] });
  const contentOffset = reveal.interpolate({ inputRange: [0, 1], outputRange: [textWidth, 0] });

  return (
    <Animated.View style={[styles.screen, { opacity }]} accessible accessibilityRole="image"
      accessibilityLabel="WishTrail. Dreams. Goals. Progress." accessibilityViewIsModal>
      <View style={styles.anchor}>
        <Animated.View style={[styles.wordmark, { transform: [{ translateX: groupOffset }] }]}>
          <Animated.View style={[styles.logo, { opacity: entrance, transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
            <Image source={require('../assets/splash.png')} style={styles.artwork} resizeMode="stretch" fadeDuration={0}
              onLoad={() => setImageLoaded(true)} />
          </Animated.View>
          <View style={styles.textWindow}>
            {/* Opposing translations reveal one stationary text node through a
                moving clip. Every animation stays on the native driver. */}
            <Animated.View style={{ overflow: 'hidden', transform: [{ translateX: clipOffset }] }}>
              <Animated.View style={{ transform: [{ translateX: contentOffset }] }}>
                {(fontsLoaded || fontError) && <Text allowFontScaling={false} numberOfLines={1}
                  onLayout={event => setTextWidth(event.nativeEvent.layout.width)}
                  style={[styles.name, fontsLoaded && { fontFamily: 'Manrope_600SemiBold' }]}>ishTrail</Text>}
              </Animated.View>
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.Text allowFontScaling={false} style={[styles.tagline,
          fontsLoaded && { fontFamily: 'Manrope_400Regular' },
          { opacity: tagline, transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>Dreams. Goals. Progress.</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  anchor: { height: LOGO_HEIGHT, alignItems: 'center' },
  wordmark: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', height: LOGO_HEIGHT },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT, overflow: 'hidden' },
  artwork: { position: 'absolute', width: 1254 * ASSET_SCALE, height: 1254 * ASSET_SCALE, left: -214 * ASSET_SCALE, top: -370 * ASSET_SCALE },
  textWindow: { overflow: 'hidden', marginLeft: GAP },
  name: { fontSize: 32, lineHeight: 42, includeFontPadding: false, color: '#172033', letterSpacing: -0.8 },
  tagline: { position: 'absolute', top: LOGO_HEIGHT + 12, width: 270, textAlign: 'center', fontSize: 14, lineHeight: 20, letterSpacing: 0.3, color: '#7B8798' },
});
