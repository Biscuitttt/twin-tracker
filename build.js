const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;
const toolsDir = path.join(projectDir, 'build_env');
const jdkDir = path.join(toolsDir, 'jdk-17.0.2');
const sdkDir = path.join(toolsDir, 'android_sdk');
const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');

console.log('--- Setting Environment Variables ---');
process.env.JAVA_HOME = jdkDir;
process.env.ANDROID_HOME = sdkDir;
process.env.PATH = `${path.join(jdkDir, 'bin')};${path.join(cmdlineToolsDir, 'bin')};${process.env.PATH}`;

try {
  console.log('--- Running Expo Prebuild ---');
  execSync('npx expo prebuild -p android --clean', { stdio: 'inherit' });

  console.log('--- Running Gradle Assemble Release ---');
  process.chdir(path.join(projectDir, 'android'));
  execSync('gradlew.bat assembleRelease', { stdio: 'inherit' });

  console.log('--- Copying APK ---');
  const apkSrc = path.join(projectDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const userProfile = process.env.USERPROFILE;
  const apkDest = path.join(userProfile, 'Desktop', 'TwinTracker.apk');
  fs.copyFileSync(apkSrc, apkDest);
  console.log(`--- SUCCESS: APK saved to ${apkDest} ---`);
} catch (error) {
  console.error('--- ERROR OCCURRED ---');
  console.error(error.message);
}
