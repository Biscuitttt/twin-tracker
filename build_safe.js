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
process.env.PATH = `${path.join(jdkDir, 'bin')};${path.join(cmdlineToolsDir, 'bin')};${process.env.PATH}`;

try {
  console.log(`--- Copying project to ASCII path: ${tempDir} ---`);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  // Use xcopy to copy project files, excluding node_modules and build_env
  execSync(`xcopy /E /I /H /Y /EXCLUDE:exclude.txt "${projectDir}" "${tempDir}"`, { stdio: 'inherit' });
  
  process.chdir(tempDir);
  console.log('--- Running npm install ---');
  execSync('npm install', { stdio: 'inherit' });

  console.log('--- Running Expo Prebuild ---');
  execSync('npx expo prebuild -p android --clean', { stdio: 'inherit' });

  console.log('--- Running Gradle Assemble Release ---');
  process.chdir(path.join(tempDir, 'android'));
  execSync('gradlew.bat assembleRelease', { stdio: 'inherit' });

  console.log('--- Copying APK ---');
  const apkSrc = path.join(tempDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const userProfile = process.env.USERPROFILE;
  const apkDest = path.join(userProfile, 'Desktop', 'TwinTracker.apk');
  fs.copyFileSync(apkSrc, apkDest);
  console.log(`--- SUCCESS: APK saved to ${apkDest} ---`);
} catch (error) {
  console.error('--- ERROR OCCURRED ---');
  console.error(error.message);
}
