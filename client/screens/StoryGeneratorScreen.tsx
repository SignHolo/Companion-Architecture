import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/context/SettingsContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { DrawerParamList } from "@/navigation/DrawerNavigator";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "StoryGenerator">;
};

export default function StoryGeneratorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { apiKey, behaviorPrompt } = useSettings();
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isGenerating) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isGenerating]);

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a story prompt");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    if (!apiKey) {
      setError("Please set your Gemini API key in the drawer menu");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    setError("");
    setIsGenerating(true);
    setStory("");

    try {
      const response = await apiRequest("POST", "/api/generate-story", {
        prompt: prompt.trim(),
        apiKey,
        systemPrompt: behaviorPrompt,
      });

      const data = await response.json();
      setStory(data.story);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate story";
      setError(message);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (story) {
      await Clipboard.setStringAsync(story);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleClear = () => {
    setStory("");
    setPrompt("");
    setError("");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.openDrawer()}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          testID="button-menu"
        >
          <Feather name="menu" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <ThemedText
            style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold" }]}
          >
            AI Storyteller
          </ThemedText>
        </View>

        <View style={styles.headerButton} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <TextInput
            style={[
              styles.promptInput,
              {
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="What story shall we tell today?"
            placeholderTextColor={theme.textSecondary}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isGenerating}
            testID="input-prompt"
          />
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating}
          style={({ pressed }) => [
            styles.generateButton,
            {
              backgroundColor: theme.link,
              opacity: pressed ? 0.9 : isGenerating ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
            Shadows.button,
          ]}
          testID="button-generate"
        >
          {isGenerating ? (
            <ActivityIndicator color={theme.buttonText} size="small" />
          ) : (
            <Feather name="feather" size={20} color={theme.buttonText} />
          )}
          <ThemedText
            style={[
              styles.generateButtonText,
              {
                color: theme.buttonText,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {isGenerating ? "Crafting your story..." : "Generate Story"}
          </ThemedText>
        </Pressable>

        {error ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}
          >
            <Feather name="alert-circle" size={18} color={theme.error} />
            <ThemedText style={[styles.errorText, { color: theme.error }]}>
              {error}
            </ThemedText>
          </Animated.View>
        ) : null}

        {isGenerating && !story ? (
          <Animated.View style={[styles.loadingContainer, loadingStyle]}>
            <View
              style={[
                styles.loadingCard,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={[styles.shimmerLine, { backgroundColor: theme.backgroundTertiary, width: "90%" }]} />
              <View style={[styles.shimmerLine, { backgroundColor: theme.backgroundTertiary, width: "75%" }]} />
              <View style={[styles.shimmerLine, { backgroundColor: theme.backgroundTertiary, width: "85%" }]} />
              <View style={[styles.shimmerLine, { backgroundColor: theme.backgroundTertiary, width: "60%" }]} />
            </View>
          </Animated.View>
        ) : null}

        {story ? (
          <Animated.View
            entering={FadeInUp.duration(500).springify()}
            style={[
              styles.storyCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View style={styles.storyHeader}>
              <ThemedText
                style={[
                  styles.storyTitle,
                  { fontFamily: "PlayfairDisplay_600SemiBold" },
                ]}
              >
                Your Story
              </ThemedText>
              <View style={styles.storyActions}>
                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="button-copy"
                >
                  <Feather name="copy" size={18} color={theme.link} />
                </Pressable>
                <Pressable
                  onPress={handleClear}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="button-clear"
                >
                  <Feather name="trash-2" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
            <ThemedText
              style={[
                styles.storyText,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              {story}
            </ThemedText>
          </Animated.View>
        ) : null}

        {!story && !isGenerating && !error ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.emptyState}
          >
            <Image
              source={require("../../assets/images/empty-state-storybook.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText
              style={[
                styles.emptyTitle,
                {
                  fontFamily: "PlayfairDisplay_600SemiBold",
                  color: theme.text,
                },
              ]}
            >
              Ready to Create Magic
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textSecondary }]}
            >
              Enter a prompt above and let AI craft your story
            </ThemedText>
          </Animated.View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 28,
    height: 28,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  inputCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  promptInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  generateButtonText: {
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    marginBottom: Spacing.lg,
  },
  loadingCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  shimmerLine: {
    height: 16,
    borderRadius: 4,
  },
  storyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  storyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  storyTitle: {
    fontSize: 18,
  },
  storyActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 28,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
