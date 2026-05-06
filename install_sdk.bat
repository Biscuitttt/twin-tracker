@echo off
set "JAVA_HOME=%CD%\build_env\jdk-17.0.2"
set "ANDROID_HOME=%CD%\build_env\android_sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

echo Accepting licenses...
(for /L %%i in (1,1,50) do echo y) | sdkmanager.bat --licenses

echo Installing SDK packages...
sdkmanager.bat "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo Running Expo Prebuild...
npx expo prebuild -p android --clean --no-interactive

echo Building APK...
cd android
call gradlew.bat assembleRelease
cd ..

echo Copying APK...
copy /Y "android\app\build\outputs\apk\release\app-release.apk" "%USERPROFILE%\Desktop\TwinTracker.apk"

echo DONE
