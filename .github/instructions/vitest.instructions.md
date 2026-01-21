---
applyTo: '**/*.test.ts,**/*.spec.ts,**/vitest.config.ts'
description: 'Vitest 單元測試最佳實作指南，涵蓋測試結構、模擬策略、覆蓋率要求與 SvelteKit 整合。'
---

# Vitest 單元測試規範指南

## 你的任務

作為 GitHub Copilot，你是 Vitest 測試框架的專家。你的任務是協助開發者撰寫高品質、可維護的單元測試，確保程式碼品質與可靠性。

## 核心原則

### 🎯 測試金字塔

1. **單元測試（70%）** - 快速、隔離、專注於單一功能
2. **整合測試（20%）** - 驗證模組間的互動
3. **端對端測試（10%）** - 驗證完整使用者流程

### 📏 測試品質標準

- **覆蓋率目標**：80% 以上（關鍵業務邏輯 90%+）
- **測試隔離**：每個測試獨立運行，無相依性
- **快速執行**：單一測試檔案應在 5 秒內完成
- **可讀性**：測試即文檔，清晰描述預期行為

---

## 1. 測試檔案結構

### 1.1 檔案命名與位置

```
frontend/src/
├── lib/
│   ├── utils/
│   │   ├── format.ts
│   │   └── format.test.ts       # 單元測試與原始碼同目錄
│   └── components/
│       ├── Button.svelte
│       └── Button.test.ts
└── routes/
    └── __tests__/               # 路由測試集中管理
        └── home.test.ts
```

### 1.2 基本測試結構

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 模組級別的 mock 必須在 import 之前
vi.mock('$lib/api/client', () => ({
	fetchData: vi.fn()
}));

// 動態 import 被 mock 的模組
const { formatDate } = await import('$lib/utils/format');

describe('formatDate', () => {
	// 群組設定
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-08'));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	// 測試案例
	it('should format ISO date to locale string', () => {
		const result = formatDate('2025-01-08T10:30:00Z');
		expect(result).toBe('2025/01/08');
	});

	it('should return "Invalid Date" for malformed input', () => {
		const result = formatDate('not-a-date');
		expect(result).toBe('Invalid Date');
	});

	it('should handle null input gracefully', () => {
		const result = formatDate(null);
		expect(result).toBe('');
	});
});
```

---

## 2. 測試命名規範

### 2.1 describe 區塊命名

```typescript
// ✅ 正確：使用函式名稱或類別名稱
describe('formatDate', () => {});
describe('DeviceService', () => {});
describe('useDeviceStore', () => {});

// ✅ 正確：巢狀 describe 描述情境
describe('DeviceService', () => {
	describe('when device is online', () => {});
	describe('when device is offline', () => {});
});

// ❌ 錯誤：過於模糊
describe('utils', () => {});
describe('tests', () => {});
```

### 2.2 it/test 命名

使用 **should + 動詞 + 預期結果** 格式：

```typescript
// ✅ 正確：清晰描述預期行為
it('should return formatted date when valid ISO string provided', () => {});
it('should throw error when API returns 500', () => {});
it('should update store when device state changes', () => {});

// ❌ 錯誤：描述不清或過於簡短
it('works', () => {});
it('test formatDate', () => {});
it('error case', () => {});
```

---

## 3. Mock 策略

### 3.1 模組 Mock（vi.mock）

```typescript
// 完整模組 mock
vi.mock('$lib/api/devices', () => ({
	getDevices: vi.fn(() => Promise.resolve([])),
	updateDevice: vi.fn(() => Promise.resolve({ success: true }))
}));

// 部分 mock（保留原始實作）
vi.mock('$lib/utils/helpers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/helpers')>();
	return {
		...actual,
		sendAnalytics: vi.fn() // 只 mock 這個函式
	};
});
```

### 3.2 函式 Mock（vi.fn）

```typescript
// 基本 mock 函式
const mockCallback = vi.fn();

// 帶回傳值的 mock
const mockFetch = vi.fn().mockResolvedValue({ data: [] });

// 根據呼叫次數回傳不同值
const mockRetry = vi
	.fn()
	.mockRejectedValueOnce(new Error('First attempt failed'))
	.mockResolvedValueOnce({ success: true });

// 驗證呼叫
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
```

### 3.3 Spy（vi.spyOn）

```typescript
// 監視物件方法
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// 測試後驗證
expect(consoleSpy).toHaveBeenCalledWith('Expected error message');

// 清理
consoleSpy.mockRestore();
```

### 3.4 Timer Mock

```typescript
beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

it('should debounce input', async () => {
	const debouncedFn = debounce(mockFn, 300);

	debouncedFn();
	debouncedFn();
	debouncedFn();

	expect(mockFn).not.toHaveBeenCalled();

	await vi.advanceTimersByTimeAsync(300);

	expect(mockFn).toHaveBeenCalledTimes(1);
});
```

---

## 4. SvelteKit 測試模式

### 4.1 測試 Svelte 元件

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
	it('should render with provided label', () => {
		render(Button, { props: { label: 'Click me' } });

		expect(screen.getByRole('button')).toHaveTextContent('Click me');
	});

	it('should call onClick when clicked', async () => {
		const handleClick = vi.fn();
		render(Button, { props: { label: 'Click', onclick: handleClick } });

		await fireEvent.click(screen.getByRole('button'));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('should be disabled when disabled prop is true', () => {
		render(Button, { props: { label: 'Disabled', disabled: true } });

		expect(screen.getByRole('button')).toBeDisabled();
	});
});
```

### 4.2 測試 Svelte Stores

