import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../../..');
const resultsDir = path.join(frontendRoot, 'tests/allure-results');
fs.mkdirSync(resultsDir, { recursive: true });

const environment = [
  'app=surveyflow',
  `node=${process.version}`,
  `platform=${process.platform}`,
  'suite=e2e',
  'baseURL=http://127.0.0.1:4173',
].join('\n');

fs.writeFileSync(path.join(resultsDir, 'environment.properties'), `${environment}\n`, 'utf8');

const categories = [
  {
    name: 'Assertion failures',
    matchedStatuses: ['failed'],
    messageRegex: 'expect\\(|AssertionError',
  },
  {
    name: 'Timeouts',
    matchedStatuses: ['broken', 'failed'],
    messageRegex: 'Timeout|timed out',
  },
  {
    name: 'Network and API failures',
    matchedStatuses: ['broken', 'failed'],
    messageRegex: 'Network|requestfailed|ECONN|5\\d\\d|4\\d\\d',
  },
];

fs.writeFileSync(
  path.join(resultsDir, 'categories.json'),
  JSON.stringify(categories, null, 2),
  'utf8'
);

const safeExec = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const executor = {
  name: 'Local Playwright Runner',
  type: 'local',
  buildName: safeExec('git rev-parse --abbrev-ref HEAD'),
  buildOrder: Date.now(),
  buildUrl: '',
  reportName: 'Survey Application E2E QA Report',
  reportUrl: '',
};

fs.writeFileSync(
  path.join(resultsDir, 'executor.json'),
  JSON.stringify(executor, null, 2),
  'utf8'
);
