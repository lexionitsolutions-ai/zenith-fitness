# iOS App Store Build

Zenith Fitness uses Capacitor for the native iOS wrapper.

## App Identity

- App name: `Zenith Fitness`
- Bundle ID: `com.zenithfitness.app`
- Production URL: `https://zenith-fitness-theta.vercel.app`

Use the same bundle ID in Apple Developer and App Store Connect.

## One-Time Apple Setup

1. Enroll in the Apple Developer Program.
2. In Apple Developer, create an App ID / Bundle ID:
   - `com.zenithfitness.app`
3. Enable capabilities needed by the app:
   - Push Notifications
   - Associated Domains, only if universal links are added later
4. In App Store Connect, create a new iOS app record:
   - Name: `Zenith Fitness`
   - Bundle ID: `com.zenithfitness.app`
   - SKU: `zenith-fitness-ios`

## Firebase / Push Notifications

For iOS push through Firebase Cloud Messaging:

1. Add an iOS app in Firebase with bundle ID `com.zenithfitness.app`.
2. Download `GoogleService-Info.plist`.
3. Add it to the iOS app target in Xcode.
4. In Apple Developer, create an APNs Auth Key.
5. Upload the APNs key to Firebase Cloud Messaging settings.
6. In Xcode, enable Push Notifications and Background Modes.

## Generate iOS Project

This must be done on macOS with Xcode installed:

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

If the `ios/` folder already exists later, use:

```bash
npx cap sync ios
```

## Build From Xcode

1. Open the iOS project in Xcode.
2. Select the app target.
3. Set Team to the Apple Developer team.
4. Confirm Bundle Identifier is `com.zenithfitness.app`.
5. Set version/build number.
6. Choose `Any iOS Device`.
7. Use Product > Archive.
8. In Organizer, validate the archive.
9. Distribute App > App Store Connect > Upload.

## App Store Connect Listing

Prepare:

- App name, subtitle, description, keywords.
- App icon.
- iPhone screenshots.
- Support URL.
- Privacy Policy URL.
- App privacy questionnaire.
- Age rating.
- Review notes and demo member/admin login if required.

After the build appears in App Store Connect, attach it to the app version and submit for App Review.
