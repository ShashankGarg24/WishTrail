import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

const IndeterminateProgressBar = ({
  width = 86,
  height = 4,
  trackColor = '#d3d3d3',
  indicatorColor = '#007bff',
  indicatorWidth = 28,
  duration = 900,
  style
}) => {
  const translateX = useRef(new Animated.Value(-indicatorWidth)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    animation.start();

    return () => {
      animation.stop();
      translateX.setValue(-indicatorWidth);
    };
  }, [duration, indicatorWidth, translateX, width]);

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: trackColor,
          borderRadius: height / 2,
          overflow: 'hidden'
        },
        style
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: indicatorWidth,
          backgroundColor: indicatorColor,
          borderRadius: height / 2,
          transform: [{ translateX }]
        }}
      />
    </View>
  );
};

export default IndeterminateProgressBar;
