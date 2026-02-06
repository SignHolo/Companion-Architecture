import React from "react";
import { StyleSheet, View, Image, Pressable, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DrawerParamList } from "@/navigation/DrawerNavigator";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "About">;
};

export default function AboutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleOpenAIStudio = async () => {
    try {
      await Linking.openURL("https://aistudio.google.com/");
    } catch (error) {
      console.error("Failed to open URL:", error);
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
        >
          <Feather name="menu" size={24} color={theme.text} />
        </Pressable>

        <ThemedText
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold", flex: 1, textAlign: "center" }]}
        >
          About
        </ThemedText>

        <View style={styles.headerButton} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View
          entering={FadeInUp.duration(500).delay(100)}
          style={styles.logoContainer}
        >
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <ThemedText
            style={[
              styles.appName,
              { fontFamily: "PlayfairDisplay_700Bold" },
            ]}
          >
            AI Storyteller
          </ThemedText>
          <ThemedText style={[styles.version, { color: theme.textSecondary }]}>
            Version 1.0.0
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(500).delay(300)}
          style={[
            styles.descriptionCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <ThemedText style={[styles.description, { lineHeight: 26 }]}>
            Transform your ideas into captivating stories with the power of AI.
            Whether you're looking for fantasy adventures, mysterious tales, or
            heartfelt romances, AI Storyteller brings your imagination to life.
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(500).delay(400)}
          style={styles.featuresContainer}
        >
          <FeatureItem
            icon="feather"
            title="AI-Powered Stories"
            description="Powered by Google Gemini"
            theme={theme}
          />
          <FeatureItem
            icon="sliders"
            title="Customizable Style"
            description="Choose your storytelling preferences"
            theme={theme}
          />
          <FeatureItem
            icon="zap"
            title="Instant Generation"
            description="Get stories in seconds"
            theme={theme}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(500).delay(500)}
          style={styles.footer}
        >
          <Pressable
            onPress={handleOpenAIStudio}
            style={({ pressed }) => [
              styles.linkButton,
              {
                borderColor: theme.link,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="external-link" size={18} color={theme.link} />
            <ThemedText style={[styles.linkText, { color: theme.link }]}>
              Get API Key from Google AI Studio
            </ThemedText>
          </Pressable>

          <ThemedText style={[styles.credits, { color: theme.textSecondary }]}>
            Built with React Native and Expo
          </ThemedText>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIcon,
          { backgroundColor: `${theme.link}15` },
        ]}
      >
        <Feather name={icon} size={20} color={theme.link} />
      </View>
      <View style={styles.featureText}>
        <ThemedText
          style={[styles.featureTitle, { fontFamily: "Inter_600SemiBold" }]}
        >
          {title}
        </ThemedText>
        <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
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
  headerTitle: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  logoContainer: {
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  version: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  descriptionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    width: "100%",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
  },
  featuresContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: Spacing.lg,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  credits: {
    fontSize: 12,
    textAlign: "center",
  },
});
