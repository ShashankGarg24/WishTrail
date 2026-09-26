import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function StartupSplash() {
  return (
    <View style={styles.screen} accessibilityLabel="Wishtrail. Dreams. Goals. Progress.">
      <Image source={require('../assets/splash.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>wishtrail</Text>
      <Text style={styles.tagline}>Dreams. Goals. Progress.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  logo: { width: 168, height: 154, marginBottom: 12 },
  name: { fontSize: 34, fontWeight: '700', color: '#102238', letterSpacing: -1 },
  tagline: { fontSize: 16, fontStyle: 'italic', color: '#57718f', marginTop: 12 },
});
