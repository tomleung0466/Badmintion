#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_PATH="$ROOT/ios/App/App/GoogleService-Info.plist"
INFO_PLIST="$ROOT/ios/App/App/Info.plist"
PROJECT_ID="badminton-app-b08cc"
BUNDLE_ID="hk.plusone.badminton"

echo "=== +1 iOS Google 登入設定 ==="
echo ""

if [ ! -f "$PLIST_PATH" ]; then
  echo "找不到 GoogleService-Info.plist"
  echo ""
  echo "請先在 Firebase Console 登記 iOS App："
  echo "  1. https://console.firebase.google.com/project/${PROJECT_ID}/settings/general"
  echo "  2. 添加应用 → iOS"
  echo "  3. Bundle ID：${BUNDLE_ID}"
  echo "  4. 下载 GoogleService-Info.plist"
  echo "  5. 放到：ios/App/App/GoogleService-Info.plist"
  echo ""
  echo "或用 Firebase CLI（已登录）："
  echo "  firebase apps:create IOS \"PlusOne Club\" --bundle-id ${BUNDLE_ID} --project ${PROJECT_ID}"
  echo "  firebase apps:sdkconfig IOS --project ${PROJECT_ID} --out \"${PLIST_PATH}\""
  exit 1
fi

REVERSED_CLIENT_ID=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$PLIST_PATH" 2>/dev/null || true)
if [ -z "$REVERSED_CLIENT_ID" ]; then
  echo "GoogleService-Info.plist 缺少 REVERSED_CLIENT_ID"
  exit 1
fi

echo "REVERSED_CLIENT_ID: $REVERSED_CLIENT_ID"

# Add Google URL scheme to Info.plist (required for native Google Sign-In callback)
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$INFO_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string google-signin" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string ${REVERSED_CLIENT_ID}" "$INFO_PLIST"

echo ""
echo "已更新 Info.plist URL Scheme"
echo ""
echo "下一步："
echo "  cd \"$ROOT\""
echo "  npm run cap:sync"
echo "  npx cap open ios"
echo "  在 Xcode 确认 GoogleService-Info.plist 已加入 App target（拖入 App 文件夹若未出现）"
echo "  push GitHub → Xcode Cloud build 新 TestFlight"
