# Komaki X1 Range Pro – single APK with native Bluetooth

Your index.html is unchanged (web/index.html). native-shim.js makes its navigator.bluetooth calls
use Android's native BLE, so scanning, pairing, notifications, writes and auto-reconnect work in the APK.

Build option A (no setup): push this folder to a GitHub repo -> Actions -> "Build APK" -> download the artifact.
Build option B (local): install Node 18+, JDK 17, Android SDK, then run: bash scripts/build-apk.sh

The result is one debug-signed APK: komaki-x1-range-pro.apk (installable directly; enable "install unknown apps").
On first launch allow Nearby devices (Bluetooth) and Location.
