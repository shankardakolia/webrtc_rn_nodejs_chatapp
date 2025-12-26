# WebRTC Chat App - Setup Guide for Windows & Android

This guide will help you set up and run the WebRTC Video Chat application on a Windows machine with an Android device.

## Prerequisites

Before interacting with the code, ensure you have the following installed:

1.  **Node.js**: Download and install the LTS version from [nodejs.org](https://nodejs.org/).
2.  **Git**: Download and install from [git-scm.com](https://git-scm.com/).
3.  **Android Studio**:
    -   Download and install from [developer.android.com](https://developer.android.com/studio).
    -   During installation, select **"Android Virtual Device"**.
    -   Open Android Studio -> **Settings** -> **Languages & Frameworks** -> **Android SDK**. Ensure an SDK Platform (e.g., Android 13/14) is installed.
    -   **Important**: Add `platform-tools` to your System Path (allows you to run `adb` commands).

## Project Setup

### 1. Backend Server (Node.js)

1.  Open a terminal (Command Prompt or PowerShell) in the `server` folder.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    node index.js
    ```
    You should see: `Server is running on port 3000`.

### 2. Frontend Client (React Native / Expo)

1.  Open a **new** terminal window in the `client` folder.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Connecting your Device

Since you are running the backend on your PC and the app on your phone, they need to talk over the network.

### Option A: Physical Android Device (Recommended)

1.  Connect your Android phone to your PC via USB.
2.  Enable **USB Debugging** on your phone (Settings -> Developer Options).
3.  Ensure your Phone and PC are on the **SAME Wi-Fi network**.
4.  Find your PC's Local IP Address:
    -   Open Command Prompt and run: `ipconfig`
    -   Look for "IPv4 Address" (e.g., `192.168.1.15`).
5.  Open `client/App.js` in a code editor.
6.  Locate `SERVER_URL` near the top and update it:
    ```javascript
    const SERVER_URL = 'http://192.168.1.15:3000'; // Use YOUR IP here
    ```
7.  Start the app:
    ```bash
    npm run android
    ```

### Option B: Android Emulator

If you are using the Android Emulator on the same PC:

1.  You can use the special emulator IP `10.0.2.2`.
2.  Update `client/App.js`:
    ```javascript
    const SERVER_URL = 'http://10.0.2.2:3000';
    ```
3.  Start the app:
    ```bash
    npm run android
    ```

## Troubleshooting

-   **"Network Request Failed"**:
    -   Check if your PC's Firewall is blocking port 3000.
    -   Ensure both devices are on the exact same Wi-Fi.
    -   Double-check the IP address in `App.js`.
-   **App Crashes on Launch**:
    -   Ensure you have configured the Android setup correctly.
    -   Try running `npx expo install --fix` in the `client` folder.
