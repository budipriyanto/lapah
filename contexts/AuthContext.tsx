// AuthContext - Simplified JWT auth using API routes
// Database queries go through API routes, not direct DB access

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface JWTUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "user" | "admin" | "moderator";
}

interface AuthContextValue {
  user: JWTUser | null;
  loading: boolean;
  role: "user" | "admin" | "moderator" | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionData {
  user: JWTUser;
  role: "user" | "admin" | "moderator";
}

// Cookie auth_token adalah HttpOnly sehingga tidak bisa dibaca dari
// document.cookie; cukup fetch /api/auth/me karena browser otomatis
// mengirimkan cookie (same-origin credentials). Murni fetch tanpa setState.
async function fetchSession(): Promise<SessionData | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch(`/api/auth/me`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.success && data.data) {
      return { user: data.data.user, role: data.data.role };
    }
    return null;
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [role, setRole] = useState<"user" | "admin" | "moderator" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const applySession = useCallback((session: SessionData | null) => {
    if (session) {
      setUser(session.user);
      setRole(session.role);
    } else {
      setUser(null);
      setRole(null);
    }
    setLoading(false);
  }, []);

  const getCurrentUser = useCallback(async () => {
    applySession(await fetchSession());
  }, [applySession]);

  // Bootstrap sesi saat mount — setState dipanggil lewat callback .then
  useEffect(() => {
    let stale = false;
    fetchSession().then((session) => {
      if (!stale) applySession(session);
    });
    return () => {
      stale = true;
    };
  }, [applySession]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await getCurrentUser();
  }, [getCurrentUser]);

  async function signIn(email: string, password: string): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return errorData.error || "Login failed";
      }

      await getCurrentUser();
      router.push("/");
      router.refresh();
      return null;
    } catch (error) {
      console.error("Login error:", error);
      return "Login failed. Please try again.";
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return errorData.error || "Registration failed";
      }

      // setelah register: TIDAK auto-login karena perlu verifikasi email
      // cek apakah ada query verified=1 (artinya dari link verifikasi langsung)
      const urlParams = new URLSearchParams(window.location.search);
      const alreadyVerified = urlParams.get('verified') === '1';

      if (alreadyVerified) {
        // user sudah diverifikasi dari link email, login langsung
        await getCurrentUser();
        router.push("/");
        router.refresh();
        return null;
      }

      // user baru daftar, arahkan ke halaman cek email
      // simpan email di localStorage agar bisa digunakan di halaman verify
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingRegisterEmail", email);
      }
      router.push("/auth/register?check_email=1");
      router.refresh();
      return null;
    } catch (error) {
      console.error("Registration error:", error);
      return "Registration failed. Please try again.";
    }
  }

  async function forgotPassword(email: string): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return errorData.error || "Failed to send reset email";
      }

      const data = await response.json();
      if (data?.error) {
        return data.error;
      }
      return null;
    } catch (error) {
      console.error("Forgot password error:", error);
      return "Failed. Please try again.";
    }
  }

  async function resetPassword(token: string, password: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return errorData.error || "Failed to reset password";
      }

      const data = await response.json();
      return data.message || null;
    } catch (error) {
      console.error("Reset password error:", error);
      return "Failed. Please try again.";
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setRole(null);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        signIn,
        signUp,
        signOut,
        refreshUser,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      role: null,
      signIn: async () => "AuthProvider not found",
      signUp: async () => "AuthProvider not found",
      signOut: async () => {},
      refreshUser: async () => {},
      forgotPassword: async () => "AuthProvider not found",
      resetPassword: async () => "AuthProvider not found",
    };
  }
  return ctx;
}