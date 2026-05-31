import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const packagePath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const manifestPath = path.join(rootDir, 'public', 'manifest.json');
const versionPattern = /^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/;

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const bumpPatch = (version) => {
  const parts = version.split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
};

const packageJson = readJson(packagePath);
const packageLock = readJson(packageLockPath);
const manifest = readJson(manifestPath);
const input = process.argv[2];
const nextVersion = input === 'patch'
  ? bumpPatch(packageJson.version)
  : input || packageJson.version;

if (!versionPattern.test(nextVersion)) {
  console.error(`Invalid Chrome extension version: ${nextVersion}`);
  console.error('Use one to four dot-separated integers, for example 1.0.5.');
  process.exit(1);
}

packageJson.version = nextVersion;
packageLock.version = nextVersion;
packageLock.packages ??= {};
packageLock.packages[''] ??= {};
packageLock.packages[''].version = nextVersion;
manifest.version = nextVersion;

writeJson(packagePath, packageJson);
writeJson(packageLockPath, packageLock);
writeJson(manifestPath, manifest);

console.log(nextVersion);
