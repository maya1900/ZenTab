# Chrome Web Store 自动发布

ZenTab 使用 GitHub Actions 自动构建、打包并发布 Chrome Web Store 新版本。

## GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：

- `CHROME_EXTENSION_ID`：Chrome Web Store 扩展 ID。
- `CHROME_CLIENT_ID`：Google Cloud OAuth Client ID。
- `CHROME_CLIENT_SECRET`：Google Cloud OAuth Client Secret。
- `CHROME_REFRESH_TOKEN`：带 Chrome Web Store API scope 的 refresh token。

OAuth scope：

```text
https://www.googleapis.com/auth/chromewebstore
```

授权的 Google 账号必须拥有该 Chrome Web Store 扩展的发布权限。

## 自动发布流程

1. 打开 GitHub 仓库的 **Actions**。
2. 选择 **Chrome Web Store Release**。
3. 点击 **Run workflow**。
4. 选择发布目标：
   - `public`：上传并请求公开发布。
   - `upload-only`：只上传新版包，不请求公开发布，适合排查问题。
5. 工作流会自动：
   - 递增 patch 版本，例如 `1.0.4` → `1.0.5`。
   - 同步 `package.json`、`package-lock.json` 和 `public/manifest.json`。
   - 运行类型检查和生产构建。
   - 校验扩展产物。
   - 生成 `release/zentab-v<version>.zip`。
   - 上传 zip 到 GitHub Actions artifact。
   - 提交版本更新并创建 `v<version>` tag。
   - 上传到 Chrome Web Store。
   - 如果选择 `public`，请求公开发布。

Chrome Web Store 仍可能需要审核；自动化不会绕过审核。

## 已安装扩展的更新检测

Chrome Web Store 安装的 ZenTab 会由 Chrome 自动更新。包含后台更新检测能力的版本发布后，ZenTab 还会通过 MV3 background service worker 定期主动请求更新检查，并根据设置里的“自动应用扩展更新”开关决定是否在检测到新版时自动 reload 扩展。

注意：关闭“自动应用扩展更新”不会阻止 Chrome Web Store 更新扩展，只是不主动检查、不主动 reload。Chrome 仍可能按自己的更新周期在浏览器重启或稍后时机应用新版。

## 本地打包验证

```bash
npm run release:local
```

生成的 zip 位于：

```text
release/zentab-v<version>.zip
```

zip 根目录应该直接包含：

```text
manifest.json
index.html
assets/
icon16.png
icon48.png
icon128.png
```

不要把整个 `dist/` 文件夹套进 zip。当前脚本已经自动处理这一点。

## 手动同步版本

只同步当前 `package.json` 版本：

```bash
npm run version:sync
```

递增 patch 版本：

```bash
node scripts/sync-version.mjs patch
```

同步到指定版本：

```bash
node scripts/sync-version.mjs 1.0.5
```

Chrome 扩展版本只能使用 1 到 4 段数字，例如 `1.0.5`，不能使用 `1.0.5-beta.1`。
