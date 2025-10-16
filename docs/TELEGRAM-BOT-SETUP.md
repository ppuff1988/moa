# Telegram Bot 設定教學

本指南將教你如何建立 Telegram Bot 並設定部署通知。

## 📋 目錄

- [建立 Telegram Bot](#建立-telegram-bot)
- [取得 Chat ID](#取得-chat-id)
- [測試 Bot](#測試-bot)
- [設定 GitHub Secrets](#設定-github-secrets)
- [常見問題](#常見問題)

---

## 🤖 建立 Telegram Bot

### 步驟 1：開啟 BotFather

1. 在 Telegram 中搜尋 `@BotFather`（官方 Bot 建立工具）
2. 點擊開始對話

![BotFather](https://core.telegram.org/file/811140184/1/zlN4goPTupk/9ff2f2f01c4bd1b013)

### 步驟 2：建立新 Bot

在對話框中輸入：

```
/newbot
```

### 步驟 3：設定 Bot 名稱

BotFather 會要求你提供兩個名稱：

1. **Bot 顯示名稱**（可以使用中文和空格）

   ```
   範例：MOA 部署通知機器人
   ```

2. **Bot 使用者名稱**（必須以 `bot` 結尾，只能使用英文、數字和底線）
   ```
   範例：moa_deploy_bot
   ```

### 步驟 4：取得 Bot Token

建立成功後，BotFather 會回傳一段訊息，包含你的 **Bot Token**：

```
Done! Congratulations on your new bot. You will find it at t.me/moa_deploy_bot.

Use this token to access the HTTP API:
123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890

Keep your token secure and store it safely, it can be used by anyone to control your bot.
```

**⚠️ 重要**：

- 請妥善保管這個 Token，不要公開分享
- 任何人擁有這個 Token 都可以控制你的 Bot
- 如果 Token 洩漏，可以用 `/revoke` 指令重新生成

### 步驟 5：（可選）設定 Bot 頭像和說明

你可以使用以下指令進一步設定 Bot：

```
/setuserpic   # 設定 Bot 頭像
/setdescription   # 設定 Bot 說明
/setabouttext   # 設定 Bot 關於文字
```

---

## 🆔 取得 Chat ID

要讓 Bot 發送訊息給你，需要取得你的 **Chat ID**。根據接收對象不同，有三種方式：

### 方法 1：取得個人 Chat ID（最簡單）

1. 在 Telegram 中搜尋 `@userinfobot` 或 `@getmyid_bot`
2. 點擊「開始」或發送 `/start`
3. Bot 會立即回傳你的 Chat ID

```
Your user ID: 123456789
```

**✅ 適用場景**：接收通知到個人訊息

---

### 方法 2：取得群組 Chat ID

#### 步驟 1：建立群組（如果還沒有）

1. 在 Telegram 中建立一個新群組
2. 命名為「MOA 部署通知」或你喜歡的名稱

#### 步驟 2：將 Bot 加入群組

1. 進入群組設定
2. 點擊「新增成員」
3. 搜尋你的 Bot 使用者名稱（例如：`@moa_deploy_bot`）
4. 將 Bot 加入群組

#### 步驟 3：取得群組 Chat ID

**方法 A：使用瀏覽器**

1. 在群組中發送任意訊息（例如：`Hello`）
2. 在瀏覽器中訪問以下網址（記得替換成你的 Bot Token）：

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

例如：

```
https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
```

3. 你會看到一個 JSON 回應，找到 `"chat":{"id":-1001234567890}` 的部分

```json
{
	"ok": true,
	"result": [
		{
			"update_id": 123456789,
			"message": {
				"message_id": 1,
				"from": {
					"id": 987654321,
					"is_bot": false,
					"first_name": "Your Name"
				},
				"chat": {
					"id": -1001234567890, // 👈 這就是群組的 Chat ID
					"title": "MOA 部署通知",
					"type": "supergroup"
				},
				"date": 1699999999,
				"text": "Hello"
			}
		}
	]
}
```

**方法 B：使用命令列**

在終端機執行（記得替換 Token）：

```bash
curl https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
```

或使用 PowerShell（Windows）：

```powershell
Invoke-RestMethod -Uri "https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates"
```

**✅ 適用場景**：多人接收通知、團隊協作

**💡 提示**：

- 群組 Chat ID 是**負數**（例如：`-1001234567890`）
- 個人 Chat ID 是**正數**（例如：`123456789`）
- 如果看不到 Chat ID，確保在群組中發送過訊息

---

### 方法 3：使用第三方 Bot

還有一些第三方 Bot 可以幫你取得群組 Chat ID：

1. 搜尋 `@raw_info_bot`
2. 將它加入群組
3. 在群組中發送 `/start`
4. Bot 會回傳群組的詳細資訊，包括 Chat ID

---

## 🧪 測試 Bot

在設定 GitHub Secrets 之前，建議先測試 Bot 是否正常運作。

### 使用 curl 測試（Linux/macOS/Windows Git Bash）

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=🚀 測試訊息：MOA 部署通知 Bot 運作正常！"
```

### 使用 PowerShell 測試（Windows）

```powershell
$botToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
$chatId = "123456789"  # 或群組 ID：-1001234567890
$message = "🚀 測試訊息：MOA 部署通知 Bot 運作正常！"

$uri = "https://api.telegram.org/bot$botToken/sendMessage"
$body = @{
    chat_id = $chatId
    text = $message
}

Invoke-RestMethod -Uri $uri -Method Post -Body $body
```

### 測試 Markdown 格式

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "parse_mode=Markdown" \
  -d "text=🚀 *測試訊息*

*專案:* \`moa\`
*狀態:* ✅ 成功

[查看詳情](https://github.com)"
```

**預期結果**：你應該會在 Telegram 中收到測試訊息

---

## 🔐 設定 GitHub Secrets

### 步驟 1：前往 GitHub 專案

1. 開啟你的 GitHub 專案頁面
2. 點擊 **Settings**（設定）

### 步驟 2：建立 Production 環境

1. 在左側選單點擊 **Environments**
2. 點擊 **New environment**
3. 輸入環境名稱：`production`
4. 點擊 **Configure environment**

### 步驟 3：新增 Secrets

在 **Environment secrets** 區域：

#### 3.1 新增 TELEGRAM_BOT_TOKEN

1. 點擊 **Add secret**
2. Name: `TELEGRAM_BOT_TOKEN`
3. Value: 貼上你的 Bot Token（例如：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）
4. 點擊 **Add secret**

#### 3.2 新增 TELEGRAM_CHAT_ID

1. 點擊 **Add secret**
2. Name: `TELEGRAM_CHAT_ID`
3. Value: 貼上你的 Chat ID（例如：`123456789` 或 `-1001234567890`）
4. 點擊 **Add secret**

### 步驟 4：驗證設定

設定完成後，你應該看到兩個 Secrets：

```
✅ TELEGRAM_BOT_TOKEN
✅ TELEGRAM_CHAT_ID
```

---

## ✅ 完成！

現在當你的 CD workflow 執行完畢後，你會在 Telegram 收到部署通知，包含：

- 🚀 部署狀態（成功/失敗）
- 📦 專案名稱
- 🌿 分支名稱
- 👤 提交者
- 📝 提交訊息
- 🔗 查看工作流程的連結

---

## ❓ 常見問題

### Q1: 為什麼我的 Bot 不會發送訊息？

**A:** 請檢查以下幾點：

1. **Bot Token 是否正確**
   - 確認沒有多餘的空格或換行
   - Token 格式應該是：`數字:英文數字混合`

2. **Chat ID 是否正確**
   - 個人 ID 是正數
   - 群組 ID 是負數（通常以 `-100` 開頭）

3. **Bot 是否在群組中**（如果使用群組）
   - 確認 Bot 已加入群組
   - 確認 Bot 沒有被踢出或封鎖

4. **權限問題**
   - 如果是群組，確認 Bot 有發言權限

---

### Q2: 如何找不到我的群組 Chat ID？

**A:** 確保你已經：

1. 將 Bot 加入群組
2. 在群組中發送至少一則訊息
3. 然後再訪問 `getUpdates` API

如果還是找不到，可以：

- 使用 `@raw_info_bot` 輔助
- 或在群組中標記你的 Bot（`@your_bot_name`）

---

### Q3: 可以發送到多個群組嗎？

**A:** 預設的 workflow 只支援一個 Chat ID。如果要發送到多個地方，你可以：

**方法 1：使用多個 Bot**

- 建立多個 Bot，每個對應不同的群組
- 在 Secrets 中設定多組 Token 和 Chat ID

**方法 2：修改 workflow**

- 修改 cd.yml，使用逗號分隔多個 Chat ID
- 使用循環發送到多個目標

---

### Q4: Bot Token 洩漏了怎麼辦？

**A:** 立即採取以下步驟：

1. 在 BotFather 中使用 `/revoke` 指令撤銷舊 Token
2. 會得到一個新的 Token
3. 更新 GitHub Secrets 中的 `TELEGRAM_BOT_TOKEN`

---

### Q5: 可以自訂訊息格式嗎？

**A:** 可以！編輯 `.github/workflows/cd.yml` 中的 `message` 部分：

```yaml
message: |
  🚀 *部署通知*

  *狀態:* ${{ needs.deploy-production.result == 'success' && '✅ 部署成功' || '❌ 部署失敗' }}
  *專案:* `${{ github.repository }}`
  *分支:* `${{ github.ref_name }}`
  *提交者:* ${{ github.actor }}
  *提交訊息:* ${{ github.event.head_commit.message }}

  [查看工作流程](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
```

支援的格式（Markdown）：

- `*粗體*` → **粗體**
- `_斜體_` → _斜體_
- `` `程式碼` `` → `程式碼`
- `[連結文字](URL)` → [連結文字](URL)

---

### Q6: 測試時收不到訊息？

**A:** 檢查以下幾點：

1. **網路連線**：確認可以訪問 `api.telegram.org`
2. **Bot 是否被封鎖**：確認你沒有封鎖 Bot
3. **API 回應**：檢查 curl 或 API 的回應訊息
4. **隱私設定**：如果是首次使用，需要先在 Telegram 中搜尋你的 Bot 並點擊「開始」

---

## 📚 延伸閱讀

- [Telegram Bot API 官方文檔](https://core.telegram.org/bots/api)
- [BotFather 官方指南](https://core.telegram.org/bots#6-botfather)
- [appleboy/telegram-action GitHub](https://github.com/appleboy/telegram-action)
- [CI/CD 設定指南](./CI-CD.md)

---

## 💡 提示

- 建議建立一個專門的部署通知群組，方便團隊成員接收通知
- 可以為不同環境（production、staging）設定不同的 Bot 或群組
- 定期更新 Bot Token，提升安全性
- 保持 Bot Token 私密，不要提交到 Git

---

如有任何問題，歡迎在 [GitHub Issues](https://github.com/ppuff1988/moa/issues) 提問！
