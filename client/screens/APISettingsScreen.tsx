import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
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
import { apiRequest } from "@/lib/query-client";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "APISettings">;
};

type Provider = "gemini" | "mistral";

export default function APISettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { apiKey, setApiKey, isLoading } = useSettings();

  const [activeProvider, setActiveProvider] = useState<Provider>("gemini");

  // Gemini fields
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Mistral fields
  const [mistralKey, setMistralKey] = useState("");
  const [mistralModel, setMistralModel] = useState("");
  const [showMistralKey, setShowMistralKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Seed Gemini key from context
    setGeminiKey(apiKey || "");
  }, [apiKey]);

  useEffect(() => {
    // Load full settings from API to prefill all fields
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/settings");
        const data = await res.json();
        if (data.active_provider) setActiveProvider(data.active_provider as Provider);
        if (data.gemini_model) setGeminiModel(data.gemini_model);
        // Don't prefill masked keys — just show placeholder
      } catch { }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, string> = {
        active_provider: activeProvider,
      };

      if (geminiKey.trim() && !geminiKey.includes("...")) {
        payload.gemini_api_key = geminiKey.trim();
      }
      if (geminiModel.trim()) {
        payload.gemini_model = geminiModel.trim();
      }
      if (mistralKey.trim() && !mistralKey.includes("...")) {
        payload.mistral_api_key = mistralKey.trim();
      }
      if (mistralModel.trim()) {
        payload.mistral_model = mistralModel.trim();
      }

      await apiRequest("POST", "/api/settings", payload);

      if (activeProvider === "gemini" && geminiKey.trim() && !geminiKey.includes("...")) {
        await setApiKey(geminiKey.trim());
      }

      setTestResult({ success: true, message: "Settings saved successfully" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setTestResult({ success: false, message: "Failed to save settings" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.link} />
      </ThemedView>
    );
  }

  const providerColor = activeProvider === "mistral" ? "#FF7000" : theme.link;

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
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={24} color={theme.text} />
        </TouchableOpacity>

        <ThemedText
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold", flex: 1, textAlign: "center" }]}
        >
          API Configuration
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
        {/* --- Provider Selector --- */}
        <View
          style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.cardBorder }]}
        >
          <View style={styles.cardHeader}>
            <Feather name="cpu" size={24} color={providerColor} />
            <ThemedText style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Active Provider
            </ThemedText>
          </View>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            Select which AI backend powers your companion.
          </ThemedText>

          <View style={styles.providerToggleRow}>
            {(["gemini", "mistral"] as Provider[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setActiveProvider(p)}
                style={[
                  styles.providerButton,
                  {
                    borderColor: activeProvider === p ? providerColor : theme.border,
                    backgroundColor: activeProvider === p ? `${providerColor}15` : "transparent",
                  },
                ]}
                activeOpacity={0.7}
              >
                <Feather
                  name={p === "gemini" ? "zap" : "wind"}
                  size={16}
                  color={activeProvider === p ? providerColor : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.providerButtonText,
                    { color: activeProvider === p ? providerColor : theme.textSecondary },
                  ]}
                >
                  {p === "gemini" ? "Google Gemini" : "Mistral AI"}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* --- Gemini Settings --- */}
        {activeProvider === "gemini" && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.cardBorder }]}
          >
            <View style={styles.cardHeader}>
              <Feather name="key" size={24} color={theme.link} />
              <ThemedText style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                Gemini API Key
              </ThemedText>
            </View>

            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
              Get your key from Google AI Studio (aistudio.google.com).
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Enter your Gemini API key"
                placeholderTextColor={theme.textSecondary}
                value={geminiKey}
                onChangeText={setGeminiKey}
                secureTextEntry={!showGeminiKey}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-gemini-key"
              />
              <TouchableOpacity onPress={() => setShowGeminiKey(!showGeminiKey)} style={styles.eyeButton}>
                <Feather name={showGeminiKey ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Model Name</ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. gemini-2.5-flash"
                placeholderTextColor={theme.textSecondary}
                value={geminiModel}
                onChangeText={setGeminiModel}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-gemini-model"
              />
            </View>
          </Animated.View>
        )}

        {/* --- Mistral Settings --- */}
        {activeProvider === "mistral" && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.cardBorder }]}
          >
            <View style={styles.cardHeader}>
              <Feather name="key" size={24} color="#FF7000" />
              <ThemedText style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                Mistral API Key
              </ThemedText>
            </View>

            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
              Get your key from console.mistral.ai.
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Enter your Mistral API key"
                placeholderTextColor={theme.textSecondary}
                value={mistralKey}
                onChangeText={setMistralKey}
                secureTextEntry={!showMistralKey}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-mistral-key"
              />
              <TouchableOpacity onPress={() => setShowMistralKey(!showMistralKey)} style={styles.eyeButton}>
                <Feather name={showMistralKey ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Model Name</ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. mistral-large-latest"
                placeholderTextColor={theme.textSecondary}
                value={mistralModel}
                onChangeText={setMistralModel}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-mistral-model"
              />
            </View>
          </Animated.View>
        )}

        {/* --- Save Result --- */}
        {testResult && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.resultContainer,
              { backgroundColor: testResult.success ? `${theme.success}15` : `${theme.error}15` },
            ]}
          >
            <Feather
              name={testResult.success ? "check-circle" : "alert-circle"}
              size={18}
              color={testResult.success ? theme.success : theme.error}
            />
            <ThemedText style={[styles.resultText, { color: testResult.success ? theme.success : theme.error }]}>
              {testResult.message}
            </ThemedText>
          </Animated.View>
        )}

        {/* --- Save Button --- */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            { backgroundColor: providerColor, opacity: isSaving ? 0.5 : 1 },
            Shadows.button,
          ]}
          activeOpacity={0.7}
          testID="button-save"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="save" size={18} color="#FFFFFF" />
          )}
          <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
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
  cardTitle: { fontSize: 18 },
  description: { fontSize: 14, lineHeight: 22, marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, marginBottom: Spacing.sm, fontWeight: "500" },
  providerToggleRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  providerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  providerButtonText: { fontSize: 13, fontWeight: "600" },
  inputContainer: { position: "relative", marginBottom: Spacing.lg },
  input: {
    height: 52,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  resultContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  resultText: { fontSize: 14, flex: 1 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  saveButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
