import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@/lib/types";
import { fetchMe, login as apiLogin, setAuthToken, getAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, login: async () => false, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => setAuthToken(null))
      .finally(() => setIsBootstrapping(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { token, user: authedUser } = await apiLogin(email, password);
      setAuthToken(token);
      setUser(authedUser);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  if (isBootstrapping) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
