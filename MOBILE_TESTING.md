# USB Mobile Testing Guide (Android)

This guide helps you test the Zetime application directly on your Android phone using a USB cable.

## Prerequisites

1.  **Android Phone** with Developer Options enabled.
2.  **USB Cable** connected to your development PC.
3.  **ADB (Android Debug Bridge)** installed on your PC.
    *   [Download Platform Tools here](https://developer.android.com/studio/releases/platform-tools)
    *   Ensure `adb` is in your System PATH.

## Step-by-Step Setup

### 1. Enable Developer Options & USB Debugging
*   Go to **Settings > About Phone**.
*   Tap **Build Number** 7 times until you see "You are now a developer".
*   Go to **Settings > System > Developer Options**.
*   Enable **USB Debugging**.

### 2. Connect Device
*   Connect your phone to your PC via USB.
*   If prompted on the phone, select **Always allow from this computer** and tap **OK**.

### 3. Verify Connection
Open a terminal and run:
```bash
adb devices
```
You should see your device ID in the list.

### 4. Setup Port Forwarding
This allows your phone to access `localhost:3000` as if it were running on the phone itself.

Run our helper script:
```bash
.\scripts\mobile-dev.bat
```
*(Or manually run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:5000 tcp:5000`)*

### 5. Access the App
1.  Ensure your dev server is running (`npm run dev`).
2.  Open **Chrome** (or any browser) on your Android phone.
3.  Navigate to: **[http://localhost:3000](http://localhost:3000)**

## Troubleshooting

### Device not detected
*   Check your cable (try a different one).
*   Ensure "USB Debugging" is actually ON.
*   Change USB connection mode to "File Transfer" or "PTP".

### "Unauthorized" status in `adb devices`
*   Check your phone screen for a permission prompt.
*   Try `adb kill-server` then `adb start-server`.

### Browser cannot connect
*   Ensure `npm run dev` is running on your PC.
*   Re-run the `adb reverse` commands.
*   Note: This only works over USB. If you unplug, the connection will break.

### HMR (Hot Module Replacement) not working
*   Ensure you are using `localhost` and not the IP address. `adb reverse` only maps `localhost`.
