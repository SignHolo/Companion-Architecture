import React from "react";
import { Text, StyleSheet, type TextStyle, Platform } from "react-native";
import { Fonts } from "@/constants/theme";

/**
 * FormattedText — a lightweight inline markdown renderer for React Native.
 * 
 * Supported syntax:
 *   **bold**       → bold text
 *   *italic*       → italic text
 *   ***both***     → bold + italic
 *   `code`         → monospace inline code
 *   ~~strike~~     → strikethrough
 *   _underline_    → italic (standard markdown behavior)
 * 
 * This uses nested <Text> elements (the only cross-platform text layout
 * approach in React Native). It does NOT support block-level markdown
 * (headers, lists, images, etc.) — it's designed for chat messages.
 */

interface FormattedTextProps {
    children: string;
    style?: TextStyle | TextStyle[];
    baseColor?: string;
}

// Token types for our inline parser
type Token =
    | { type: "text"; content: string }
    | { type: "bold"; content: string }
    | { type: "italic"; content: string }
    | { type: "boldItalic"; content: string }
    | { type: "code"; content: string }
    | { type: "strike"; content: string };

function tokenize(text: string): Token[] {
    const tokens: Token[] = [];

    // Regex matches in priority order: bold+italic, bold, italic, code, strikethrough
    // We use a combined regex with named groups to process all patterns in a single pass
    const pattern = /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\~\~(.+?)\~\~)/g;

    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        // Push any text before this match
        if (match.index > lastIndex) {
            tokens.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }

        if (match[1]) {
            // ***bold italic***
            tokens.push({ type: "boldItalic", content: match[2] });
        } else if (match[3]) {
            // **bold**
            tokens.push({ type: "bold", content: match[4] });
        } else if (match[5]) {
            // *italic*
            tokens.push({ type: "italic", content: match[6] });
        } else if (match[7]) {
            // `code`
            tokens.push({ type: "code", content: match[8] });
        } else if (match[9]) {
            // ~~strikethrough~~
            tokens.push({ type: "strike", content: match[10] });
        }

        lastIndex = match.index + match[0].length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
        tokens.push({ type: "text", content: text.slice(lastIndex) });
    }

    return tokens;
}

export function FormattedText({ children, style, baseColor }: FormattedTextProps) {
    if (!children || typeof children !== "string") {
        return <Text style={style}>{children}</Text>;
    }

    const tokens = tokenize(children);

    // If no formatting tokens found, return plain text
    if (tokens.length === 1 && tokens[0].type === "text") {
        return <Text style={style}>{children}</Text>;
    }

    return (
        <Text style={style}>
            {tokens.map((token, index) => {
                switch (token.type) {
                    case "bold":
                        return (
                            <Text key={index} style={styles.bold}>
                                {token.content}
                            </Text>
                        );
                    case "italic":
                        return (
                            <Text key={index} style={styles.italic}>
                                {token.content}
                            </Text>
                        );
                    case "boldItalic":
                        return (
                            <Text key={index} style={styles.boldItalic}>
                                {token.content}
                            </Text>
                        );
                    case "code":
                        return (
                            <Text
                                key={index}
                                style={[
                                    styles.code,
                                    baseColor ? { color: baseColor } : undefined,
                                ]}
                            >
                                {token.content}
                            </Text>
                        );
                    case "strike":
                        return (
                            <Text key={index} style={styles.strike}>
                                {token.content}
                            </Text>
                        );
                    default:
                        return <Text key={index}>{token.content}</Text>;
                }
            })}
        </Text>
    );
}

const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    web: Fonts?.mono || "monospace",
    default: "monospace",
});

const styles = StyleSheet.create({
    bold: {
        fontWeight: "700",
    },
    italic: {
        fontStyle: "italic",
    },
    boldItalic: {
        fontWeight: "700",
        fontStyle: "italic",
    },
    code: {
        fontFamily: monoFont,
        fontSize: 14,
        backgroundColor: "rgba(128, 128, 128, 0.15)",
        borderRadius: 4,
        paddingHorizontal: 4,
    },
    strike: {
        textDecorationLine: "line-through",
    },
});
