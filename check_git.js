const { execSync } = require('child_process');
const GIT = '"C:\\Program Files\\Git\\bin\\git.exe"';
const REPO = 'C:\\Users\\user\\Desktop\\AI\\육아\\twin-tracker';

try {
  const log = execSync(`${GIT} -C "${REPO}" log --oneline -5`, { encoding: 'utf8' });
  console.log('=== 최근 커밋 ===');
  console.log(log);
} catch(e) {
  console.error(e.message);
}
