import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  behaviorPrompt: string;
  setBehaviorPrompt: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

const defaultBehaviorPrompt = `You are a creative storyteller. When given a prompt, craft an engaging, imaginative story with vivid descriptions, compelling characters, and an interesting narrative arc. Keep stories concise but captivating, around 300-500 words unless specified otherwise.`;

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  API_KEY: "@ai_storyteller_api_key",
  BEHAVIOR_PROMPT: "@ai_storyteller_behavior_prompt",
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [behaviorPrompt, setBehaviorPromptState] = useState(defaultBehaviorPrompt);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedApiKey, savedBehaviorPrompt] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.BEHAVIOR_PROMPT),
      ]);
      
      if (savedApiKey) setApiKeyState(savedApiKey);
      if (savedBehaviorPrompt) setBehaviorPromptState(savedBehaviorPrompt);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setApiKey = async (key: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, key);
      setApiKeyState(key);
    } catch (error) {
      console.error("Error saving API key:", error);
      throw error;
    }
  };

  const setBehaviorPrompt = async (prompt: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BEHAVIOR_PROMPT, prompt);
      setBehaviorPromptState(prompt);
    } catch (error) {
      console.error("Error saving behavior prompt:", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        behaviorPrompt,
        setBehaviorPrompt,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
