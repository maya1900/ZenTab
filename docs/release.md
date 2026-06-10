# Chrome Web Store 自动发布

ZenTab 使用 GitHub Actions 自动构建、打包并发布 Chrome Web Store 新版本。

Chrome Web Store 页面：

```text
https://chromewebstore.google.com/detail/zentab/podnhfddiedpalpoelnjdgflpnhclepp
```

## GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：

- `CHROME_EXTENSION_ID`：Chrome Web Store 扩展 ID。
- `CHROME_CLIENT_ID`：Google Cloud OAuth Client ID。
- `CHROME_CLIENT_SECRET`：Google Cloud OAuth Client Secret。
- `CHROME_REFRESH_TOKEN`：带 Chrome Web Store API scope 的 refresh token。

### `CHROME_EXTENSION_ID`

打开 Chrome Web Store 开发者后台：

```text
https://chrome.google.com/webstore/devconsole
```

进入 ZenTab 扩展详情页后，扩展 ID 可以从 URL 或扩展信息中找到。当前 ZenTab 的 Chrome Web Store URL 是：

```text
https://chromewebstore.google.com/detail/zentab/podnhfddiedpalpoelnjdgflpnhclepp
```

其中 `podnhfddiedpalpoelnjdgflpnhclepp` 就是 `CHROME_EXTENSION_ID`。

### `CHROME_CLIENT_ID` 和 `CHROME_CLIENT_SECRET`

打开 Google Cloud Console 凭据页：

```text
https://console.cloud.google.com/apis/credentials
```

选择用于发布 Chrome Web Store 的 Google Cloud 项目，然后打开 **APIs & Services → Credentials**。

如果已经有 OAuth Client：

1. 在 **OAuth 2.0 Client IDs** 中找到发布用的 client。
2. 点进详情页。
3. 复制 **Client ID** 到 `CHROME_CLIENT_ID`。
4. 复制 **Client secret** 到 `CHROME_CLIENT_SECRET`。

如果找不到原来的 OAuth Client，就新建一个：

1. 点击 **Create credentials → OAuth client ID**。
2. Application type 选择 **Web application**。
3. Name 可以填 `ZenTab Chrome Web Store Release`。
4. 在 **Authorized redirect URIs** 添加：

   ```text
   https://developers.google.com/oauthplayground
   ```

5. 创建后复制 **Client ID** 和 **Client secret**，分别写入 GitHub Secrets。

如果忘了或看不到原来的 **Client secret**，不能靠代码找回；在 Google Cloud Console 里 reset secret，或新建 OAuth Client，然后同步更新 GitHub Secrets。

### `CHROME_REFRESH_TOKEN`

打开 Google OAuth 2.0 Playground：

```text
https://developers.google.com/oauthplayground/
```

1. 点击右上角齿轮。
2. 勾选 **Use your own OAuth credentials**。
3. 填入上一步拿到的 `CHROME_CLIENT_ID` 和 `CHROME_CLIENT_SECRET`。
4. 在 scope 输入框填：

```text
https://www.googleapis.com/auth/chromewebstore
```

5. 点击 **Authorize APIs**。
6. 使用拥有 ZenTab Chrome Web Store 发布权限的 Google 账号授权。
7. 回到 Playground，点击 **Exchange authorization code for tokens**。
8. 复制返回的 **Refresh token**，写入 GitHub Secret `CHROME_REFRESH_TOKEN`。

授权的 Google 账号必须拥有该 Chrome Web Store 扩展的发布权限。不要使用 Playground 默认 OAuth credentials 生成长期 token；使用自己的 OAuth credentials 更稳定。

如果 OAuth Playground 返回里有类似：

```json
{
  "refresh_token_expires_in": 604799,
  "expires_in": 3599,
  "token_type": "Bearer"
}
```

`expires_in` 是 access token 的有效期，约 1 小时，这是正常的；发布脚本会用 refresh token 自动换新的 access token。`refresh_token_expires_in: 604799` 表示 refresh token 约 7 天后过期，通常是因为 Google Cloud OAuth consent screen 还处于 **Testing**。

要避免每 7 天重生成一次 refresh token：

1. 打开 Google Cloud OAuth audience 页面：

   ```text
   https://console.cloud.google.com/auth/audience
   ```

2. 选择发布用的 Google Cloud 项目。
3. 如果 Publishing status 是 **Testing**，点击 **Publish app**，切到 **In production**。
4. 重新用 OAuth Playground 生成一次 `CHROME_REFRESH_TOKEN`，并更新 GitHub Secret。

切到 production 后，refresh token 不会因为 Testing 模式固定 7 天过期；但仍可能因为用户主动撤销授权、长时间不用、重置 OAuth secret、超过 token 数量限制等原因失效。

如果发布日志出现 `invalid_grant` 或 `Token has been expired or revoked.`，说明 GitHub Secret 里的 `CHROME_REFRESH_TOKEN` 已失效。重新生成带上述 scope 的 refresh token，并更新 **Settings → Secrets and variables → Actions → CHROME_REFRESH_TOKEN** 后重新运行 workflow。

## 自动发布流程

推送到 `main` 后，GitHub Actions 会自动运行 **Chrome Web Store Release**，默认上传并请求公开发布。

也可以手动触发，用于补发或排查：

1. 打开 GitHub 仓库的 **Actions**。
2. 选择 **Chrome Web Store Release**。
3. 点击 **Run workflow**。
4. 选择发布目标：
   - `public`：上传并请求公开发布。
   - `upload-only`：只上传新版包，不请求公开发布，适合排查问题。

工作流会自动：
   - 递增 patch 版本，例如 `1.0.4` → `1.0.5`。
   - 同步 `package.json`、`package-lock.json` 和 `public/manifest.json`。
   - 运行类型检查和生产构建。
   - 校验扩展产物。
   - 生成 `release/zentab-v<version>.zip`。
   - 上传 zip 到 GitHub Actions artifact。
   - 提交版本更新并创建 `v<version>` tag。
   - 创建 GitHub Release，并把 zip 作为 release 附件上传到仓库右侧的 **Releases** 区块。
   - 上传到 Chrome Web Store。
   - 自动触发时请求公开发布；手动触发时按选择的发布目标执行。

Chrome Web Store 仍可能需要审核；自动化不会绕过审核。

## 已安装扩展的更新检测

Chrome Web Store 安装的 ZenTab 会由 Chrome 自动更新。ZenTab 监听 Chrome 的更新可用事件，并在新版已经下载好时允许用户立即应用更新。

如果 Chrome 已发现并下载新版，ZenTab 会在 **个性设置 → 关于** 中展示新版本号，并显示“立即更新”。点击“立即更新”会 reload 扩展并应用 Chrome 已下载的新版本。

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
