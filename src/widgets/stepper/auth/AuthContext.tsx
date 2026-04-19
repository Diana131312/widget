import React, { createContext, useContext } from "react";
import type { UserInfoResponse } from "../../../api";

export type WidgetAuthState = {
  token: string | null;
  user: UserInfoResponse | null;
  isBootstrapping: boolean;
};

const AuthContext = createContext<WidgetAuthState>({
  token: null,
  user: null,
  isBootstrapping: false,
});

type ProviderProps = {
  value: WidgetAuthState;
  children: React.ReactNode;
};

export const WidgetAuthProvider: React.FC<ProviderProps> = ({ value, children }) => {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useWidgetAuth(): WidgetAuthState {
  return useContext(AuthContext);
}
