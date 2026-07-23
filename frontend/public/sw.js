self.addEventListener("push", (event) => {
  let data = { title: "Notificación", body: "", url: "" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/campus.png",
      badge: "/campus.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        const focused = windowClients.find((c) => c.url === url && "focus" in c);
        if (focused) {
          focused.focus();
        } else {
          clients.openWindow(url);
        }
      })
    );
  }
});
