# Android Play Store Build

The Android app wrapper is generated with Capacitor.

## App Identity

- App name: `Zenith Fitness`
- Package name: `com.zenithfitness.app`
- Default live URL: `https://zenith-fitness-theta.vercel.app`

Before release, update `CAPACITOR_SERVER_URL` or `capacitor.config.ts` if your production URL is different.

## Build From Android Studio

1. Install Android Studio.
2. Open the `android/` folder.
3. Let Android Studio download Gradle and SDK dependencies.
4. Confirm the app runs on a device from Android Studio.
5. Create an upload key:
   - Android Studio > Build > Generate Signed Bundle / APK
   - Choose `Android App Bundle`
   - Create a new key store and save it somewhere private.
6. Build the signed release bundle.
7. Upload the generated `.aab` file to Play Console internal testing.

## Command Line Build

After Gradle dependencies are available locally:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-22"
cd android
.\gradlew.bat bundleRelease
```

Unsigned release output, when command-line build succeeds:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

For Play Store upload, use Android Studio or Gradle signing config to create a signed `.aab`.

## Permissions

The Android manifest includes:

- `INTERNET` for loading the Vercel app and API.
- `CAMERA` for staff QR scanning.

## Notifications Later

When Firebase is ready, place Android `google-services.json` at:

```text
android/app/google-services.json
```

Then sync/build again.
