import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthUser } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap once on mount. Do NOT re-run on every token change —
  // that used to call /auth/me after login and clear a valid session
  // whenever me() briefly failed (network blip / proxy / rate noise).
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const existing = localStorage.getItem("aurelia_token");
      if (!existing) {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await authApi.me();
        if (!active) return;
        setToken(existing);
        setUser(data.user);
      } catch {
        localStorage.removeItem("aurelia_token");
        if (!active) return;
        setToken(null);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email.trim(), password);
    if (!data?.token || !data?.user) {
      throw new Error("Login response was incomplete. Please try again.");
    }
    localStorage.setItem("aurelia_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("aurelia_token");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
