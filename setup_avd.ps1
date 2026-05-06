# ============================================================
# Twin Tracker — Android 에뮬레이터(AVD) 자동 생성 스크립트
# Android Studio 설치 + SDK 설정 완료 후 실행
# ============================================================

$ErrorActionPreference = "Continue"

function Write-Step($msg) {
    Write-Host "`n==============================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Cyan
}

# SDK 경로 자동 탐색
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Users\user\AppData\Local\Android\Sdk"
)

$ANDROID_HOME = $null
foreach ($p in $sdkPaths) {
    if (Test-Path $p) { $ANDROID_HOME = $p; break }
}

if (-not $ANDROID_HOME) {
    Write-Host "❌ Android SDK를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "Android Studio를 실행하고 SDK를 설치한 후 다시 시도하세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Android SDK 경로: $ANDROID_HOME" -ForegroundColor Green

$cmdlineTools = "$ANDROID_HOME\cmdline-tools\latest\bin"
$sdkmanager = "$cmdlineTools\sdkmanager.bat"
$avdmanager  = "$cmdlineTools\avdmanager.bat"
$emulator    = "$ANDROID_HOME\emulator\emulator.exe"

# ── Step 1: SDK 컴포넌트 설치 ────────────────────────────────
Write-Step "Step 1: SDK 컴포넌트 설치"
if (Test-Path $sdkmanager) {
    Write-Host "system-image 설치 중 (API 34, x86_64)..." -ForegroundColor Yellow
    echo "y" | & $sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis_playstore;x86_64" "emulator"
    Write-Host "SDK 컴포넌트 설치 완료" -ForegroundColor Green
} else {
    Write-Host "❌ sdkmanager를 찾을 수 없습니다: $sdkmanager" -ForegroundColor Red
    Write-Host "Android Studio > SDK Manager에서 수동으로 설치하세요." -ForegroundColor Yellow
}

# ── Step 2: AVD 생성 ─────────────────────────────────────────
Write-Step "Step 2: AVD 에뮬레이터 생성 (Pixel 7 / Android 14)"
if (Test-Path $avdmanager) {
    # 기존 AVD 확인
    $existing = & $avdmanager list avd 2>&1
    if ($existing -like "*TwinTrackerPhone*") {
        Write-Host "AVD 'TwinTrackerPhone' 이미 존재합니다." -ForegroundColor Green
    } else {
        echo "no" | & $avdmanager create avd `
            --name "TwinTrackerPhone" `
            --package "system-images;android-34;google_apis_playstore;x86_64" `
            --device "pixel_7" `
            --force
        Write-Host "AVD 'TwinTrackerPhone' 생성 완료!" -ForegroundColor Green
    }
} else {
    Write-Host "avdmanager를 찾을 수 없습니다." -ForegroundColor Red
}

Write-Host "`n✅ AVD 설정 완료!" -ForegroundColor Green
Write-Host "이제 'start.ps1'을 실행하면 에뮬레이터가 자동으로 시작됩니다." -ForegroundColor Cyan
