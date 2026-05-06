const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const tempDir = 'C:\\t';
const projectDir = __dirname;
const toolsDir = 'C:\\t_env';
const jdkDir = path.join(toolsDir, 'jdk-17.0.2');
const sdkDir = path.join(toolsDir, 'android_sdk');
const ndkDir = path.join(sdkDir, 'ndk', '27.1.12297006');
const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');

console.log('--- Setting Environment Variables ---');
process.env.JAVA_HOME = jdkDir;
process.env.ANDROID_HOME = sdkDir;
process.env.ANDROID_NDK_HOME = ndkDir;
process.env.PATH = `${path.join(jdkDir, 'bin')};${path.join(cmdlineToolsDir, 'bin')};${process.env.PATH}`;

try {
  console.log(`--- Copying project to ASCII path: ${tempDir} ---`);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  execSync(`xcopy /E /I /H /Y /EXCLUDE:exclude.txt "${projectDir}" "${tempDir}"`, { stdio: 'inherit' });
  
  process.chdir(tempDir);
  console.log('--- Running npm install ---');
  execSync('npm install', { stdio: 'inherit' });

  console.log('--- Running Expo Prebuild ---');
  execSync('npx expo prebuild -p android --clean', { stdio: 'inherit' });

  console.log('--- Writing local.properties ---');
  const localPropPath = path.join(tempDir, 'android', 'local.properties');
  const localPropContent = `sdk.dir=${sdkDir.replace(/\\/g, '/')}\nndk.dir=${ndkDir.replace(/\\/g, '/')}\n`;
  fs.writeFileSync(localPropPath, localPropContent);

  console.log('--- Running Gradle Assemble Release ---');
  process.chdir(path.join(tempDir, 'android'));
  // Pass -x lintVitalAnalyzeRelease -x lintVitalRelease -x lint to skip ALL linting
  execSync('gradlew.bat assembleRelease -x lint -x lintVitalAnalyzeRelease -x lintVitalRelease --stacktrace', { stdio: 'inherit' });

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
