import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const manifestPath = path.join(distDir, 'manifest.json');
const errors = [];

const exists = (relativePath) => fs.existsSync(path.join(distDir, relativePath));

if (!fs.existsSync(manifestPath)) {
  errors.push('dist/manifest.json is missing. Run npm run build first.');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (manifest.version !== packageJson.version) {
    errors.push(`manifest version ${manifest.version} does not match package.json version ${packageJson.version}.`);
  }

  if (manifest.manifest_version !== 3) errors.push('manifest_version must be 3.');
  if (!manifest.name) errors.push('manifest.name is required.');
  if (!manifest.version) errors.push('manifest.version is required.');
  if (!manifest.description) errors.push('manifest.description is required.');
  if (!manifest.chrome_url_overrides?.newtab) errors.push('manifest.chrome_url_overrides.newtab is required.');
  if (!manifest.background?.service_worker) errors.push('manifest.background.service_worker is required.');
  if (!manifest.permissions?.includes('alarms')) errors.push('manifest.permissions must include alarms.');
}

for (const requiredFile of ['index.html', 'background.js', 'icon16.png', 'icon48.png', 'icon128.png']) {
  if (!exists(requiredFile)) errors.push(`dist/${requiredFile} is missing.`);
}

const findDisallowedFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.name === '.DS_Store') return [entryPath];
    if (entry.isDirectory()) return findDisallowedFiles(entryPath);
    return [];
  });
};

const disallowedFiles = findDisallowedFiles(distDir);
if (disallowedFiles.length > 0) {
  errors.push(`disallowed files found: ${disallowedFiles.map((file) => path.relative(rootDir, file)).join(', ')}`);
}

if (errors.length > 0) {
  console.error('Extension validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Extension validation passed for v${packageJson.version}.`);
