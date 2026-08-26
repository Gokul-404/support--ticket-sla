import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { LOGIN, ME, REGISTER } from "../graphql/operations";
import type { AuthPayload, User, UserRole } from "../types";

export const AUTH_TOKEN_KEY = "sla_tracker_token";

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY)
  );

  const { data, loading, refetch } = useQuery<{ me: User | null }>(ME, {
    skip: !token,
    fetchPolicy: "network-only",
  });

  const [loginMutation] = useMutation<{ login: AuthPayload }>(LOGIN);
  const [registerMutation] = useMutation<{ register: AuthPayload }>(REGISTER);

  useEffect(() => {
    if (token) refetch();
  }, [token, refetch]);

  const login = async (email: string, password: string) => {
    const { data: result } = await loginMutation({ variables: { input: { email, password } } });
    if (!result) throw new Error("Login failed.");
    localStorage.setItem(AUTH_TOKEN_KEY, result.login.token);
    setToken(result.login.token);
    await apolloClient.resetStore();
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    const { data: result } = await registerMutation({
      variables: { input: { name, email, password, role } },
    });
    if (!result) throw new Error("Registration failed.");
    localStorage.setItem(AUTH_TOKEN_KEY, result.register.token);
    setToken(result.register.token);
    await apolloClient.resetStore();
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    apolloClient.clearStore();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: token ? data?.me ?? null : null,
      loading: Boolean(token) && loading,
      login,
      register,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, data, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
