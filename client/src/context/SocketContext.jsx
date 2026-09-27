import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { playNotificationSound } from "../lib/notificationSound.js";
import { showBrowserNotification, requestNotificationPermission } from "../lib/browserNotify.js";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Request browser notification permission on login
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected");
      setConnected(true);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("notification", (n) => {
      // Play sound
      playNotificationSound();

      // Show browser notification
      showBrowserNotification("TaskFlow Pro", n.message, () => {
        if (n.link) window.location.href = n.link;
      });

      // Dispatch event for in-app handling (dropdowns, etc.)
      window.dispatchEvent(new CustomEvent("notification", { detail: n }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ ...socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
}