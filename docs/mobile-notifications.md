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
- `POST /api/notifications/send` sends queued FCM notifications and marks delivery rows `SENT`, `FAILED`, or `SKIPPED`.
- Protect the sender endpoint with `Authorization: Bearer <NOTIFICATION_SEND_SECRET>`.

## Required Environment Variables

Set these in production before enabling the sender:

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NOTIFICATION_SEND_SECRET="long-random-secret"
```

## Required Store Setup Later

- Firebase project.
- Android `google-services.json`.
- iOS `GoogleService-Info.plist`.
- Apple Developer account with push notification capability.
- APNs key uploaded into Firebase for iOS delivery.

For Android, place `google-services.json` at `android/app/google-services.json`, then run:

```bash
npx cap sync android
```

For iOS, add the Capacitor iOS project on macOS, place `GoogleService-Info.plist` in the iOS app target, enable Push Notifications and Background Modes in Xcode, then run:

```bash
npx cap sync ios
```
