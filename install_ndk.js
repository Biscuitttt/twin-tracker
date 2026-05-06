const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;
const sdkDir = path.join(projectDir, 'build_env', 'android_sdk');
const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');

console.log('--- Installing NDK and CMake ---');
process.env.JAVA_HOME = path.join(projectDir, 'build_env', 'jdk-17.0.2');
process.env.ANDROID_HOME = sdkDir;
process.env.PATH = `${path.join(process.env.JAVA_HOME, 'bin')};${path.join(cmdlineToolsDir, 'bin')};${process.env.PATH}`;

try {
  // Install NDK and CMake
  execSync(`sdkmanager.bat "ndk;26.1.10909125" "cmake;3.22.1"`, { stdio: 'inherit' });
  console.log('--- NDK & CMake Installed Successfully ---');
} catch (error) {
  console.error(error.message);
}
