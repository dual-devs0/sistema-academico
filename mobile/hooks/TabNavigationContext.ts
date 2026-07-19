import { createContext, useContext } from "react";

export type TabKey = "index" | "cursos" | "horario" | "perfil";

export const TabNavigationContext = createContext<(tab: TabKey) => void>(() => {});

export const useTabNavigation = () => useContext(TabNavigationContext);
