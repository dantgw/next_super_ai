"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({
  children,
}: Omit<ThemeProviderProps, "attribute" | "defaultTheme">) {
  return (
    <NextThemesProvider forcedTheme="light" attribute="class">
      {children}
    </NextThemesProvider>
  );
}
