import React from "react";
import { StyleSheet, View, Image, Pressable } from "react-native";
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
    { name: "StoryGenerator", label: "Story Generator", icon: "book-open" as const },
    { name: "APISettings", label: "API Settings", icon: "key" as const },
    { name: "BehaviorPrompt", label: "Story Preferences", icon: "sliders" as const },
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
        />
        <ThemedText
          style={[styles.appName, { fontFamily: "PlayfairDisplay_700Bold" }]}
        >
          AI Storyteller
        </ThemedText>
        <ThemedText
          style={[styles.tagline, { color: theme.textSecondary }]}
        >
          Transform ideas into stories
        </ThemedText>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={item.name}
              onPress={() => navigation.navigate(item.name)}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: isActive
                    ? theme.backgroundSecondary
                    : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name={item.icon}
                size={20}
                color={isActive ? theme.link : theme.textSecondary}
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
        <ThemedText style={[styles.version, { color: theme.textSecondary }]}>
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
      <Drawer.Screen name="StoryGenerator" component={StoryGeneratorScreen} />
      <Drawer.Screen name="APISettings" component={APISettingsScreen} />
      <Drawer.Screen name="BehaviorPrompt" component={BehaviorPromptScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
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
