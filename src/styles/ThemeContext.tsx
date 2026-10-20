import React, { createContext, useContext } from "react";
import { THEMES, Theme } from "./themes";

const Ctx = createContext<Theme>(THEMES.main);

export const ThemeProvider: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => (
  <Ctx.Provider value={theme}>{children}</Ctx.Provider>
);

export const useTheme = () => useContext(Ctx);
