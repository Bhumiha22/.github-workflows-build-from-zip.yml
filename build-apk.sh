#!/usr/bin/env bash
# Needs: Node 18+, JDK 17, Android SDK (ANDROID_HOME set). Output: komaki-x1-range-pro.apk
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
npm run build:web
[ -d android ] || npx cap add android
M=android/app/src/main/AndroidManifest.xml
if ! grep -q BLUETOOTH_SCAN "$M"; then
  sed -i 's#<application#<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30"/>\n    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30"/>\n    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation"/>\n    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>\n    <application#' "$M"
fi
npx cap sync android
(cd android && ./gradlew assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk komaki-x1-range-pro.apk
echo "Done: $(pwd)/komaki-x1-range-pro.apk"
