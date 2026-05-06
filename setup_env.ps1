# ============================================================
# Twin Tracker — PC 개발 환경 자동 설치 스크립트
# Git + JDK 17 + Android Studio + AVD 에뮬레이터
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n==============================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Cyan
}

function Test-Command($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

# ── Step 1: winget 확인 ──────────────────────────────────────
Write-Step "Step 1: winget 확인"
if (-not (Test-Command winget)) {
    Write-Host "winget이 없습니다. Microsoft Store에서 'App Installer'를 설치해주세요." -ForegroundColor Red
    exit 1
}
Write-Host "winget OK" -ForegroundColor Green

# ── Step 2: Git 설치 ─────────────────────────────────────────
Write-Step "Step 2: Git 설치"
if (Test-Command git) {
    Write-Host "Git 이미 설치됨: $(git --version)" -ForegroundColor Green
} else {
    Write-Host "Git 설치 중..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    # PATH 새로고침
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    Write-Host "Git 설치 완료" -ForegroundColor Green
}

# ── Step 3: JDK 17 설치 ──────────────────────────────────────
Write-Step "Step 3: JDK 17 설치"
$javaOk = $false
try { $jv = java -version 2>&1; if ($jv -match "17") { $javaOk = $true } } catch {}

if ($javaOk) {
    Write-Host "JDK 17 이미 설치됨" -ForegroundColor Green
} else {
    Write-Host "JDK 17 설치 중 (Microsoft OpenJDK)..." -ForegroundColor Yellow
    winget install --id Microsoft.OpenJDK.17 -e --source winget --accept-source-agreements --accept-package-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    Write-Host "JDK 17 설치 완료" -ForegroundColor Green
}

# ── Step 4: Android Studio 설치 ──────────────────────────────
Write-Step "Step 4: Android Studio 설치 (~5GB, 시간 소요)"
$asPath = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
if (Test-Path $asPath) {
    Write-Host "Android Studio 이미 설치됨" -ForegroundColor Green
} else {
    Write-Host "Android Studio 설치 중 (winget)..." -ForegroundColor Yellow
    winget install --id Google.AndroidStudio -e --source winget --accept-source-agreements --accept-package-agreements
    Write-Host "Android Studio 설치 완료" -ForegroundColor Green
}

# ── Step 5: 환경변수 ANDROID_HOME 설정 ───────────────────────
Write-Step "Step 5: 환경변수 설정"
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $androidHome)) {
    # Android Studio 기본 SDK 경로 확인
    $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

if (Test-Path $androidHome) {
    [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")
    [System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $androidHome, "User")
    
    $currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $additions = "$androidHome\emulator;$androidHome\platform-tools;$androidHome\cmdline-tools\latest\bin"
    if ($currentPath -notlike "*$androidHome*") {
        [System.Environment]::SetEnvironmentVariable("PATH", "$currentPath;$additions", "User")
    }
    Write-Host "ANDROID_HOME=$androidHome 설정 완료" -ForegroundColor Green
} else {
    Write-Host "Android SDK 경로를 찾을 수 없습니다. Android Studio를 먼저 실행해 SDK를 설치하세요." -ForegroundColor Yellow
    Write-Host "Android Studio 실행 후 setup_avd.ps1을 별도로 실행하세요." -ForegroundColor Yellow
}

Write-Host "`n✅ 기본 환경 설치 완료!" -ForegroundColor Green
Write-Host "⚠️  터미널을 새로 열고 setup_avd.ps1 을 실행하세요." -ForegroundColor Yellow
