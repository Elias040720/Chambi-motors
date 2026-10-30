import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  background: "#101214",
  surface: "#1b1e23",
  border: "#41464f",
  yellow: "#ffda19",
  text: "#f7f8fa",
  muted: "#bdc6d2",
  danger: "#ffb3af",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  title: { fontSize: 28, color: colors.text, fontWeight: "800" },
  heading: { color: colors.text, fontSize: 20, fontWeight: "700" },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  input: {
    backgroundColor: "#111316",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  },
});
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Copy({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={muted ? styles.muted : styles.text}>{children}</Text>;
}
export function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: danger ? colors.danger : colors.yellow,
        backgroundColor: secondary || danger ? "transparent" : colors.yellow,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      <Text
        style={{
          color: danger ? colors.danger : secondary ? colors.yellow : "#111",
          fontWeight: "700",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8e98a5"
        selectionColor={colors.yellow}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 88, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Notice({ text, error = false }: { text?: string; error?: boolean }) {
  return text ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: error ? colors.danger : colors.yellow, fontSize: 15, lineHeight: 22 }}
    >
      {text}
    </Text>
  ) : null;
}
export function Busy() {
  return <ActivityIndicator size="large" color={colors.yellow} accessibilityLabel="Cargando" />;
}
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 48,
        padding: 12,
        borderWidth: 1,
        borderColor: selected ? colors.yellow : colors.border,
        backgroundColor: selected ? "#383211" : "#131519",
        borderRadius: 10,
      }}
    >
      <Text style={styles.text}>
        {selected ? "✓ " : "○ "}
        {label}
      </Text>
    </Pressable>
  );
}
