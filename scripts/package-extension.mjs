import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const zipPath = path.join(releaseDir, `zentab-v${packageJson.version}.zip`);

if (!fs.existsSync(distDir)) {
  console.error('dist/ is missing. Run npm run build first.');
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(path.relative(rootDir, zipPath));
});

archive.on('warning', (error) => {
  if (error.code === 'ENOENT') {
    console.warn(error);
    return;
  }

  throw error;
});

archive.on('error', (error) => {
  throw error;
});

archive.pipe(output);
archive.directory(distDir, false);
await archive.finalize();
