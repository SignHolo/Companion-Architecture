import React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate 
} from 'react-native-reanimated';

interface TouchableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | TextStyle;
  activeOpacity?: number;
  scaleTo?: number;
  duration?: number;
}

export const TouchableScale: React.FC<TouchableScaleProps> = ({
  children,
  onPress,
  style,
  activeOpacity = 0.8,
  scaleTo = 0.95,
  duration = 100,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(scaleTo, { duration });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration });
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

interface TouchableBounceProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | TextStyle;
  bounciness?: number;
  speed?: number;
}

export const TouchableBounce: React.FC<TouchableBounceProps> = ({
  children,
  onPress,
  style,
  bounciness = 4,
  speed = 12,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { bounciness, speed });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { bounciness, speed });
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};