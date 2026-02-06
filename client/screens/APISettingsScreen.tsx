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

export default function APISettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { apiKey, setApiKey, isLoading } = useSettings();
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

  // Validate API key format
  const validateApiKey = (key: string): boolean => {
    if (!key.trim()) {
      setValidationError("API key is required");
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateApiKey(inputValue)) return;

    setIsSaving(true);
    try {
      // 1. Save to Backend using apiRequest helper (handles Base URL)
      await apiRequest("POST", "/api/settings", {
        gemini_api_key: inputValue.trim(),
        gemini_model: "gemini-3-pro-preview",
      });
      // 2. Update Local Context (Legacy/UI sync)
      await setApiKey(inputValue.trim());

      setTestResult({ success: true, message: "API key saved successfully" });
      setValidationError(null);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error(error);
      setTestResult({ success: false, message: "Failed to save API key" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validateApiKey(inputValue)) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${inputValue.trim()}`
      );

      if (response.ok) {
        setTestResult({ success: true, message: "Connection successful! API key is valid." });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        const data = await response.json();
        setTestResult({
          success: false,
          message: data.error?.message || "Invalid API key",
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (error) {
      setTestResult({ success: false, message: "Failed to test connection" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Handle input changes with real-time validation
  const handleInputChange = (text: string) => {
    setInputValue(text);
    setTestResult(null);

    // Clear validation error if user is typing
    if (text.length > 0) {
      validateApiKey(text);
    } else {
      setValidationError(null);
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
            <Feather name="key" size={24} color={theme.link} />
            <ThemedText
              style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Gemini API Key
            </ThemedText>
          </View>

          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            Enter your Google Gemini API key to enable story generation. You can get
            one from Google AI Studio.
          </ThemedText>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                validationError && { borderColor: theme.error },
                {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Enter your API key"
              placeholderTextColor={theme.textSecondary}
              value={inputValue}
              onChangeText={handleInputChange}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-api-key"
            />
            <TouchableOpacity
              onPress={() => setShowKey(!showKey)}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {validationError && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.validationErrorContainer,
                {
                  backgroundColor: `${theme.error}15`,
                },
              ]}
            >
              <Feather
                name="alert-circle"
                size={18}
                color={theme.error}
              />
              <ThemedText
                style={[
                  styles.validationErrorText,
                  { color: theme.error },
                ]}
              >
                {validationError}
              </ThemedText>
            </Animated.View>
          )}

          {testResult ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.resultContainer,
                {
                  backgroundColor: testResult.success
                    ? `${theme.success}15`
                    : `${theme.error}15`,
                },
              ]}
            >
              <Feather
                name={testResult.success ? "check-circle" : "alert-circle"}
                size={18}
                color={testResult.success ? theme.success : theme.error}
              />
              <ThemedText
                style={[
                  styles.resultText,
                  { color: testResult.success ? theme.success : theme.error },
                ]}
              >
                {testResult.message}
              </ThemedText>
            </Animated.View>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleTest}
              disabled={isTesting || !inputValue.trim() || !!validationError}
              style={[
                styles.secondaryButton,
                {
                  borderColor: theme.link,
                  opacity: isTesting || !inputValue.trim() || !!validationError ? 0.5 : 1,
                },
              ]}
              activeOpacity={0.7}
              testID="button-test"
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={theme.link} />
              ) : (
                <Feather name="zap" size={18} color={theme.link} />
              )}
              <ThemedText style={[styles.secondaryButtonText, { color: theme.link }]}>
                Test Connection
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || !inputValue.trim() || !!validationError}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.link,
                  opacity: isSaving || !inputValue.trim() || !!validationError ? 0.5 : 1,
                },
                Shadows.button,
              ]}
              activeOpacity={0.7}
              testID="button-save"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <Feather name="save" size={18} color={theme.buttonText} />
              )}
              <ThemedText
                style={[styles.primaryButtonText, { color: theme.buttonText }]}
              >
                Save Key
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: `${theme.accent}20`,
              borderColor: theme.accent,
            },
          ]}
        >
          <Feather name="info" size={20} color={theme.accent} />
          <View style={styles.infoContent}>
            <ThemedText
              style={[styles.infoTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              How to get an API key
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              1. Visit Google AI Studio (aistudio.google.com){"\n"}
              2. Sign in with your Google account{"\n"}
              3. Click "Get API key" and create a new key{"\n"}
              4. Copy the key and paste it above
            </ThemedText>
          </View>
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
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
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
  validationErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  validationErrorText: {
    fontSize: 14,
    flex: 1,
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
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
