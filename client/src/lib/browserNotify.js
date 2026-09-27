export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("Browser notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") return true;

  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showBrowserNotification(title, body, onClick) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "taskflow-notification",
      requireInteraction: false,
    });

    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notif.close(), 5000);
  } catch (err) {
    console.warn("Browser notification failed:", err.message);
  }
}