```typescript
import { get } from 'svelte/store';
import { deviceStore, addDevice, removeDevice } from '$lib/stores/devices';

describe('deviceStore', () => {
	beforeEach(() => {
		// 重置 store 狀態
		deviceStore.set([]);
	});

	it('should add device to store', () => {
		const newDevice = { id: '1', name: 'Light' };

		addDevice(newDevice);

		expect(get(deviceStore)).toContainEqual(newDevice);
	});

	it('should remove device by id', () => {
		deviceStore.set([{ id: '1', name: 'Light' }]);

		removeDevice('1');

		expect(get(deviceStore)).toHaveLength(0);
	});
});
```

### 4.3 測試 API 呼叫

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchDevices } from '$lib/api/devices';

describe('fetchDevices', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('should return devices on successful response', async () => {
		const mockDevices = [{ id: '1', name: 'Light' }];
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockDevices)
		});

		const result = await fetchDevices();

		expect(result).toEqual(mockDevices);
		expect(mockFetch).toHaveBeenCalledWith('/api/devices', expect.any(Object));
	});

	it('should throw error on failed response', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error'
		});

		await expect(fetchDevices()).rejects.toThrow('Internal Server Error');
	});
});
```

---

## 5. 測試資料管理

### 5.1 Factory 函式

```typescript
// test-utils/factories.ts
export function createDevice(overrides: Partial<Device> = {}): Device {
	return {
		id: crypto.randomUUID(),
		name: 'Test Device',
		type: 'light',
		state: 'off',
		createdAt: new Date().toISOString(),
		...overrides
	};
}

export function createUser(overrides: Partial<User> = {}): User {
	return {
		id: crypto.randomUUID(),
		email: 'test@example.com',
		name: 'Test User',
		role: 'user',
		...overrides
	};
}

// 使用方式
it('should display device name', () => {
	const device = createDevice({ name: 'Living Room Light' });
	render(DeviceCard, { props: { device } });

	expect(screen.getByText('Living Room Light')).toBeInTheDocument();
});
```

### 5.2 Fixtures

```typescript
// test-utils/fixtures.ts
export const fixtures = {
	devices: {
		light: createDevice({ type: 'light', name: 'Smart Light' }),
		thermostat: createDevice({ type: 'thermostat', name: 'Smart Thermostat' }),
		sensor: createDevice({ type: 'sensor', name: 'Motion Sensor' })
	},
	users: {
		admin: createUser({ role: 'admin', name: 'Admin User' }),
		regular: createUser({ role: 'user', name: 'Regular User' })
	}
};
```

---

## 6. 錯誤處理測試

### 6.1 測試例外

```typescript
it('should throw TypeError for invalid input', () => {
	expect(() => parseConfig(null)).toThrow(TypeError);
	expect(() => parseConfig(null)).toThrow('Config cannot be null');
});

it('should reject with specific error', async () => {
	mockFetch.mockRejectedValueOnce(new Error('Network error'));

	await expect(fetchDevices()).rejects.toThrow('Network error');
});
```

### 6.2 測試邊界條件

```typescript
describe('calculateTotal', () => {
	it.each([
		{ input: [], expected: 0, description: 'empty array' },
		{ input: [1], expected: 1, description: 'single item' },
		{ input: [1, 2, 3], expected: 6, description: 'multiple items' },
		{ input: [-1, 1], expected: 0, description: 'negative numbers' },
		{
			input: [Number.MAX_SAFE_INTEGER, 1],
			expected: Number.MAX_SAFE_INTEGER + 1,
			description: 'large numbers'
		}
	])('should return $expected for $description', ({ input, expected }) => {
		expect(calculateTotal(input)).toBe(expected);
	});
});
```

---

## 7. 非同步測試

### 7.1 Promise 測試

```typescript
// 使用 async/await
it('should resolve with data', async () => {
	const result = await fetchData();
	expect(result).toEqual({ success: true });
});

// 使用 resolves/rejects matcher
it('should resolve successfully', async () => {
	await expect(fetchData()).resolves.toEqual({ success: true });
});

it('should reject with error', async () => {
	await expect(fetchInvalidData()).rejects.toThrow('Invalid data');
});
```

### 7.2 等待 DOM 更新

```typescript
import { waitFor } from '@testing-library/svelte';

it('should show loading then data', async () => {
	render(DeviceList);

	// 初始顯示 loading
	expect(screen.getByText('Loading...')).toBeInTheDocument();

	// 等待資料載入完成
	await waitFor(() => {
		expect(screen.getByText('Device 1')).toBeInTheDocument();
	});

	// loading 消失
	expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

---

## 8. 覆蓋率設定

### 8.1 vitest.config.ts 設定

```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test-utils/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'src/test-utils/', '**/*.d.ts', '**/*.config.*', '**/types/**'],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80
			}
		}
	}
});
```

---

## 9. 測試 Checklist

在提交 PR 前，確保：

- [ ] 所有新功能都有對應的測試
- [ ] 測試覆蓋率達到 80% 以上
- [ ] 測試名稱清晰描述預期行為
- [ ] Mock 正確清理，避免測試污染
- [ ] 邊界條件和錯誤情境都有測試
- [ ] 非同步測試正確處理 Promise
- [ ] 測試可以獨立運行，無順序相依

---

## Copilot 協助項目

作為 GitHub Copilot，我可以協助你：

1. **生成測試案例** - 根據函式簽名自動產生測試框架
2. **建議 Mock 策略** - 分析相依性並建議最佳 mock 方式
3. **修復失敗測試** - 分析錯誤訊息並提供修正建議
4. **提升覆蓋率** - 識別未測試的程式碼路徑
5. **重構測試** - 改善測試結構和可讀性

只需描述你的測試需求，我會協助產生符合規範的測試程式碼。
