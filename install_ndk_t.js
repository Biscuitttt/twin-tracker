const { execSync } = require('child_process');
const path = require('path');

process.env.JAVA_HOME = 'C:\\t_env\\jdk-17.0.2';
process.env.ANDROID_HOME = 'C:\\t_env\\android_sdk';
process.env.PATH = `C:\\t_env\\jdk-17.0.2\\bin;C:\\t_env\\android_sdk\\cmdline-tools\\latest\\bin;${process.env.PATH}`;

try {
  console.log('--- Installing NDK and CMake in C:\\t_env ---');
  execSync(`sdkmanager.bat "ndk;26.1.10909125" "cmake;3.22.1"`, { stdio: 'inherit' });
  console.log('--- DONE ---');
} catch (e) {
  console.error(e.message);
}
