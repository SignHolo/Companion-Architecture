import React from "react";
import { StyleSheet, View, Image, Pressable, AccessibilityInfo, Platform } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Feather } from "@expo/vector-icons";

import StoryGeneratorScreen from "@/screens/StoryGeneratorScreen";
import APISettingsScreen from "@/screens/APISettingsScreen";
import BehaviorPromptScreen from "@/screens/BehaviorPromptScreen";
import AboutScreen from "@/screens/AboutScreen";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export type DrawerParamList = {
  StoryGenerator: undefined;
  APISettings: undefined;
  BehaviorPrompt: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const { state, navigation } = props;

  const menuItems = [
    { name: "StoryGenerator", label: "AI Companion", icon: "message-circle" as const },
    { name: "APISettings", label: "API Configuration", icon: "key" as const },
    { name: "BehaviorPrompt", label: "Settings", icon: "settings" as const },
    { name: "About", label: "About", icon: "info" as const },
  ];

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessible={true}
          accessibilityLabel="AI Companion Logo"
        />
        <ThemedText
          style={[styles.appName, { fontFamily: "PlayfairDisplay_700Bold" }]}
          accessible={true}
          accessibilityRole="header"
        >
          AI Companion
        </ThemedText>
        <ThemedText
          style={[styles.tagline, { color: theme.textSecondary }]}
          accessible={true}
          accessibilityHint="Your personal digital friend"
        >
          Your personal digital friend
        </ThemedText>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={item.name}
              onPress={() => {
                navigation.navigate(item.name);
                // Close drawer after navigation for better UX
                if (Platform.OS === 'android' || Platform.OS === 'ios') {
                  AccessibilityInfo.announceForAccessibility(`Navigated to ${item.label}`);
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: isActive
                    ? theme.backgroundSecondary
                    : pressed
                      ? theme.backgroundTertiary
                      : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              accessibilityHint={`Navigate to ${item.label} screen`}
            >
              <Feather
                name={item.icon}
                size={20}
                color={isActive ? theme.link : theme.textSecondary}
                accessibilityElementsHidden={true}
                importantForAccessibility="no-hide-descendants"
              />
              <ThemedText
                style={[
                  styles.menuLabel,
                  {
                    color: isActive ? theme.link : theme.text,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <ThemedText
          style={[styles.version, { color: theme.textSecondary }]}
          accessible={true}
          accessibilityLabel="Application version 1.0.0"
        >
          Version 1.0.0
        </ThemedText>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="StoryGenerator"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: {
          backgroundColor: theme.backgroundRoot,
          width: 280,
        },
        overlayColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <Drawer.Screen
        name="StoryGenerator"
        component={StoryGeneratorScreen}
        options={{ title: "AI Companion" }}
      />
      <Drawer.Screen
        name="APISettings"
        component={APISettingsScreen}
        options={{ title: "API Configuration" }}
      />
      <Drawer.Screen
        name="BehaviorPrompt"
        component={BehaviorPromptScreen}
        options={{ title: "Settings" }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ title: "About" }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
  },
  menuContainer: {
    flex: 1,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  menuLabel: {
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 69, 19, 0.1)",
  },
  version: {
    fontSize: 12,
  },
});
