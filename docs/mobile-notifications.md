# Mobile Notifications

Zenith is prepared for native mobile push notifications through stored device tokens.

## Mobile App Flow

After login, the iOS or Android app should:

1. Request notification permission.
2. Register the device with Firebase Cloud Messaging or APNs.
3. Send the token to the backend:

```http
POST /api/member/notifications/devices
Content-Type: application/json

{
  "token": "native-device-token",
  "platform": "ANDROID",
  "provider": "FCM",
  "deviceId": "optional-stable-device-id",
  "appVersion": "1.0.0"
}
```

Use `platform: "IOS"` for iPhone and `provider: "FCM"` if Firebase handles APNs.

When a user logs out or disables notifications:

```http
DELETE /api/member/notifications/devices
Content-Type: application/json

{
  "token": "native-device-token"
}
```

## Current Backend Behavior

- Device tokens are stored in `PushDevice`.
- Publishing an announcement queues notification rows in `NotificationDelivery`.
- Delivery sending is intentionally provider-ready. Once Firebase credentials are available, add an FCM sender that processes `PENDING` delivery rows and marks them `SENT` or `FAILED`.

## Required Store Setup Later

- Firebase project.
- Android `google-services.json`.
- iOS `GoogleService-Info.plist`.
- Apple Developer account with push notification capability.
- APNs key uploaded into Firebase for iOS delivery.
