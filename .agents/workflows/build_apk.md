---
description: Build Android APK for testing or update
---

# Workflow: Build Android APK

1. **Install project dependencies**
   ```
   npm ci
   ```

2. **Build the web assets**
   ```
   npm run build
   ```

3. **Sync Capacitor plugins and assets to Android platform**
   ```
   npx cap sync android
   ```

4. **Navigate to Android project directory**
   ```
   cd android
   ```

5. **Assemble Debug APK**
   // turbo
   ```
   .\gradlew.bat assembleDebug
   ```

   *The generated APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.*

6. **(Optional) Assemble Release APK**
   ```
   .\gradlew.bat assembleRelease
   ```

   *Ensure you have signing config set up for release builds.*

**Notes**:
- Make sure `JAVA_HOME` points to a valid JDK installation.
- For testing on a device, enable USB debugging and install the APK via `adb install -r <path>`.
