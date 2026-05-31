import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const zipPath = process.argv[2] || path.join(rootDir, 'release', `zentab-v${packageJson.version}.zip`);
const publishTarget = process.argv[3] || 'upload-only';
const requiredEnv = ['CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (!['upload-only', 'public'].includes(publishTarget)) {
  console.error(`Invalid publish target: ${publishTarget}. Use upload-only or public.`);
  process.exit(1);
}

if (!fs.existsSync(zipPath)) {
  console.error(`Extension zip not found: ${zipPath}`);
  process.exit(1);
}

const getAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: process.env.CHROME_CLIENT_ID,
    client_secret: process.env.CHROME_CLIENT_SECRET,
    refresh_token: process.env.CHROME_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to refresh OAuth token: ${JSON.stringify(result)}`);
  }

  return result.access_token;
};

const uploadExtension = async (accessToken) => {
  const zipBuffer = fs.readFileSync(zipPath);
  const extensionId = process.env.CHROME_EXTENSION_ID;
  const response = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/zip',
      'x-goog-api-version': '2'
    },
    body: zipBuffer
  });

  const result = await response.json();
  if (!response.ok || result.uploadState === 'FAILURE') {
    throw new Error(`Chrome Web Store upload failed: ${JSON.stringify(result)}`);
  }

  return result;
};

const publishExtension = async (accessToken) => {
  const extensionId = process.env.CHROME_EXTENSION_ID;
  const response = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-goog-api-version': '2'
    },
    body: JSON.stringify({ target: 'default' })
  });

  const result = await response.json();
  if (!response.ok || result.status?.some((status) => status.toLowerCase().includes('error'))) {
    throw new Error(`Chrome Web Store publish failed: ${JSON.stringify(result)}`);
  }

  return result;
};

try {
  const accessToken = await getAccessToken();
  const uploadResult = await uploadExtension(accessToken);
  console.log(`Uploaded ${path.relative(rootDir, zipPath)} for v${packageJson.version}.`);
  console.log(JSON.stringify(uploadResult, null, 2));

  if (publishTarget === 'public') {
    const publishResult = await publishExtension(accessToken);
    console.log('Requested public publish. Chrome Web Store review may still be required.');
    console.log(JSON.stringify(publishResult, null, 2));
  } else {
    console.log('Upload complete. Skipping public publish because publish target is upload-only.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
