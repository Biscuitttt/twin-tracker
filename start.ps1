# ============================================================
# Twin Tracker — 통합 실행 스크립트
# 자동저장(GitHub push) → 에뮬레이터 시작 → 앱 빌드 실행
# 사용법: powershell -ExecutionPolicy Bypass -File start.ps1
# ============================================================

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

function Write-Step($msg) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
}

# Git PATH 확보
$env:PATH += ";C:\Program Files\Git\bin;C:\Program Files\Git\cmd"

# Android SDK PATH 확보
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
)
foreach ($p in $sdkPaths) {
    if (Test-Path $p) {
        $env:ANDROID_HOME = $p
        $env:PATH += ";$p\emulator;$p\platform-tools"
        break
    }
}

# Java PATH 확보 (Android Studio 내장 JBR 사용)
$javaDir = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $javaDir) {
    $env:JAVA_HOME = $javaDir
    $env:PATH = "$javaDir\bin;" + $env:PATH
}
# ── 1단계: GitHub 자동 저장 ──────────────────────────────────
Write-Step "1단계: GitHub 자동 저장"
& "$ProjectDir\autosave.ps1"

# ── 2단계: 에뮬레이터 실행 ───────────────────────────────────
Write-Step "2단계: Android 에뮬레이터 시작"

$emulatorExe = "$env:ANDROID_HOME\emulator\emulator.exe"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

if (Test-Path $emulatorExe) {
    # 이미 실행 중인지 확인
    $devices = & $adb devices 2>&1
    if ($devices -like "*emulator*online*") {
        Write-Host "에뮬레이터가 이미 실행 중입니다." -ForegroundColor Green
    } else {
        Write-Host "에뮬레이터 'TwinTrackerPhone' 시작 중..." -ForegroundColor Yellow
        Start-Process $emulatorExe -ArgumentList "-avd TwinTrackerPhone -no-snapshot-load" -WindowStyle Normal
        
        Write-Host "에뮬레이터 부팅 대기 중 (최대 90초)..." -ForegroundColor Yellow
        $timeout = 90
        $elapsed = 0
        do {
            Start-Sleep 5
            $elapsed += 5
            $bootStatus = & $adb shell getprop sys.boot_completed 2>&1
            Write-Host "  [$elapsed/$timeout 초] 부팅 상태: $bootStatus" -ForegroundColor Gray
        } while ($bootStatus -ne "1" -and $elapsed -lt $timeout)
        
        if ($bootStatus -eq "1") {
            Write-Host "에뮬레이터 부팅 완료!" -ForegroundColor Green
        } else {
            Write-Host "에뮬레이터 부팅 시간 초과 — 계속 진행합니다." -ForegroundColor Yellow
        }
    }
    
    # ── 3단계: 앱 빌드 & 실행 (에뮬레이터) ──────────────────
    Write-Step "3단계: 앱 빌드 & 에뮬레이터에 설치"
    Write-Host "expo run:android 실행 중..." -ForegroundColor Yellow
    cmd /c "npx expo run:android 2>&1"
    
} else {
    # 에뮬레이터 없으면 Expo Go 웹 모드로 대체
    Write-Step "에뮬레이터 미설치 — Expo 개발 서버(QR) 시작"
    Write-Host "setup_env.ps1 → setup_avd.ps1 을 먼저 실행하세요." -ForegroundColor Yellow
    Write-Host "지금은 Expo Go (실기기 / 웹) 모드로 시작합니다..." -ForegroundColor Cyan
    cmd /c "npx expo start"
}
