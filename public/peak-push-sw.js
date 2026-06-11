self.addEventListener('push', function (event) {
  var payload = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(payload.title || 'Peak Performance', {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    tag: payload.tag || 'peak-update',
    data: { href: payload.href || '/' }
  }))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var href = event.notification.data && event.notification.data.href || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      if (clients.length) {
        return clients[0].focus().then(function () {
          return 'navigate' in clients[0] ? clients[0].navigate(href) : undefined
        })
      }
      return self.clients.openWindow(href)
    })
  )
})
