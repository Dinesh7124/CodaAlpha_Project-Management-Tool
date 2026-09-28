import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // Full login (with token) — for sign in / register
  const login = (token, user) => {
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  // Partial update — for profile changes without re-login
  const updateUser = (partial) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...partial };
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}