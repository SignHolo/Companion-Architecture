import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = BorderRadius.md,
  style 
}) => {
  const { theme } = useTheme();
  
  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: theme.backgroundSecondary,
          width,
          height,
          borderRadius,
        },
        style
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    opacity: 0.6,
  },
});