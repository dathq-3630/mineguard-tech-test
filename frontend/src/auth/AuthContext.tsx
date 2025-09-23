import { createContext, useContext, useMemo, useState } from "react";

type User = { username: string };

type AuthContextValue = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const USERS: Record<string, string> = {
  "ha.quoc.dat": "Aa@123456",
  "gem.caglar": "Aa@123456",
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(username: string, password: string) {
    const ok = USERS[username] === password;
    if (ok) {
      const nextUser = { username };
      setUser(nextUser);
      localStorage.setItem("auth_user", JSON.stringify(nextUser));
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("auth_user");
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
