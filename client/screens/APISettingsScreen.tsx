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

  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setApiKey(inputValue.trim());
      setTestResult({ success: true, message: "API key saved successfully" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setTestResult({ success: false, message: "Failed to save API key" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!inputValue.trim()) {
      setTestResult({ success: false, message: "Please enter an API key first" });
      return;
    }

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
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Enter your API key"
              placeholderTextColor={theme.textSecondary}
              value={inputValue}
              onChangeText={(text) => {
                setInputValue(text);
                setTestResult(null);
              }}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-api-key"
            />
            <Pressable
              onPress={() => setShowKey(!showKey)}
              style={({ pressed }) => [
                styles.eyeButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

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
            <Pressable
              onPress={handleTest}
              disabled={isTesting || !inputValue.trim()}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.link,
                  opacity: pressed ? 0.8 : isTesting || !inputValue.trim() ? 0.5 : 1,
                },
              ]}
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
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSaving || !inputValue.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
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
                style={[styles.primaryButtonText, { color: theme.buttonText }]}
              >
                Save Key
              </ThemedText>
            </Pressable>
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
