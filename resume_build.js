const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const tempDir = path.join(process.env.TEMP, 'twin-tracker-build');
const projectDir = __dirname;
const toolsDir = path.join(projectDir, 'build_env');
const jdkDir = path.join(toolsDir, 'jdk-17.0.2');
const sdkDir = path.join(toolsDir, 'android_sdk');
const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');

console.log('--- Setting Environment Variables ---');
process.env.JAVA_HOME = jdkDir;
process.env.ANDROID_HOME = sdkDir;
process.env.ANDROID_NDK_HOME = path.join(sdkDir, 'ndk', '26.1.10909125');
process.env.PATH = `${path.join(jdkDir, 'bin')};${path.join(cmdlineToolsDir, 'bin')};${process.env.PATH}`;

try {
  console.log('--- Running Gradle Assemble Release (Resuming) ---');
  process.chdir(path.join(tempDir, 'android'));
  execSync('gradlew.bat assembleRelease -x lint', { stdio: 'inherit' });

  console.log('--- Copying APK ---');
  const apkSrc = path.join(tempDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const userProfile = process.env.USERPROFILE;
  const apkDest = path.join(userProfile, 'Desktop', 'TwinTracker.apk');
  fs.copyFileSync(apkSrc, apkDest);
  console.log(`\n\n=== SUCCESS: APK saved to ${apkDest} ===\n\n`);
} catch (error) {
  console.error('--- ERROR OCCURRED ---');
  console.error(error.message);
}
