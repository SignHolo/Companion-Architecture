import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/context/SettingsContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { DrawerParamList } from "@/navigation/DrawerNavigator";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "BehaviorPrompt">;
};

const PRESETS = [
  {
    name: "Fantasy",
    icon: "sunrise" as const,
    prompt:
      "You are a fantasy storyteller specializing in magical worlds, mythical creatures, and epic adventures. Create stories with rich worldbuilding, enchanting settings, and heroic journeys. Include elements like magic, dragons, elves, or other fantastical beings.",
  },
  {
    name: "Mystery",
    icon: "search" as const,
    prompt:
      "You are a mystery writer crafting suspenseful tales with twists and turns. Create stories with intriguing puzzles, suspicious characters, and satisfying revelations. Build tension gradually and keep readers guessing until the end.",
  },
  {
    name: "Sci-Fi",
    icon: "zap" as const,
    prompt:
      "You are a science fiction author exploring futuristic worlds and advanced technology. Create stories set in space, featuring AI, time travel, or alien civilizations. Blend scientific concepts with compelling human drama.",
  },
  {
    name: "Romance",
    icon: "heart" as const,
    prompt:
      "You are a romance writer creating heartfelt love stories. Focus on emotional connections, character development, and the journey of relationships. Include tender moments, meaningful dialogue, and satisfying emotional arcs.",
  },
];

export default function BehaviorPromptScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { behaviorPrompt, setBehaviorPrompt, isLoading } = useSettings();
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(behaviorPrompt);
    const matchingPreset = PRESETS.find((p) => p.prompt === behaviorPrompt);
    setSelectedPreset(matchingPreset?.name || null);
  }, [behaviorPrompt]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setBehaviorPrompt(inputValue.trim());
      setSaveResult({ success: true, message: "Preferences saved successfully" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setSaveResult({ success: false, message: "Failed to save preferences" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setInputValue(preset.prompt);
    setSelectedPreset(preset.name);
    setSaveResult(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.link} />
      </ThemedView>
    );
  }

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
        >
          <Feather name="menu" size={24} color={theme.text} />
        </Pressable>

        <ThemedText
          style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold" }]}
        >
          Story Preferences
        </ThemedText>

        <View style={styles.headerButton} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <ThemedText style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Quick Presets
        </ThemedText>
        <ThemedText style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Choose a storytelling style or customize your own below
        </ThemedText>

        <View style={styles.presetsGrid}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset.name}
              onPress={() => handlePresetSelect(preset)}
              style={({ pressed }) => [
                styles.presetButton,
                {
                  backgroundColor:
                    selectedPreset === preset.name
                      ? theme.link
                      : theme.backgroundDefault,
                  borderColor:
                    selectedPreset === preset.name ? theme.link : theme.cardBorder,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              testID={`button-preset-${preset.name.toLowerCase()}`}
            >
              <Feather
                name={preset.icon}
                size={22}
                color={selectedPreset === preset.name ? theme.buttonText : theme.link}
              />
              <ThemedText
                style={[
                  styles.presetText,
                  {
                    color:
                      selectedPreset === preset.name ? theme.buttonText : theme.text,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {preset.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Feather name="edit-3" size={20} color={theme.link} />
            <ThemedText
              style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Custom System Prompt
            </ThemedText>
          </View>

          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            Customize how the AI tells your stories. Be specific about tone, style,
            length, and any elements you want included.
          </ThemedText>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Enter your custom storytelling instructions..."
            placeholderTextColor={theme.textSecondary}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setSelectedPreset(null);
              setSaveResult(null);
            }}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            testID="input-behavior-prompt"
          />

          {saveResult ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.resultContainer,
                {
                  backgroundColor: saveResult.success
                    ? `${theme.success}15`
                    : `${theme.error}15`,
                },
              ]}
            >
              <Feather
                name={saveResult.success ? "check-circle" : "alert-circle"}
                size={18}
                color={saveResult.success ? theme.success : theme.error}
              />
              <ThemedText
                style={[
                  styles.resultText,
                  { color: saveResult.success ? theme.success : theme.error },
                ]}
              >
                {saveResult.message}
              </ThemedText>
            </Animated.View>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={isSaving || !inputValue.trim()}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: theme.link,
                opacity: pressed ? 0.9 : isSaving || !inputValue.trim() ? 0.5 : 1,
              },
              Shadows.button,
            ]}
            testID="button-save"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <Feather name="save" size={18} color={theme.buttonText} />
            )}
            <ThemedText
              style={[
                styles.saveButtonText,
                { color: theme.buttonText, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Save Preferences
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
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
  headerTitle: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  presetText: {
    fontSize: 14,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  textArea: {
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 160,
    marginBottom: Spacing.lg,
  },
  resultContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
  },
});
