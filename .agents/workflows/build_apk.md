---
description: Build Android APK for testing or update
---

# Workflow: Build Android APK

1. **Install project dependencies (if needed)**
   ```
   npm ci
   ```

2. **Build the web assets and Sync to Android**
   This script triggers `CAPACITOR_BUILD=1`, avoiding slow linting or typescript checks, and automatically syncs the output directory.
   ```
   npm run build:android
   ```

3. **Navigate to Android project directory**
   ```
   cd android
   ```

4. **Assemble Debug APK**
   // turbo
   ```
   .\gradlew.bat assembleDebug
   ```

   *The generated APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.*

5. **Copy the Debug APK to the root directory**
   To easily access and test the APK, you can copy it to the root of the project:
   ```
   Copy-Item -Path "app/build/outputs/apk/debug/app-debug.apk" -Destination "../Zetime-test.apk" -Force
   ```

6. **(Optional) Assemble Release APK**
   ```
   .\gradlew.bat assembleRelease
   ```

   *Ensure you have signing config set up for release builds.*

**Notes**:
- Make sure `JAVA_HOME` points to a valid JDK installation.
- For testing on a device, enable USB debugging and install the APK via `adb install -r <path>`.
