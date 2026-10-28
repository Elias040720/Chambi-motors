import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { focusManager } from "@tanstack/react-query";
import { SessionProvider } from "../lib/session";
export default function Layout() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#121417" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#101214" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "CHAMBI MOTORS" }} />
        <Stack.Screen name="intake" options={{ title: "Registrar ingreso" }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Orden de trabajo" }} />
        <Stack.Screen name="customers" options={{ title: "Clientes y vehículos" }} />
        <Stack.Screen name="settings" options={{ title: "Ajustes del taller" }} />
      </Stack>
    </SessionProvider>
  );
}
