$ErrorActionPreference = 'Stop'

$projectDir = $PSScriptRoot
$toolsDir = "$projectDir\build_env"
$jdkDir = "$toolsDir\jdk"
$sdkDir = "$toolsDir\android_sdk"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

Write-Host "=========================================="
Write-Host "1. Downloading and Extracting JDK 17"
Write-Host "=========================================="
if (-not (Test-Path "$jdkDir\bin\java.exe")) {
    $jdkUrl = "https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_windows-x64_bin.zip"
    $jdkZip = "$toolsDir\jdk.zip"
    Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip
    Expand-Archive -Path $jdkZip -DestinationPath $toolsDir -Force
    Rename-Item -Path "$toolsDir\jdk-17.0.2" -NewName "jdk"
    Remove-Item $jdkZip
} else {
    Write-Host "JDK 17 already exists."
}

Write-Host "=========================================="
Write-Host "2. Downloading Android Command Line Tools"
Write-Host "=========================================="
$cmdlineToolsDir = "$sdkDir\cmdline-tools\latest"
if (-not (Test-Path "$cmdlineToolsDir\bin\sdkmanager.bat")) {
    $sdkUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $sdkZip = "$toolsDir\sdk.zip"
    Invoke-WebRequest -Uri $sdkUrl -OutFile $sdkZip
    $tempExtract = "$toolsDir\temp_sdk"
    Expand-Archive -Path $sdkZip -DestinationPath $tempExtract -Force
    New-Item -ItemType Directory -Force -Path "$sdkDir\cmdline-tools" | Out-Null
    Move-Item -Path "$tempExtract\cmdline-tools" -Destination $cmdlineToolsDir
    Remove-Item $tempExtract -Recurse -Force
    Remove-Item $sdkZip
} else {
    Write-Host "Android SDK Tools already exist."
}

Write-Host "=========================================="
Write-Host "3. Setting Environment Variables"
Write-Host "=========================================="
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:PATH = "$jdkDir\bin;$cmdlineToolsDir\bin;$env:PATH"

Write-Host "=========================================="
Write-Host "4. Installing Android Packages & Licenses"
Write-Host "=========================================="
# Accept licenses
$yes = "y`n" * 50
$yes | sdkmanager.bat --licenses | Out-Null
# Install packages
sdkmanager.bat "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host "=========================================="
Write-Host "5. Running Expo Prebuild"
Write-Host "=========================================="
Set-Location $projectDir
cmd.exe /c "npx expo prebuild -p android --clean --no-interactive"

Write-Host "=========================================="
Write-Host "6. Building APK via Gradle"
Write-Host "=========================================="
Set-Location "$projectDir\android"
cmd.exe /c ".\gradlew assembleRelease"

Write-Host "=========================================="
Write-Host "7. Finalizing"
Write-Host "=========================================="
$apkSource = "$projectDir\android\app\build\outputs\apk\release\app-release.apk"
$apkDest = "$env:USERPROFILE\Desktop\TwinTracker.apk"

if (Test-Path $apkSource) {
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    Write-Host "SUCCESS: APK build complete! Saved to $apkDest"
} else {
    Write-Host "ERROR: APK build failed, could not find app-release.apk"
}
