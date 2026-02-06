import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import Animated, {
  FadeInUp,
  FadeOutDown,
  Layout,
  ZoomInEasyUp,
  ZoomOutEasyDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Skeleton } from "@/components/Skeleton";
import { TouchableScale } from "@/components/MicroInteractions";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { DrawerParamList } from "@/navigation/DrawerNavigator";
import { formatTime } from "@/lib/utils";

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, "StoryGenerator">;
};

interface Message {
  id: string;
  role: "user" | "companion";
  text: string;
  timestamp: number;
}

export default function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const scrollViewRef = useRef<any>(null); // Reference for KeyboardAwareScrollViewCompat

  // Get dynamic styles based on theme
  const styles = getStyles(theme);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollViewRef.current) {
      // Use a delay to ensure the content has been rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchMessages = async () => {
    setIsLoading(true); // Set loading state when fetching
    try {
      const response = await apiRequest("GET", "/api/messages");
      if (response.ok) {
        const data = await response.json();
        const loadedMessages = data.messages.map((m: any) => ({
          id: m.id.toString(),
          role: m.role, // "user" | "assistant" -> map to "user" | "companion"
          text: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }));

        // Map role 'assistant'/'model' to 'companion' for UI logic
        const uiMessages = loadedMessages.map((m: any) => ({
            ...m,
            role: (m.role === 'user' ? 'user' : 'companion')
        }));

        setMessages(uiMessages);
      }
    } catch (error) {
      console.error("Failed to load chat history", error);
    } finally {
      setIsLoading(false); // Stop loading regardless of success or failure
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const response = await apiRequest("POST", "/api/chat", {
        message: userMsg.text,
      });

      if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Please configure API Key in settings.");
        }
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      const companionMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "companion",
        text: data.response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, companionMsg]);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "companion",
        text: `Error: ${error.message || "Something went wrong."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <Animated.View
        entering={FadeInUp.duration(300)}
        layout={Layout.springify().damping(20).stiffness(200)}
        style={[
          styles.messageContainer,
          {
            alignItems: isUser ? "flex-end" : "flex-start",
            marginHorizontal: Spacing.sm,
          }
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? {
                  backgroundColor: theme.link,
                  borderBottomRightRadius: 2,
                  borderTopRightRadius: 0,
                }
              : {
                  backgroundColor: theme.backgroundSecondary,
                  borderBottomLeftRadius: 2,
                  borderTopLeftRadius: 0,
                  borderWidth: 1,
                  borderColor: theme.border,
                },
          ]}
        >
          <ThemedText
            type="chatMessage"
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : theme.text },
            ]}
          >
            {item.text}
          </ThemedText>

          <View style={styles.timestampContainer}>
            <ThemedText type="chatTimestamp" style={[styles.timestamp, { color: theme.textSecondary }]}>
              {formatTime(new Date(item.timestamp))}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render skeleton loader for messages when loading
  const renderSkeletonMessage = (isUser: boolean) => {
    return (
      <View
        style={[
          styles.messageContainer,
          {
            alignItems: isUser ? "flex-end" : "flex-start",
            marginHorizontal: Spacing.sm,
          }
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? {
                  backgroundColor: theme.link,
                  borderBottomRightRadius: 2,
                  borderTopRightRadius: 0,
                }
              : {
                  backgroundColor: theme.backgroundSecondary,
                  borderBottomLeftRadius: 2,
                  borderTopLeftRadius: 0,
                  borderWidth: 1,
                  borderColor: theme.border,
                },
          ]}
        >
          <Skeleton width="80%" height={16} style={{ marginBottom: Spacing.xs }} />
          <Skeleton width="60%" height={16} style={{ marginBottom: Spacing.xs }} />
          <Skeleton width="40%" height={16} />
        </View>
      </View>
    );
  };

  // Calculate remaining characters
  const remainingChars = 1000 - input.length;

  return (
    <ThemedView style={[styles.container, Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === 'web' ? Spacing.md : insets.top + Spacing.md),
            backgroundColor: theme.backgroundRoot,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableScale
          onPress={() => navigation.openDrawer()}
          style={styles.headerButton}
          scaleTo={0.9}
        >
          <Feather name="menu" size={24} color={theme.text} />
        </TouchableScale>

        <ThemedText
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_600SemiBold", flex: 1, textAlign: "center" }]}
        >
          AI Companion
        </ThemedText>

        <View style={styles.headerButton} />
      </View>

      {/* Chat Area */}
      <KeyboardAwareScrollViewCompat
        ref={scrollViewRef}
        style={styles.chatList}
        contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: Spacing.xl } // Space for footer
        ]}
        keyboardShouldPersistTaps="handled"
        extraHeight={Platform.OS === "android" ? 120 : 80} // Extra height for Android
        extraScrollHeight={Platform.OS === "android" ? 120 : 80} // Extra scroll height for Android
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            {renderSkeletonMessage(false)}
            {renderSkeletonMessage(true)}
            {renderSkeletonMessage(false)}
            {renderSkeletonMessage(false)}
            {renderSkeletonMessage(true)}
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="message-square" size={40} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: Spacing.md }} />
            <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>Start a conversation with your AI Companion</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm, fontSize: 14 }}>
              Ask anything, share your thoughts, or just chat!
            </ThemedText>
          </View>
        ) : (
          messages.map((item, index) => (
            <View key={item.id} style={{ marginBottom: index === messages.length - 1 ? 0 : Spacing.md }}>
              {renderMessage({ item })}
            </View>
          ))
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Input Area */}
      {Platform.OS === "web" ? (
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.border,
              paddingBottom: Spacing.md,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
            style={[
                styles.input,
                {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
                fontFamily: "Inter_400Regular",
                },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            />

            {input.length > 0 && (
              <ThemedText style={[styles.charCount, { color: remainingChars < 100 ? theme.error : theme.textSecondary }]}>
                {remainingChars}
              </ThemedText>
            )}
          </View>

          <View style={styles.buttonContainer}>
            {/* Attachment Button */}
            <TouchableScale
              style={styles.attachmentButton}
              scaleTo={0.9}
              disabled={isSending}
            >
              <Feather name="paperclip" size={20} color={theme.textSecondary} />
            </TouchableScale>

            {/* Send Button */}
            <TouchableScale
            onPress={handleSend}
            disabled={isSending || !input.trim()}
            style={[
                styles.sendButton,
                {
                backgroundColor: theme.link,
                opacity: isSending || !input.trim() ? 0.7 : 1,
                },
            ]}
            scaleTo={0.95}
            >
            {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Feather name="send" size={20} color="#FFF" />
            )}
            </TouchableScale>
          </View>
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        enabled={Platform.OS !== "web"}
        style={{ flex: 0 }} // Only affect the keyboard-avoiding area
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.sm,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
            style={[
                styles.input,
                {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
                fontFamily: "Inter_400Regular",
                },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            />

            {input.length > 0 && (
              <ThemedText style={[styles.charCount, { color: remainingChars < 100 ? theme.error : theme.textSecondary }]}>
                {remainingChars}
              </ThemedText>
            )}
          </View>

          <View style={styles.buttonContainer}>
            {/* Attachment Button */}
            <TouchableScale
              style={styles.attachmentButton}
              scaleTo={0.9}
              disabled={isSending}
            >
              <Feather name="paperclip" size={20} color={theme.textSecondary} />
            </TouchableScale>

            {/* Send Button */}
            <TouchableScale
            onPress={handleSend}
            disabled={isSending || !input.trim()}
            style={[
                styles.sendButton,
                {
                backgroundColor: theme.link,
                opacity: isSending || !input.trim() ? 0.7 : 1,
                },
            ]}
            scaleTo={0.95}
            >
            {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Feather name="send" size={20} color="#FFF" />
            )}
            </TouchableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

// Define styles inside the component to access theme
const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_600SemiBold",
  },
  chatList: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: "90%",
  },
  messageBubble: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    maxWidth: "100%",
    position: "relative",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  timestampContainer: {
    position: "absolute",
    bottom: Spacing.xs,
    right: Spacing.md,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    alignItems: "flex-end",
    gap: Spacing.md,
  },
  inputWrapper: {
    flex: 1,
    position: "relative",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 150,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 22,
    paddingRight: 50, // Make space for character count
  },
  charCount: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.md,
    fontSize: 12,
    zIndex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  attachmentButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.backgroundSecondary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 120,
      paddingHorizontal: Spacing.xl,
  },
  loadingState: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  }
});
