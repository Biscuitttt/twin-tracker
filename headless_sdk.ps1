$ErrorActionPreference = "Stop"

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$cmdlineToolsDir = "$sdkPath\cmdline-tools\latest"

# 1. SDK 및 cmdline-tools 폴더 생성
if (-not (Test-Path $cmdlineToolsDir)) {
    Write-Host "디렉토리 생성: $cmdlineToolsDir"
    New-Item -ItemType Directory -Force -Path $cmdlineToolsDir | Out-Null
}

if (-not (Test-Path "$cmdlineToolsDir\bin\sdkmanager.bat")) {
    Write-Host "cmdline-tools 다운로드 중 (curl)..." -ForegroundColor Yellow
    curl.exe -L -o $zipPath $zipUrl

    # 3. 압축 해제 (cmdline-tools 폴더 안에 내용이 들어가므로 주의해서 이동)
    Write-Host "압축 해제 중..." -ForegroundColor Yellow
    $extractTemp = "$env:TEMP\cmdline-extract"
    if (Test-Path $extractTemp) { Remove-Item -Recurse -Force $extractTemp }
    Expand-Archive -Path $zipPath -DestinationPath $extractTemp -Force

    # 파일 이동: $extractTemp\cmdline-tools\* -> $cmdlineToolsDir
    Copy-Item -Path "$extractTemp\cmdline-tools\*" -Destination $cmdlineToolsDir -Recurse -Force
} else {
    Write-Host "cmdline-tools가 이미 존재합니다. 다운로드를 건너뜁니다." -ForegroundColor Green
}

# 4. 환경 변수 설정
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "User")

$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$additions = "$sdkPath\emulator;$sdkPath\platform-tools;$cmdlineToolsDir\bin"
if ($currentPath -notlike "*$sdkPath*") {
    [System.Environment]::SetEnvironmentVariable("PATH", "$currentPath;$additions", "User")
    $env:PATH += ";$additions"
}

$javaDir = "C:\Program Files\Android\Android Studio\jbr"
$env:JAVA_HOME = $javaDir
$env:PATH = "$javaDir\bin;" + $env:PATH

# 5. SDK 패키지 설치
$sdkmanager = "$cmdlineToolsDir\bin\sdkmanager.bat"

Write-Host "라이선스 동의 및 패키지 설치 중..." -ForegroundColor Yellow
$packages = "platform-tools", "platforms;android-34", "system-images;android-34;google_apis_playstore;x86_64", "emulator", "build-tools;34.0.0"
$packagesStr = $packages -join " "

# 여러 번의 y 입력을 위해 powershell 루프 사용
powershell -Command "1..10 | ForEach-Object { echo y }" | & $sdkmanager --licenses
& $sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis_playstore;x86_64" "emulator" "build-tools;34.0.0"

Write-Host "SDK 설치 완료!" -ForegroundColor Green

# 6. AVD 생성
$avdmanager = "$cmdlineToolsDir\bin\avdmanager.bat"
Write-Host "AVD 'TwinTrackerPhone' 생성 중..." -ForegroundColor Yellow

# 기존 AVD 덮어쓰기를 위해 echo no 사용 (커스텀 하드웨어 프로필 묻지 않음)
cmd.exe /c "echo no | `"$avdmanager`" create avd --name `"TwinTrackerPhone`" --package `"system-images;android-34;google_apis_playstore;x86_64`" --device `"pixel_7`" --force"

Write-Host "AVD 생성 완료!" -ForegroundColor Green
