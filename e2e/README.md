# E2E 測試文件

本目錄包含使用 Playwright 編寫的端對端（E2E）測試。

## 📁 檔案結構

```
e2e/
├── helpers.ts           # 共用的測試輔助函數（避免重複程式碼）
├── auth.test.ts        # 身份驗證測試（註冊、登入、登出）
├── navigation.test.ts  # 導航測試（路由、頁面跳轉、權限控制）
├── room.test.ts        # 房間測試（創建、加入、玩家互動）
├── game-flow.test.ts   # 遊戲流程測試（遊戲邏輯）
└── README.md           # 本檔案
```

## 🎯 測試設計原則

### 1. **避免重複程式碼**

所有共用的功能都抽取到 `helpers.ts` 中：

- 用戶認證（註冊、登入、登出）
- 房間操作（創建、加入）
- 常用斷言（檢查頁面、錯誤訊息）
- 工具函數（等待、截圖、清理）

### 2. **職責分離**

每個測試檔案專注於特定功能領域：

- `auth.test.ts` - 只測試認證相關功能
- `navigation.test.ts` - 只測試導航和路由
- `room.test.ts` - 只測試房間功能
- `game-flow.test.ts` - 只測試遊戲流程

### 3. **可維護性**

- 使用描述性的測試名稱
- 使用 `test.describe` 組織相關測試
- 使用 `beforeEach` 進行測試前清理

## 🚀 執行測試

### 執行所有測試

```bash
npm run test:e2e
```

### 執行特定測試檔案

```bash
npx playwright test auth.test.ts
npx playwright test navigation.test.ts
npx playwright test room.test.ts
```

### 執行特定測試（by 名稱）

```bash
npx playwright test -g "應該成功註冊新用戶"
```

### 使用 UI 模式（互動式）

```bash
npx playwright test --ui
```

### 執行特定瀏覽器

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug 模式

```bash
npx playwright test --debug
```

### 顯示測試報告

```bash
npx playwright show-report test-results/playwright-report
```

## 📝 輔助函數說明

### 認證相關

```typescript
// 註冊新用戶
await registerUser(page, username, password, nickname);

// 登入用戶
await loginUser(page, username, password);

// 確保用戶已登入（如不存在則自動註冊）
await ensureLoggedIn(page, TEST_USERS.user1);

// 登出用戶
await logoutUser(page);
```

### 房間相關

```typescript
// 創建房間
await createRoom(page, roomName);

// 加入房間
await joinRoom(page, roomCode);

// 獲取房間代碼
const roomCode = getRoomCodeFromUrl(page.url());

// 等待房間載入完成
await waitForRoomReady(page);

// 獲取房間內玩家列表
const players = await getPlayersInRoom(page);

// 開始遊戲
await startGame(page);
```

### 斷言相關

```typescript
// 檢查是否在登入頁面
await expectLoginPage(page);

// 檢查是否在首頁
await expectHomePage(page);

// 檢查錯誤訊息
await expectErrorMessage(page, '密碼');

// 檢查成功訊息
await expectSuccessMessage(page, '成功');
```

### 工具函數

```typescript
// 等待元素包含特定文字
await waitForText(page, '.selector', '文字內容');

// 截圖（用於除錯）
await takeScreenshot(page, 'test-name');

// 清理測試資料
await cleanupTestData(page);

// 模擬網路錯誤
await simulateNetworkError(page);

// 恢復網路連線
await restoreNetwork(page);
```

## 🧪 測試用戶

預定義的測試用戶（在 `helpers.ts` 中）：

```typescript
TEST_USERS.user1; // 測試玩家1
TEST_USERS.user2; // 測試玩家2
TEST_USERS.user3; // 測試玩家3
```

## 🔧 配置

測試配置位於 `playwright.config.ts`：

- 測試超時時間
- 瀏覽器設定
- 截圖和視頻記錄
- 開發伺服器配置

## 📊 測試報告

測試執行後會生成：

- HTML 報告：`test-results/playwright-report/`
- 截圖（失敗時）：`test-results/`
- 視頻（失敗時）：`test-results/`
- JSON 結果：`test-results/test-results.json`

## 💡 最佳實踐

1. **使用 data-testid 屬性**
   在 UI 組件中添加 `data-testid` 屬性，使選擇器更穩定：

   ```html
   <div data-testid="room-info">...</div>
   ```

2. **避免硬編碼等待時間**
   使用 Playwright 的自動等待機制，避免 `waitForTimeout`：

   ```typescript
   // ❌ 不好
   await page.waitForTimeout(1000);

   // ✅ 好
   await page.waitForSelector('[data-testid="element"]');
   ```

3. **獨立的測試**
   每個測試應該獨立執行，不依賴其他測試的結果。

4. **清理測試資料**
   在 `beforeEach` 中清理資料，確保測試環境乾淨。

5. **使用描述性的測試名稱**
   測試名稱應該清楚說明測試的內容和預期結果。

## 🐛 除錯技巧

1. **使用 UI 模式**

   ```bash
   npx playwright test --ui
   ```

2. **使用 Debug 模式**

   ```bash
   npx playwright test --debug
   ```

3. **查看測試追蹤**

   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```

4. **添加截圖**
   在測試中添加：

   ```typescript
   await takeScreenshot(page, 'debug-point');
   ```

5. **使用 page.pause()**
   暫停測試執行以檢查狀態：
   ```typescript
   await page.pause();
   ```

## 📚 更多資源

- [Playwright 官方文件](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
