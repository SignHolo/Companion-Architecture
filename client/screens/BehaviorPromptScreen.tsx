import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
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
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { DrawerParamList } from "@/navigation/DrawerNavigator";
import { apiRequest } from "@/lib/query-client";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "BehaviorPrompt">;
};

type Tab = "core" | "personality" | "appearance" | "persona";

interface SettingsState {
  system_core: string;
  companion_personality: {
    name: string;
    tone: string;
    traits: string[];
  };
  companion_appearance: string;
  user_persona: {
    name: string;
    preferences: string[];
  };
}

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("core");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form State
  const [settings, setSettings] = useState<SettingsState>({
    system_core: "",
    companion_personality: { name: "", tone: "", traits: [] },
    companion_appearance: "",
    user_persona: { name: "", preferences: [] },
  });

  // Temporary text areas for array fields
  const [traitsText, setTraitsText] = useState("");
  const [preferencesText, setPreferencesText] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/settings");
      if (response.ok) {
        const data = await response.json();
        
        let personality = { name: "", tone: "", traits: [] };
        try {
          personality = JSON.parse(data.companion_personality || "{}");
        } catch (e) {}

        let persona = { name: "", preferences: [] };
        try {
          persona = JSON.parse(data.user_persona || "{}");
        } catch (e) {}

        setSettings({
          system_core: data.system_core || "",
          companion_personality: personality,
          companion_appearance: data.companion_appearance || "",
          user_persona: persona,
        });

        setTraitsText(Array.isArray(personality.traits) ? personality.traits.join("\n") : "");
        setPreferencesText(Array.isArray(persona.preferences) ? persona.preferences.join("\n") : "");
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      // Prepare payload
      const payload = {
        system_core: settings.system_core,
        companion_personality: JSON.stringify({
          ...settings.companion_personality,
          traits: traitsText.split("\n").filter(t => t.trim().length > 0),
        }),
        companion_appearance: settings.companion_appearance,
        user_persona: JSON.stringify({
          ...settings.user_persona,
          preferences: preferencesText.split("\n").filter(p => p.trim().length > 0),
        }),
      };

      const response = await apiRequest("POST", "/api/settings", payload);

      if (response.ok) {
        setSaveResult({ success: true, message: "Settings saved successfully" });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      setSaveResult({ success: false, message: "Failed to save settings" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {(["core", "personality", "appearance", "persona"] as Tab[]).map((tab) => (
        <Pressable
          key={tab}
          onPress={() => {
            setActiveTab(tab);
            setSaveResult(null);
          }}
          style={({ pressed }) => [
            styles.tab,
            {
              backgroundColor: activeTab === tab ? theme.link : "transparent",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText
            style={[ 
              styles.tabText,
              {
                color: activeTab === tab ? "#FFF" : theme.textSecondary,
                fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_500Medium",
                fontSize: 12, // Reduced font size to fit 4 tabs
              },
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderContent = () => {
    if (activeTab === "core") {
      return (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            System Core Instructions (Fixed Logic)
          </ThemedText>
          <TextInput
            style={[ 
              styles.textArea,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text,
                minHeight: 200,
              },
            ]}
            value={settings.system_core}
            onChangeText={(text) => setSettings({ ...settings, system_core: text })}
            multiline
            textAlignVertical="top"
            placeholder="Define the core identity and unshakeable rules..."
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      );
    }

    if (activeTab === "personality") {
      return (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Name</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
            value={settings.companion_personality.name}
            onChangeText={(text) =>
              setSettings({
                ...settings,
                companion_personality: { ...settings.companion_personality, name: text },
              })
            }
            placeholder="Companion Name"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Tone</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
            value={settings.companion_personality.tone}
            onChangeText={(text) =>
              setSettings({
                ...settings,
                companion_personality: { ...settings.companion_personality, tone: text },
              })
            }
            placeholder="e.g. Warm, Sarcastic, Professional"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Traits (One per line)
          </ThemedText>
          <TextInput
            style={[ 
              styles.textArea,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text,
                minHeight: 150,
              },
            ]}
            value={traitsText}
            onChangeText={setTraitsText}
            multiline
            textAlignVertical="top"
            placeholder="e.g. Speaks gently&#10;Uses emojis&#10;Never judges"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      );
    }

    if (activeTab === "appearance") {
      return (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Visual Description
          </ThemedText>
          <TextInput
            style={[ 
              styles.textArea,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text,
                minHeight: 200,
              },
            ]}
            value={settings.companion_appearance}
            onChangeText={(text) => setSettings({ ...settings, companion_appearance: text })}
            multiline
            textAlignVertical="top"
            placeholder="Describe how the companion looks (e.g., hair color, style, clothing, vibe)..."
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      );
    }

    if (activeTab === "persona") {
      return (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>User Name</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
            value={settings.user_persona.name}
            onChangeText={(text) =>
              setSettings({
                ...settings,
                user_persona: { ...settings.user_persona, name: text },
              })
            }
            placeholder="Your Name"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Preferences & Facts (One per line)
          </ThemedText>
          <TextInput
            style={[ 
              styles.textArea,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text,
                minHeight: 150,
              },
            ]}
            value={preferencesText}
            onChangeText={setPreferencesText}
            multiline
            textAlignVertical="top"
            placeholder="e.g. Likes sci-fi&#10;Hates broccoli&#10;Works as a designer"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      );
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
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold", flex: 1, textAlign: "center" }]}
        >
          Settings
        </ThemedText>

        <View style={styles.headerButton} />
      </View>

      <View style={styles.tabsWrapper}>{renderTabs()}</View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[ 
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View
          style={[ 
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          {renderContent()}

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
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: theme.link,
                opacity: pressed ? 0.9 : isSaving ? 0.5 : 1,
              },
              Shadows.button,
            ]}
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
              Save Changes
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
  tabsWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  tabText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 24,
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
    marginTop: Spacing.md,
  },
  saveButtonText: {
    fontSize: 16,
  },
});