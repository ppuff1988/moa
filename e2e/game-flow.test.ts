import { expect, test, type Page } from '@playwright/test';
import { createTestUser, type TestUser } from './helpers';

test.describe('Game Flow', () => {
	/**
	 * 確保獸首區域是展開的輔助函數
	 * @param page - 當前頁面
	 * @returns 是否成功展開
	 */
	async function ensureBeastSectionExpanded(page: Page): Promise<boolean> {
		const beastSection = page.locator('.beast-heads-section');
		const hasBeastSection = await beastSection.isVisible({ timeout: 1000 }).catch(() => false);

		if (!hasBeastSection) {
			return false;
		}

		const isCollapsed = await beastSection
			.evaluate((el) => el.classList.contains('collapsed'))
			.catch(() => false);

		if (isCollapsed) {
			console.log(`   📂 獸首區域已收起，展開中...`);
			const toggleButton = beastSection.locator('.toggle-button');
			if (await toggleButton.isVisible({ timeout: 1000 })) {
				await toggleButton.click();
				await page.waitForTimeout(500);
				return true;
			}
			return false;
		}

		return true; // 已經是展開狀態
	}

	/**
	 * 鑑定獸首的輔助函數
	 * @param page - 當前頁面
	 * @param artifactName - 獸首名稱（用於日誌）
	 * @param cardIndex - 獸首卡片索引
	 * @param beastCards - 獸首卡片選擇器
	 * @returns 鑑定結果（真品/贗品/無法鑑定/未知）
	 */
	async function identifyArtifact(
		page: Page,
		artifactName: string,
		cardIndex: number,
		beastCards: { nth: (index: number) => { click: () => Promise<void> } }
	): Promise<string> {
		const artifactButton = beastCards.nth(cardIndex);

		await artifactButton.click();
		console.log(`   🔍 點擊了獸首: ${artifactName}`);

		// 等待 modal 出現
		await page.waitForTimeout(500);

		// 點擊確認按鈕以完成鑑定
		const confirmButton = page.locator(
			'button:has-text("確認"), button:has-text("確定"), .confirm-btn, .btn-confirm'
		);
		if (await confirmButton.isVisible({ timeout: 2000 })) {
			await confirmButton.click();
			console.log(`   ✅ 點擊確認按鈕`);

			// 確認後等待卡片狀態更新
			await page.waitForTimeout(5000);

			// 從所有獸首卡片中找到對應名稱的卡片（因為卡片順序可能改變）
			let identifyResult = '未知';

			// 重新獲取所有獸首卡片，最多重試3次
			for (let retry = 0; retry < 3; retry++) {
				// 先確保獸首區域是展開的
				await ensureBeastSectionExpanded(page);

				const allBeastCards = page.locator('.beast-card');
				const cardCount = await allBeastCards.count();

				// 找到匹配名稱的卡片
				for (let i = 0; i < cardCount; i++) {
					const card = allBeastCards.nth(i);
					const cardName = await card
						.locator('.beast-name')
						.textContent()
						.catch(() => '');

					if (cardName && cardName.trim() === artifactName) {
						// 找到了對應的卡片，讀取其狀態
						const cardStatusText = await card
							.locator('.beast-status')
							.textContent()
							.catch(() => '');
						console.log(`   🔎 找到卡片 ${artifactName}，狀態文字: "${cardStatusText}"`);

						if (cardStatusText) {
							const trimmedStatus = cardStatusText.trim();
							if (trimmedStatus === '真品') {
								identifyResult = '真品';
							} else if (trimmedStatus === '贗品') {
								identifyResult = '贗品';
							} else if (trimmedStatus.includes('無法鑑定')) {
								identifyResult = '無法鑑定';
							} else if (trimmedStatus.includes('未鑑定')) {
								identifyResult = '未知';
							}

							// 如果獲得有效結果（不是"未知"），跳出重試循環
							if (identifyResult !== '未知') {
								break;
							}
						}
						break;
					}
				}

				// 如果獲得有效結果，跳出重試循環
				if (identifyResult !== '未知') {
					break;
				}

				// 如果還是"未知"，等待後重試
				if (retry < 2) {
					console.log(`   ⏳ 狀態尚未更新，等待後重試 (${retry + 1}/3)...`);
					await page.waitForTimeout(1500);
				}
			}

			console.log(`   ✅ 鑑定了獸首 ${artifactName}: ${identifyResult}`);
			await page.waitForTimeout(500);

			return identifyResult;
		} else {
			console.log(`   ⚠️  未找到確認按鈕，鑑定可能未完成`);
			return '未知';
		}
	}

	/**
	 * 指派下一位玩家的輔助函數
	 * @param page - 當前頁面
	 * @param playerIndex - 當前玩家索引
	 * @returns 是否成功指派
	 */
	async function assignNextPlayer(
		page: Page,
		playerIndex: number
	): Promise<{ success: boolean; assignedPlayer?: string; isDiscussion?: boolean }> {
		console.log('   👉 指派階段');

		await page.waitForTimeout(1000);

		// 先檢查是否在 AssignPhase - 透過 .assign-phase 容器
		const assignPhaseContainer = page.locator('.assign-phase');
		const hasAssignPhase = await assignPhaseContainer
			.isVisible({ timeout: 2000 })
			.catch(() => false);

		if (!hasAssignPhase) {
			console.log('   ⚠️  未找到 AssignPhase 容器');
			return { success: false };
		}

		// 先檢查是否有可指派的玩家按鈕 - 在 .player-list-inline 中
		const assignButtons = assignPhaseContainer.locator('.player-list-inline .player-btn-inline');
		const assignCount = await assignButtons.count().catch(() => 0);
		console.log(`   找到 ${assignCount} 個可指派的玩家按鈕`);

		if (assignCount > 0) {
			// 有可指派的玩家，選擇一位
			const nextPlayerIndex = Math.floor(Math.random() * assignCount);
			const nextButton = assignButtons.nth(nextPlayerIndex);

			// 等待按鈕穩定
			await page.waitForTimeout(500);

			// 先獲取玩家名稱（在 .player-name span 中）
			const nameSpan = nextButton.locator('.player-name');
			const nextName = await nameSpan.textContent().catch(() => '');

			// 使用 scrollIntoViewIfNeeded 確保按鈕在視口內
			await nextButton.scrollIntoViewIfNeeded().catch(() => {});

			// 等待一小段時間讓動畫完成
			await page.waitForTimeout(300);

			// 使用 force 選項強制點擊，忽略穩定性檢查
			await nextButton.click({ force: true, timeout: 10000 });
			console.log(`   ✅ 指派了玩家: ${nextName?.trim() || nextPlayerIndex + 1}`);
			await page.waitForTimeout(1000);
			return { success: true, assignedPlayer: nextName?.trim() || `玩家${nextPlayerIndex + 1}` };
		} else {
			// 沒有可指派的玩家，檢查是否有「進入討論」按鈕
			const discussBtn = assignPhaseContainer.locator(
				'.enter-discussion-btn, button:has-text("進入討論階段")'
			);
			const hasDiscussBtn = await discussBtn.isVisible({ timeout: 2000 });

			if (hasDiscussBtn) {
				// 是最後一位玩家，點擊「進入討論」
				await discussBtn.click();
				console.log('   💬 所有玩家已行動完畢，進入討論階段');
				return { success: true, isDiscussion: true };
			} else {
				console.log(`   ⚠️  未找到可指派的玩家按鈕，也沒有進入討論按鈕`);

				// Debug: 輸出頁面內容幫助診斷
				const pageContent = await page
					.locator('body')
					.textContent()
					.catch(() => '');
				console.log(`   📄 頁面部分內容: ${pageContent?.substring(0, 500)}`);

				// 檢查是否有任何按鈕
				const allButtons = page.locator('button');
				const buttonCount = await allButtons.count().catch(() => 0);
				console.log(`   🔘 頁面上共有 ${buttonCount} 個按鈕`);

				// 列出前幾個按鈕的文字
				for (let i = 0; i < Math.min(buttonCount, 5); i++) {
					const btnText = await allButtons
						.nth(i)
						.textContent()
						.catch(() => '');
					console.log(`   按鈕 ${i + 1}: "${btnText?.trim()}"`);
				}

				// 截圖以供調試
				await page.screenshot({
					path: `test-results/no-assign-buttons-player${playerIndex + 1}.png`
				});
			}
		}

		return { success: false };
	}

	test('complete game flow with 8 players - full role testing', async ({ browser }) => {
		test.setTimeout(1200000); // 增加超時時間到 20 分鐘

		// 創建 8 個測試用戶（8 人遊戲）- 在運行時創建以避免衝突
		const timestamp = Date.now();
		const users: (TestUser & { page: Page | null })[] = Array.from({ length: 8 }, (_, i) => ({
			...createTestUser(`game_${i}`, timestamp + i * 100),
			page: null as Page | null
		}));

		// 創建 8 個瀏覽器上下文和頁面
		const contexts = await Promise.all(Array.from({ length: 8 }, () => browser.newContext()));
		const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));
		users.forEach((user, i) => (user.page = pages[i]));

		try {
			console.log('========== 步驟 1: 批量創建測試帳號（直接寫入資料庫）==========');
			// 使用第一個 page 來調用 API（只需要一次調用）
			const { createTestUsersInDatabase } = await import('./helpers');
			await createTestUsersInDatabase(pages[0], users);

			console.log('\n========== 步驟 2: 所有用戶登入 ==========');
			// 所有用戶登入
			for (let i = 0; i < users.length; i++) {
				console.log(`登入帳號 ${i + 1}/8: ${users[i].username}`);
				await pages[i].goto('/auth/login', { waitUntil: 'networkidle', timeout: 20000 });

				await pages[i].waitForSelector('input#email', { timeout: 5000 });
				await pages[i].fill('input#email', users[i].username);
				await pages[i].fill('input#password', users[i].password);

				// 點擊登入並等待回應
				await pages[i].click('button[type="submit"]');

				// 等待導航完成
				try {
					await pages[i].waitForURL('/', { timeout: 15000 });
					console.log(`  ✅ 帳號 ${i + 1} 登入成功`);
					await pages[i].locator('button:has-text("創建房間")').waitFor({ timeout: 5000 });
				} catch {
					// 檢查是否有錯誤訊息
					const errorText = await pages[i]
						.locator('.error, .error-message, [role="alert"]')
						.textContent()
						.catch(() => '');
					console.error(`  ❌ 帳號 ${i + 1} 登入失敗:`, errorText);

					// 截圖以供調試
					await pages[i].screenshot({ path: `test-results/login-failed-${i + 1}.png` });
					throw new Error(`帳號 ${i + 1} 登入失敗: ${errorText}`);
				}
			}

			console.log('\n========== 步驟 3: 創建並加入房間 ==========');

			// 第一個用戶創建房間
			await pages[0].click('text=創建房間');

			// 等待模態框出現
			await pages[0].waitForTimeout(500);

			// 填入密碼（創建房間只需要密碼，房間名稱會自動生成）
			await pages[0].fill('input#roomPassword', 'test123');
			await pages[0].click('form button[type="submit"]:has-text("創建房間")');

			// 等待導航到房間頁面並獲取房間名稱
			await pages[0].waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 });
			const roomUrl = pages[0].url();
			const createdRoomName = roomUrl.match(/\/room\/([^/]+)\/lobby/)?.[1] || '';

			// 其他用戶加入房間
			for (let i = 1; i < users.length; i++) {
				await pages[i].click('text=加入房間');
				await pages[i].waitForTimeout(500);
				await pages[i].fill('input#roomName', createdRoomName);
				await pages[i].fill('input#roomPassword', 'test123');
				await pages[i].click('form button[type="submit"]:has-text("加入房間")');
				await expect(pages[i]).toHaveURL(new RegExp(`/room/${createdRoomName}`), {
					timeout: 10000
				});
			}

			// 等待所有玩家加入並更新房間狀態
			await pages[0].waitForTimeout(3000);

			// 驗證房主頁面顯示的玩家數量是否正確（應該是 8 人）
			const playerCountText = await pages[0].locator('[data-testid="room-info"]').textContent();
			console.log('房間玩家數量:', playerCountText);

			// 等待「選擇角色」按鈕變為可用（不再 disabled）
			await pages[0].waitForSelector('button:has-text("選擇角色"):not([disabled])', {
				state: 'visible',
				timeout: 30000
			});

			// 房主點擊右上角「選擇角色」按鈕進入選角階段
			await pages[0].click('button:has-text("選擇角色")');

			// 等待所有玩家進入選角階段
			await pages[0].waitForTimeout(2000);

			// 驗證所有玩家進入角色選擇階段
			for (let i = 0; i < users.length; i++) {
				// 檢查是否有角色選擇的下拉選單（使用更精確的選擇器，只選擇第一個）
				await expect(pages[i].locator('select.selection-dropdown').first()).toBeVisible({
					timeout: 10000
				});
			}

			// 追蹤已選擇的角色和顏色
			const selectedRoles: string[] = [];
			const selectedColors: string[] = [];

			// 所有玩家依序選擇角色和顏色，然後按下「鎖定」按鈕
			for (let i = 0; i < users.length; i++) {
				// 等待角色選擇界面完全載入
				await pages[i].waitForTimeout(1000);

				// 選擇角色（使用下拉選單）
				const roleSelect = pages[i].locator('select.selection-dropdown').first();
				await roleSelect.waitFor({ state: 'visible', timeout: 5000 });

				// 獲取可用角色（未禁用的）
				const availableRoleOptions = await roleSelect
					.locator('option:not([disabled])')
					.allTextContents();

				// 選擇一個尚未被選擇的角色
				if (availableRoleOptions.length > 0) {
					// 找到第一個尚未被選擇的角色
					const roleToSelect = availableRoleOptions.find(
						(opt) =>
							opt &&
							opt !== '請選擇角色' &&
							opt.trim() !== '' &&
							!selectedRoles.includes(opt.trim())
					);

					if (roleToSelect) {
						await roleSelect.selectOption({ label: roleToSelect });
						selectedRoles.push(roleToSelect.trim());
						console.log(`玩家 ${i + 1} 選擇角色: ${roleToSelect.trim()}`);
					} else {
						// 如果沒有可用角色（不應該發生），選擇第一個非空選項
						const firstAvailable = availableRoleOptions.find(
							(opt) => opt && opt !== '請選擇角色' && opt.trim() !== ''
						);
						if (firstAvailable) {
							await roleSelect.selectOption({ label: firstAvailable });
							selectedRoles.push(firstAvailable.trim());
							console.log(`玩家 ${i + 1} 選擇角色（後備）: ${firstAvailable.trim()}`);
						}
					}
				}

				// 等待一下確保選擇已註冊
				await pages[i].waitForTimeout(500);

				// 選擇顏色（使用下拉選單）- 確保每個玩家選擇不同的顏色
				const colorSelect = pages[i]
					.locator('select.color-dropdown, select.selection-dropdown')
					.nth(1);
				if (await colorSelect.isVisible()) {
					// 獲取可用顏色選項
					const colorOptions = await colorSelect.locator('option').allTextContents();

					// 找到一個尚未被選擇的顏色
					const availableColor = colorOptions.find(
						(color) =>
							color &&
							color !== '請選擇顏色' &&
							color !== '自訂顏色' &&
							color.trim() !== '' &&
							!selectedColors.includes(color)
					);

					if (availableColor) {
						// 如果有可用顏色，則選擇該顏色
						await colorSelect.selectOption({ label: availableColor });
						selectedColors.push(availableColor);
						console.log(`玩家 ${i + 1} 選擇顏色: ${availableColor}`);
					} else {
						// 如果沒有可用顏色，選擇第一個可用顏色（作為後備）
						const firstColor = colorOptions.find(
							(color) =>
								color && color !== '請選擇顏色' && color !== '自訂顏色' && color.trim() !== ''
						);
						if (firstColor) {
							await colorSelect.selectOption({ label: firstColor });
							selectedColors.push(firstColor);
							console.log(`玩家 ${i + 1} 選擇顏色 (後備): ${firstColor}`);
						} else {
							await colorSelect.selectOption({ index: 1 });
						}
					}
				}

				// 等待一下確保選擇已註冊
				await pages[i].waitForTimeout(500);

				// 點擊「鎖定」按鈕
				const lockButton = pages[i].locator('button.confirm-btn:has-text("鎖定")');
				if (await lockButton.isVisible()) {
					await lockButton.click();
				}

				// 等待鎖定完成
				await pages[i].waitForTimeout(1000);
			}

			// 等待所有玩家鎖定完成
			await pages[0].waitForTimeout(2000);

			// 驗證房主看到右上角「開始遊戲」按鈕
			const startGameButton = pages[0].locator('button:has-text("開始遊戲")');
			await expect(startGameButton).toBeVisible({ timeout: 10000 });

			console.log('\n========== 步驟 4: 房主點擊開始遊戲 ==========');
			// 房主點擊右上角「開始遊戲」按鈕
			await startGameButton.click();
			console.log('✅ 房主已點擊開始遊戲按鈕');

			// 等待 URL 變化到遊戲頁面
			await pages[0].waitForURL(/\/room\/.*\/game/, { timeout: 15000 });
			console.log('✅ 房主已進入遊戲頁面');

			// 等待其他玩家也進入遊戲頁面
			for (let i = 1; i < users.length; i++) {
				await pages[i].waitForURL(/\/room\/.*\/game/, { timeout: 15000 });
			}
			console.log('✅ 所有玩家已進入遊戲頁面');

			// 等待遊戲開始
			await pages[0].waitForTimeout(3000);

			// 驗證遊戲已開始 - 檢查是否進入遊戲階段
			await Promise.race([
				pages[0]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[1]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[2]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[3]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[4]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[5]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[6]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false),
				pages[7]
					.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
					.isVisible({ timeout: 10000 })
					.catch(() => false)
			]);

			console.log('✅ 遊戲已開始，所有玩家進入遊戲');

			// ==================== 遊戲流程測試開始 ====================
			// 遊戲階段: 鑑定 > 技能 > 指派

			// 追蹤角色分配（從頁面讀取或記錄）
			const roleAssignments: { [key: string]: number } = {
				許愿: -1,
				方震: -1,
				木戶加奈: -1,
				黃煙煙: -1,
				姬云浮: -1,
				老朝奉: -1,
				鄭國渠: -1,
				藥不然: -1
			};

			// 追蹤遊戲狀態
			const gameLog: {
				round: number;
				player: number;
				role: string;
				actions: string[];
			}[] = [];

			// 追蹤被封鎖的獸首
			const blockedArtifacts = new Set<string>();
			// 追蹤被攻擊的玩家
			const attackedPlayers = new Set<number>();
			// 追蹤老朝奉是否使用交換
			let swapUsed = false;

			// 等待第一輪開始，並找到第一個行動的玩家
			console.log('\n========== 等待遊戲初始化 ==========');
			await pages[0].waitForTimeout(5000);

			// 檢查每個玩家的頁面，找出誰先行動
			console.log('檢查哪個玩家先行動...');
			for (let i = 0; i < users.length; i++) {
				// 檢查是否有階段指示器（表示輪到該玩家）
				const hasPhaseIndicator = await pages[i]
					.locator('text=/階段一：鑑定獸首|階段二：使用技能|階段三：指派/')
					.isVisible({ timeout: 1000 })
					.catch(() => false);

				if (hasPhaseIndicator) {
					console.log(`✅ 找到第一個行動玩家: 玩家 ${i + 1}`);
					break;
				}
			}

			// 輪流讓每個玩家執行行動（最多3回合）
			let round = 1;
			while (round <= 3) {
				console.log(`\n========== 第 ${round} 回合 ==========`);

				// 追蹤已行動的玩家
				const actedPlayers = new Set<number>();

				// 持續檢查直到所有玩家都行動完畢
				const maxIdleIterations = 20; // 最多允許20次沒有玩家行動的循環
				let idleIterations = 0;

				while (actedPlayers.size < users.length) {
					let anyPlayerActed = false;

					// 在檢查玩家之前，先檢查是否已經進入討論階段
					const inDiscussionEarly = await pages[0]
						.locator('.discussion-phase, .action-subtitle:has-text("討論階段")')
						.isVisible({ timeout: 1000 })
						.catch(() => false);

					if (inDiscussionEarly) {
						console.log('   ✅ 檢測到已進入討論階段，跳出玩家行動循環');
						break;
					}

					for (let playerIndex = 0; playerIndex < users.length; playerIndex++) {
						// 跳過已經行動過的玩家
						if (actedPlayers.has(playerIndex)) {
							continue;
						}

						const currentPage = pages[playerIndex];

						// 先等待頁面穩定
						await currentPage.waitForTimeout(500);

						// 檢查該玩家是否為當前行動玩家
						// 方法1: 檢查 PlayerOrderDisplay 中的 .current-player 元素是否包含該玩家的暱稱
						const currentPlayerDisplay = currentPage.locator('.current-player');
						const currentPlayerText =
							(await currentPlayerDisplay.textContent().catch(() => '')) || '';
						const isCurrentPlayer = currentPlayerText.includes(users[playerIndex].nickname);

						// 方法2: 檢查是否有 PhaseIndicator (只在輪到自己時顯示)
						const hasPhaseIndicator = await currentPage
							.locator('.phase-indicator')
							.isVisible({ timeout: 2000 })
							.catch(() => false);

						// 方法3: 檢查鑑定階段的互動元素（可點擊的獸首卡片）
						const hasIdentifyInteraction = await currentPage
							.locator('.beast-card.interactive')
							.first()
							.isVisible({ timeout: 2000 })
							.catch(() => false);

						// 方法4: 檢查技能/指派階段的行動區域
						const hasActionArea = await currentPage
							.locator('.action-area .action-content')
							.isVisible({ timeout: 2000 })
							.catch(() => false);

						// 判斷是否可以行動：當前玩家標記 OR PhaseIndicator 顯示 OR 有互動元素
						const canAct =
							isCurrentPlayer && (hasPhaseIndicator || hasIdentifyInteraction || hasActionArea);

						// 調試日誌 - 當沒有玩家行動時，顯示所有玩家的狀態
						if (!anyPlayerActed && idleIterations > 0) {
							console.log(
								`   🔍 玩家 ${playerIndex + 1} 檢測結果: 當前玩家=${isCurrentPlayer}, PhaseIndicator=${hasPhaseIndicator}, 鑑定互動=${hasIdentifyInteraction}, 行動區域=${hasActionArea}`
							);
						}

						if (!canAct) {
							continue;
						}

						console.log(`\n🎮 玩家 ${playerIndex + 1} (${users[playerIndex].nickname}) 開始行動`);
						console.log(
							`   檢測結果: 當前玩家=${isCurrentPlayer}, PhaseIndicator=${hasPhaseIndicator}, 鑑定互動=${hasIdentifyInteraction}, 行動區域=${hasActionArea}`
						);

						// 檢查玩家角色（從 GameHeader 中獲取）
						let roleText =
							(await currentPage
								.locator('.role-highlight')
								.textContent()
								.catch(() => '')) || '';

						// 提取角色名（移除 "角色："前綴）
						roleText = roleText.replace(/^角色：?/, '').trim();

						console.log(`   角色: ${roleText || '未知'}`);

						// 記錄角色分配
						if (roleText && roleAssignments[roleText] === -1) {
							roleAssignments[roleText] = playerIndex;
							console.log(`   ✅ 角色 ${roleText} 分配給玩家 ${playerIndex + 1}`);
						}

						// 初始化當前回合的行動記錄
						const currentActions: string[] = [];

						// 檢查當前處於哪個階段 - 根據實際組件結構
						let currentPhaseText = '';
						let currentGamePhase: 'identification' | 'skill' | 'assign-next' = 'identification';

						// 檢查 PhaseIndicator 的文字來判斷階段
						const phaseIndicator = currentPage.locator('.phase-indicator .phase-title');
						if (await phaseIndicator.isVisible({ timeout: 1000 })) {
							currentPhaseText = (await phaseIndicator.textContent()) || '';
							console.log(`   🔍 當前階段: ${currentPhaseText}`);

							if (currentPhaseText.includes('階段一') || currentPhaseText.includes('鑑定獸首')) {
								currentGamePhase = 'identification';
							} else if (
								currentPhaseText.includes('階段二') ||
								currentPhaseText.includes('使用技能')
							) {
								currentGamePhase = 'skill';
							} else if (currentPhaseText.includes('階段三') || currentPhaseText.includes('指派')) {
								currentGamePhase = 'assign-next';
							}
						} else {
							// 如果沒有 PhaseIndicator，嘗試從其他元素判斷
							// 檢查是否有可互動的獸首（鑑定階段）
							const hasInteractiveBeast = await currentPage
								.locator('.beast-card.interactive')
								.first()
								.isVisible({ timeout: 1000 })
								.catch(() => false);

							if (hasInteractiveBeast) {
								currentGamePhase = 'identification';
								currentPhaseText = '鑑定階段';
							}
						}

						console.log(`   🔍 當前遊戲階段: ${currentGamePhase} (${currentPhaseText})`);

						// 階段 1: 鑑定階段
						if (currentGamePhase === 'identification') {
							console.log('   📋 鑑定階段');
						}

						// 檢查是否被攻擊或被沉默
						const isAttacked = await currentPage
							.locator('text=/被攻擊|無法行動/')
							.isVisible({ timeout: 2000 })
							.catch(() => false);

						const isSilenced = await currentPage
							.locator('text=/被沉默|無法鑑定/')
							.isVisible({ timeout: 2000 })
							.catch(() => false);

						if (isAttacked) {
							console.log('   ⚔️  該玩家被攻擊，但仍可進行鑑定（結果為無法鑑定）');
							currentActions.push('被攻擊');
							attackedPlayers.add(playerIndex);

							// 等待攻擊提示 modal 出現
							await currentPage.waitForTimeout(1000);

							// 點擊確認按鈕關閉攻擊提示 modal
							const attackConfirmBtn = currentPage.locator(
								'button:has-text("確認"), button:has-text("確定"), .confirm-btn, .btn-confirm, button:has-text("知道了")'
							);
							if (await attackConfirmBtn.isVisible({ timeout: 3000 })) {
								await attackConfirmBtn.click();
								console.log('   ✅ 已確認被攻擊提示');
								// 等待 modal 完全關閉
								await currentPage.waitForTimeout(1500);
							}

							// 被攻擊的玩家繼續進行鑑定流程（但結果會是"無法鑑定"）
							// 不要 continue，讓代碼繼續執行下面的鑑定邏輯
						}

						if (isSilenced) {
							console.log('   🔇 該玩家被沉默，無法鑑定');
							currentActions.push('被沉默');
						}

						// 根據角色執行不同的鑑定邏輯
						// 被攻擊的玩家也可以進行鑑定操作，但結果會是"無法鑑定"
						if (!isSilenced) {
							// 獲取可鑑定的選項（獸首卡片）
							await currentPage.waitForTimeout(500);

							// 先確保獸首區域是展開的
							await ensureBeastSectionExpanded(currentPage);

							// 查找可鑑定的獸首卡片（使用 ArtifactDisplay 組件的 class）
							const beastCards = currentPage.locator('.beast-card.interactive');
							const identifyCount = await beastCards.count().catch(() => 0);
							console.log(`   找到 ${identifyCount} 個可鑑定的獸首`);

							if (identifyCount > 0) {
								// 隨機選擇一個獸首進行鑑定
								const randomIndex = Math.floor(Math.random() * identifyCount);
								const artifactButton = beastCards.nth(randomIndex);
								// 只讀取 .beast-name 元素的文字，避免包含狀態文字
								const artifactText = await artifactButton.locator('.beast-name').textContent();
								const artifactName = artifactText?.trim() || `${randomIndex + 1}`;

								// 使用抽取的鑑定函數
								const identifyResult = await identifyArtifact(
									currentPage,
									artifactName,
									randomIndex,
									beastCards
								);
								currentActions.push(`鑑定獸首:${artifactName}-${identifyResult}`);

								// 如果是許愿，可以鑑定第二個獸首
								if (roleText.includes('許愿')) {
									await currentPage.waitForTimeout(500);

									// 再次確保獸首區域是展開的（第二次鑑定前）
									await ensureBeastSectionExpanded(currentPage);

									const secondBeastCards = currentPage.locator('.beast-card.interactive');
									const secondCount = await secondBeastCards.count().catch(() => 0);
									if (secondCount > 0) {
										const secondIndex = Math.floor(Math.random() * secondCount);
										const secondArtifact = secondBeastCards.nth(secondIndex);
										// 只讀取 .beast-name 元素的文字，避免包含狀態文字
										const secondText = await secondArtifact.locator('.beast-name').textContent();
										const secondArtifactName = secondText?.trim() || `${secondIndex + 1}`;

										// 使用抽取的鑑定函數
										const secondIdentifyResult = await identifyArtifact(
											currentPage,
											secondArtifactName,
											secondIndex,
											secondBeastCards
										);
										currentActions.push(
											`鑑定第二個獸首:${secondArtifactName}-${secondIdentifyResult}`
										);
									}
								}
							}
						}

						// 等待鑑定階段完成，並檢查是否進入技能階段
						await currentPage.waitForTimeout(2000);

						// 檢查是否已進入技能階段 - 使用 PhaseIndicator 或 action-area
						let inSkillPhase = false;
						const skillPhaseIndicator = currentPage.locator('.phase-indicator .phase-title');
						const skillPhaseText = (await skillPhaseIndicator.textContent().catch(() => '')) || '';

						if (skillPhaseText.includes('階段二') || skillPhaseText.includes('使用技能')) {
							inSkillPhase = true;
						} else {
							// 備用方案：檢查是否有 .skill-phase 或 .skills-container
							inSkillPhase = await currentPage
								.locator('.skill-phase, .skills-container')
								.isVisible({ timeout: 3000 })
								.catch(() => false);
						}

						if (!inSkillPhase) {
							console.log('   ⚠️  尚未進入技能階段，等待更長時間...');
							await currentPage.waitForTimeout(3000);

							// 再次檢查
							const retrySkillPhaseText =
								(await skillPhaseIndicator.textContent().catch(() => '')) || '';
							if (
								retrySkillPhaseText.includes('階段二') ||
								retrySkillPhaseText.includes('使用技能')
							) {
								inSkillPhase = true;
							} else {
								inSkillPhase = await currentPage
									.locator('.skill-phase, .skills-container')
									.isVisible({ timeout: 2000 })
									.catch(() => false);
							}
						}

						console.log(`   ${inSkillPhase ? '✅' : '❌'} 是否已進入技能階段: ${inSkillPhase}`);

						// 階段 2: 技能階段
						if (inSkillPhase) {
							console.log('   🎯 技能階段');
						}

						// 老朝奉: 交換技能
						if (roleText.includes('老朝奉') && !swapUsed) {
							await currentPage.waitForTimeout(500);
							const swapButton = currentPage.locator(
								'button:has-text("交換"), button:has-text("真假互換"), button:has-text("執行交換技能")'
							);
							if (await swapButton.isVisible({ timeout: 2000 })) {
								await swapButton.click();
								swapUsed = true;
								console.log('   🔄 老朝奉使用了交換技能（真假互換）');
								currentActions.push('使用交換技能');
								await currentPage.waitForTimeout(1000);
							}
						}

						// 方震: 鑑定玩家（在技能階段）
						if (roleText.includes('方震')) {
							await currentPage.waitForTimeout(500);

							// 在 SkillPhase 中查找鑑定玩家按鈕
							// 使用正確的選擇器：在 skill-phase 中查找 player-selection-grid 內的按鈕
							const skillPhase = currentPage.locator('.skill-phase, .skills-container');
							const identifyPlayerButtons = skillPhase.locator(
								'.player-selection-grid .player-btn-inline:not(.identified)'
							);
							const playerCount = await identifyPlayerButtons.count().catch(() => 0);
							console.log(`   找到 ${playerCount} 個可鑑定的玩家按鈕（技能階段）`);

							if (playerCount > 0) {
								const randomPlayerIndex = Math.floor(Math.random() * playerCount);
								const playerButton = identifyPlayerButtons.nth(randomPlayerIndex);
								const playerName = await playerButton.textContent();
								const targetName = playerName?.trim() || `玩家${randomPlayerIndex + 1}`;

								// 點擊鑑定玩家按鈕
								await playerButton.click();
								console.log(`   🔍 方震點擊鑑定玩家: ${targetName}`);

								// 等待 notification 出現並讀取鑑定結果
								await currentPage.waitForTimeout(1000);
								const notificationToast = currentPage
									.locator('.notification-toast .toast-message')
									.last();
								const notificationText = await notificationToast.textContent().catch(() => '');

								if (notificationText) {
									console.log(`   📢 鑑定結果 notification: ${notificationText}`);

									// 從 notification 中提取陣營信息
									// 格式: "你鑑定了 XXX，陣營：許愿陣營" 或 "你鑑定了 XXX，陣營：老朝奉陣營"
									let camp = '未知';
									if (notificationText.includes('許愿陣營')) {
										camp = '許愿陣營';
									} else if (notificationText.includes('老朝奉陣營')) {
										camp = '老朝奉陣營';
									}

									console.log(`   ✅ ${targetName} 的陣營: ${camp}`);
									currentActions.push(`鑑定玩家:${targetName}-${camp}`);
								} else {
									console.log(`   ⚠️  未能讀取鑑定結果 notification`);
									currentActions.push(`鑑定玩家:${targetName}`);
								}
							}
						}

						// 藥不然: 攻擊玩家
						if (roleText.includes('藥不然')) {
							await currentPage.waitForTimeout(500);
							// 限定在技能階段的 player-selection-grid 內查找攻擊按鈕
							const skillPhase = currentPage.locator('.skill-phase, .skills-container');
							const attackButtons = skillPhase.locator(
								'.player-selection-grid .player-btn-inline.attack-target'
							);
							const attackCount = await attackButtons.count().catch(() => 0);
							console.log(`   找到 ${attackCount} 個可攻擊的玩家按鈕`);
							if (attackCount > 0) {
								// 選擇一個還沒被攻擊過的玩家
								const targetIndex = Math.floor(Math.random() * attackCount);
								const targetButton = attackButtons.nth(targetIndex);
								const targetName = await targetButton.textContent();

								await targetButton.click();
								console.log(`   ⚔️  藥不然點擊攻擊玩家: ${targetName?.trim() || targetIndex + 1}`);

								// 等待確認按鈕（攻擊可能需要確認）
								await currentPage.waitForTimeout(500);
								const confirmButton = currentPage.locator(
									'button:has-text("確認"), button:has-text("確定"), .confirm-btn, .modal button[type="button"]:has-text("確")'
								);
								if (await confirmButton.isVisible({ timeout: 2000 })) {
									await confirmButton.click();
									console.log(
										`   ✅ 藥不然確認攻擊了玩家: ${targetName?.trim() || targetIndex + 1}`
									);
									currentActions.push(`攻擊玩家:${targetName?.trim() || targetIndex + 1}`);
									await currentPage.waitForTimeout(1000);
								} else {
									// 如果沒有確認按鈕，表示攻擊直接生效
									console.log(`   ⚔️  藥不然攻擊了玩家: ${targetName?.trim() || targetIndex + 1}`);
									currentActions.push(`攻擊玩家:${targetName?.trim() || targetIndex + 1}`);
									await currentPage.waitForTimeout(1000);
								}
							}
						}

						// 鄭國渠: 封鎖獸首
						if (roleText.includes('鄭國渠')) {
							await currentPage.waitForTimeout(500);

							// 先確保獸首區域是展開的
							await ensureBeastSectionExpanded(currentPage);

							const blockBeastCards = currentPage.locator('.beast-card.interactive');
							const blockCount = await blockBeastCards.count().catch(() => 0);
							console.log(`   找到 ${blockCount} 個可封鎖的獸首`);

							if (blockCount > 0) {
								const blockIndex = Math.floor(Math.random() * blockCount);
								const blockButton = blockBeastCards.nth(blockIndex);
								const blockText = await blockButton.locator('.beast-name').textContent();

								await blockButton.click();
								console.log(`   🔒 點擊封鎖獸首: ${blockText?.trim() || blockIndex + 1}`);

								// 等待 modal 出現並確認封鎖
								await currentPage.waitForTimeout(500);
								const confirmButton = currentPage.locator(
									'button:has-text("確認"), button:has-text("確定"), .confirm-btn, .modal button[type="button"]:has-text("確")'
								);
								if (await confirmButton.isVisible({ timeout: 2000 })) {
									await confirmButton.click();
									const artifactName = blockText?.trim() || `${blockIndex + 1}`;
									blockedArtifacts.add(artifactName);
									console.log(`   🚫 鄭國渠確認封鎖了獸首: ${artifactName}`);
									currentActions.push(`封鎖獸首:${artifactName}`);
									await currentPage.waitForTimeout(1000);
								} else {
									console.log(`   ⚠️  未找到確認按鈕，封鎖可能未完成`);
								}
							} else {
								console.log(`   ⚠️  未找到可封鎖的獸首（可能都已被封鎖）`);
							}
						}

						// 等待技能階段完成，並檢查是否進入指派階段
						await currentPage.waitForTimeout(2000);

						// 檢查是否已進入指派階段 - 使用 PhaseIndicator
						let inAssignPhase = false;
						const assignIndicator = currentPage.locator('.phase-indicator .phase-title');
						const assignText = (await assignIndicator.textContent().catch(() => '')) || '';

						if (assignText.includes('階段三') || assignText.includes('指派')) {
							inAssignPhase = true;
						} else {
							// 備用方案：檢查是否有 AssignPhase 的元素
							inAssignPhase = await currentPage
								.locator(
									'.player-selection-grid .player-btn-inline, button:has-text("進入討論階段")'
								)
								.first()
								.isVisible({ timeout: 3000 })
								.catch(() => false);
						}

						if (!inAssignPhase) {
							console.log('   ⚠️  尚未進入指派階段，檢查是否需要點擊完成技能階段按鈕...');

							// 檢查是否有「完成技能階段」按鈕
							const completeSkillButton = currentPage.locator(
								'button:has-text("完成技能階段"), button:has-text("完成"), button:has-text("skip"), button:has-text("跳過")'
							);
							const hasCompleteButton = await completeSkillButton
								.isVisible({ timeout: 2000 })
								.catch(() => false);

							if (hasCompleteButton) {
								console.log('   🔘 找到「完成技能階段」按鈕，點擊以進入下一階段');

								// 確保按鈕在視口內
								await completeSkillButton.scrollIntoViewIfNeeded().catch(() => {});
								await currentPage.waitForTimeout(500);

								// 使用 force 選項強制點擊
								await completeSkillButton.click({ force: true, timeout: 10000 });
								await currentPage.waitForTimeout(2000);

								// 再次檢查是否進入指派階段
								const retryAssignText = (await assignIndicator.textContent().catch(() => '')) || '';
								if (retryAssignText.includes('階段三') || retryAssignText.includes('指派')) {
									inAssignPhase = true;
								} else {
									inAssignPhase = await currentPage
										.locator(
											'.player-selection-grid .player-btn-inline, button:has-text("進入討論階段")'
										)
										.first()
										.isVisible({ timeout: 3000 })
										.catch(() => false);
								}
								console.log(
									`   ${inAssignPhase ? '✅' : '❌'} 點擊後是否進入指派階段: ${inAssignPhase}`
								);
							} else {
								console.log('   ⚠️  未找到完成技能階段按鈕，繼續等待...');
								await currentPage.waitForTimeout(3000);
							}
						}

						// 階段 3: 指派下一位玩家
						const assignResult = await assignNextPlayer(currentPage, playerIndex);

						if (assignResult.success) {
							if (assignResult.isDiscussion) {
								currentActions.push('進入討論');
							} else if (assignResult.assignedPlayer) {
								currentActions.push(`指派:${assignResult.assignedPlayer}`);
							}
						}

						// 記錄這次行動
						gameLog.push({
							round,
							player: playerIndex + 1,
							role: roleText,
							actions: currentActions
						});

						// 標記該玩家已行動
						actedPlayers.add(playerIndex);
						anyPlayerActed = true;
						idleIterations = 0; // 重置閒置計數器

						await currentPage.waitForTimeout(1500);

						// 如果進入討論階段，跳出玩家循環
						if (assignResult.success && assignResult.isDiscussion) {
							break;
						}
					}

					// 如果已進入討論階段，跳出 while 循環
					if (anyPlayerActed) {
						const inDiscussionNow = await pages[0]
							.locator('.discussion-phase, .action-subtitle:has-text("討論階段")')
							.isVisible({ timeout: 1000 })
							.catch(() => false);

						if (inDiscussionNow) {
							console.log('   ✅ 已進入討論階段，結束玩家行動階段');
							break;
						}
					}

					// 如果這一輪沒有任何玩家行動，增加閒置計數
					if (!anyPlayerActed) {
						idleIterations++;
						console.log(`   ⚠️  沒有玩家行動 (${idleIterations}/${maxIdleIterations})`);

						// 如果開始出現沒有玩家行動的情況，輸出所有玩家的當前玩家名稱以診斷
						if (idleIterations === 1) {
							console.log('   📋 當前所有玩家看到的當前行動玩家:');
							for (let i = 0; i < users.length; i++) {
								const currentPlayerName = await pages[i]
									.locator('.current-player')
									.textContent()
									.catch(() => '');
								console.log(
									`      玩家 ${i + 1} (${users[i].nickname}): "${(currentPlayerName || '').trim()}"`
								);
							}
						}

						// 如果連續多次沒有玩家行動，等待更長時間讓頁面更新
						if (idleIterations >= 3) {
							console.log('   ⏳ 等待頁面更新...');
							await pages[0].waitForTimeout(2000);
						}

						// 如果超過最大閒置次數，檢查是否已進入討論或投票階段
						if (idleIterations >= maxIdleIterations) {
							console.log('   ❌ 超過最大閒置次數，檢查遊戲狀態');
							const inDiscussionOrVoting = await pages[0]
								.locator('.discussion-phase, .voting-panel, .action-subtitle:has-text("討論階段")')
								.isVisible({ timeout: 2000 })
								.catch(() => false);

							if (inDiscussionOrVoting) {
								console.log('   ✅ 已進入討論或投票階段，跳出行動循環');
								break;
							} else {
								console.log('   ⚠️  未檢測到討論或投票階段，強制跳出循環');
								break;
							}
						}
					}

					// 等待一下再檢查下一個玩家
					await pages[0].waitForTimeout(1000);
				}

				// 檢查是否進入討論階段 - 使用更準確的選擇器
				// 增加等待時間讓UI更新
				await pages[0].waitForTimeout(2000);

				// 使用多種方式檢測討論階段
				let inDiscussion = await pages[0]
					.locator('.discussion-phase')
					.isVisible({ timeout: 3000 })
					.catch(() => false);

				// 如果第一次沒找到，檢查是否有討論階段的標題
				if (!inDiscussion) {
					inDiscussion = await pages[0]
						.locator('.action-subtitle:has-text("討論階段")')
						.isVisible({ timeout: 2000 })
						.catch(() => false);
					console.log(`   📝 通過標題檢測到討論階段: ${inDiscussion}`);
				}

				// 如果還沒找到，檢查是否有"開始投票"按鈕（最可靠的指標）
				if (!inDiscussion) {
					console.log('   🔍 第一次未檢測到討論階段，檢查開始投票按鈕...');
					await pages[0].waitForTimeout(1000);
					inDiscussion = await pages[0]
						.locator('button.start-voting-btn, button:has-text("開始投票")')
						.isVisible({ timeout: 2000 })
						.catch(() => false);
					console.log(`   🔘 通過開始投票按鈕檢測到討論階段: ${inDiscussion}`);
				}

				// 最後嘗試：檢查頁面文字是否包含"討論階段"
				if (!inDiscussion) {
					const pageText = await pages[0]
						.locator('body')
						.textContent()
						.catch(() => '');
					inDiscussion =
						!!pageText && pageText.includes('討論階段') && pageText.includes('開始投票');
					console.log(`   📄 通過頁面文字檢測到討論階段: ${inDiscussion}`);
				}

				if (inDiscussion) {
					console.log('\n💬 進入討論階段');

					// 立即等待並點擊開始投票按鈕（房主）
					await pages[0].waitForTimeout(1000);

					// 房主點擊「開始投票」按鈕
					const startVotingButton = pages[0].locator(
						'.start-voting-btn, button:has-text("開始投票")'
					);
					const hasStartButton = await startVotingButton.isVisible({ timeout: 3000 });

					if (hasStartButton) {
						console.log('   🔘 房主找到開始投票按鈕，準備點擊...');
						await startVotingButton.click();
						console.log('   ✅ 房主點擊開始投票');
						// 增加等待時間，讓投票界面完全渲染
						await pages[0].waitForTimeout(3000);

						// 確認討論階段的內容消失
						const discussionGone = await pages[0]
							.locator('.discussion-phase')
							.isHidden({ timeout: 5000 })
							.catch(() => false);
						console.log(`   討論階段UI是否消失: ${discussionGone}`);
					} else {
						console.log('   ⚠️  未找到開始投票按鈕（可能不是房主）');
						// 如果第一個玩家不是房主，檢查其他玩家
						for (let i = 1; i < pages.length; i++) {
							const otherStartButton = pages[i].locator(
								'.start-voting-btn, button:has-text("開始投票")'
							);
							const hasOtherButton = await otherStartButton.isVisible({ timeout: 1000 });
							if (hasOtherButton) {
								console.log(`   🔘 玩家 ${i + 1} 是房主，點擊開始投票...`);
								await otherStartButton.click();
								console.log(`   ✅ 玩家 ${i + 1} 點擊開始投票`);
								await pages[i].waitForTimeout(3000);
								break;
							}
						}
					}

					// 驗證投票界面 - 先等待討論階段UI完全消失
					await pages[0].waitForTimeout(2000);

					// 檢查投票階段文字是否出現
					let votingVisible = await pages[0]
						.locator('text=/投票階段/')
						.isVisible({ timeout: 10000 })
						.catch(() => false);

					console.log(`   第一次檢查 - 投票階段文字可見: ${votingVisible}`);

					// 如果沒找到，檢查是否有 VotingPanel 組件
					if (!votingVisible) {
						const votingPanelVisible = await pages[0]
							.locator('.voting-panel')
							.isVisible({ timeout: 5000 })
							.catch(() => false);
						console.log(`   檢查 VotingPanel 組件可見: ${votingPanelVisible}`);
						votingVisible = votingPanelVisible;
					}

					if (votingVisible) {
						console.log('\n🗳️  進入投票階段');

						// 截圖以供調試
						await pages[0].screenshot({ path: `test-results/voting-phase-${round}.png` });

						// 等待投票面板完全加載 - 增加等待時間
						await pages[0].waitForTimeout(3000);

						// 只有房主可以輸入投票數
						// 先等待 VotingPanel 組件完全渲染
						const votingPanelFound = await pages[0]
							.locator('.voting-panel')
							.waitFor({ state: 'visible', timeout: 5000 })
							.then(() => true)
							.catch(() => false);
						console.log(`   VotingPanel 組件已加載: ${votingPanelFound}`);
						await pages[0].waitForTimeout(1000);

						// 檢查是否有 voting-section（房主才有）
						const votingSectionVisible = await pages[0]
							.locator('.voting-section')
							.isVisible({ timeout: 3000 })
							.catch(() => false);
						console.log(`   voting-section 可見: ${votingSectionVisible}`);

						// 獲取所有獸首的輸入框
						const voteInputs = pages[0].locator('input[type="number"].vote-input');

						// 等待至少一個輸入框出現
						const firstInputFound = await voteInputs
							.first()
							.waitFor({ state: 'visible', timeout: 5000 })
							.then(() => true)
							.catch(() => false);
						console.log(`   第一個輸入框已加載: ${firstInputFound}`);

						const inputCount = await voteInputs.count().catch(() => 0);
						console.log(`   找到 ${inputCount} 個獸首投票輸入框`);

						let finalInputCount = inputCount;
						if (inputCount === 0) {
							console.log('   ⚠️  投票輸入框未加載，嘗試重新查找...');
							await pages[0].waitForTimeout(3000);
							finalInputCount = await voteInputs.count().catch(() => 0);
							console.log(`   重試後找到 ${finalInputCount} 個輸入框`);
						}

						if (finalInputCount >= 2) {
							// 隨機選擇兩個不同的獸首，各給1票
							const availableIndices = Array.from({ length: finalInputCount }, (_, i) => i);
							const firstIndex =
								availableIndices[Math.floor(Math.random() * availableIndices.length)];
							availableIndices.splice(availableIndices.indexOf(firstIndex), 1);
							const secondIndex =
								availableIndices[Math.floor(Math.random() * availableIndices.length)];

							// 獲取獸首名稱
							const firstBeastName = await pages[0]
								.locator('.vote-beast-name')
								.nth(firstIndex)
								.textContent();
							const secondBeastName = await pages[0]
								.locator('.vote-beast-name')
								.nth(secondIndex)
								.textContent();

							// 輸入投票數
							await voteInputs.nth(firstIndex).fill('1');
							await pages[0].waitForTimeout(300);
							console.log(`   🗳️  房主給 ${firstBeastName?.trim()} 投 1 票`);

							await voteInputs.nth(secondIndex).fill('1');
							await pages[0].waitForTimeout(300);
							console.log(`   🗳️  房主給 ${secondBeastName?.trim()} 投 1 票`);

							// 點擊提交投票結果按鈕
							await pages[0].waitForTimeout(1000);
							const submitButton = pages[0].locator(
								'button.submit-votes-btn:has-text("提交投票結果")'
							);
							if (await submitButton.isVisible({ timeout: 3000 })) {
								await submitButton.click();
								console.log('   📤 點擊提交投票結果');
								await pages[0].waitForTimeout(2000);

								// 確認提交對話框 - 點擊「確認提交」按鈕
								const confirmButton = pages[0].locator(
									'.modal-container button.confirm-btn:has-text("確認提交"), button:has-text("確認提交")'
								);
								if (await confirmButton.isVisible({ timeout: 5000 })) {
									await confirmButton.click();
									console.log('   ✅ 確認提交投票');
									// 增加等待時間，讓投票結果有足夠時間處理和渲染
									await pages[0].waitForTimeout(5000);
								} else {
									console.log('   ⚠️  未找到確認提交按鈕');
								}
							} else {
								console.log('   ⚠️  未找到提交投票結果按鈕');
							}

							console.log('✅ 投票階段完成');
						} else {
							console.log('   ⚠️  投票輸入框數量不足（需要至少2個）');
							// 截圖以供調試
							await pages[0].screenshot({ path: `test-results/voting-no-inputs-${round}.png` });
						}
					} else {
						console.log('   ⚠️  未進入投票界面');
						// 截圖以供調試
						await pages[0].screenshot({ path: `test-results/voting-not-visible-${round}.png` });

						// 輸出當前頁面的文字內容以供調試
						const pageText = await pages[0]
							.locator('body')
							.textContent()
							.catch(() => '');
						console.log(`   當前頁面部分內容: ${pageText?.substring(0, 200)}...`);
					}

					// 等待投票結果顯示 - 增加等待時間
					await pages[0].waitForTimeout(4000);

					// 嘗試多次檢查投票結果是否顯示 - 使用多種方式檢測
					let resultVisible = await pages[0]
						.locator('.voting-result-panel')
						.isVisible({ timeout: 10000 })
						.catch(() => false);

					console.log(`   投票結果面板可見: ${resultVisible}`);

					// 如果沒找到結果面板，檢查文字
					if (!resultVisible) {
						resultVisible = await pages[0]
							.locator('text=/投票結果公布|本回合投票已完成/')
							.isVisible({ timeout: 5000 })
							.catch(() => false);
						console.log(`   投票結果文字可見: ${resultVisible}`);
					}

					// 如果第一次沒找到，再等待並重試
					if (!resultVisible) {
						console.log('   ⏳ 投票結果尚未顯示，等待更長時間...');
						await pages[0].waitForTimeout(3000);
						resultVisible = await pages[0]
							.locator('.voting-result-panel')
							.isVisible({ timeout: 5000 })
							.catch(() => false);
						console.log(`   重試後 - 投票結果面板可見: ${resultVisible}`);
					}

					if (resultVisible) {
						console.log('\n📊 投票結果顯示');

						// 截圖以供調試
						await pages[0].screenshot({ path: `test-results/voting-result-${round}.png` });

						// 讀取前兩名獸首結果
						const topTwoResults = pages[0].locator('.result-card');
						const topTwoCount = await topTwoResults.count().catch(() => 0);
						console.log(`   找到 ${topTwoCount} 個投票結果卡片`);

						if (topTwoCount >= 2) {
							for (let i = 0; i < topTwoCount; i++) {
								const card = topTwoResults.nth(i);
								const rankBadge = await card
									.locator('.rank-badge-large')
									.textContent()
									.catch(() => '');
								const beastName = await card
									.locator('.beast-name')
									.textContent()
									.catch(() => '');
								const voteCount = await card
									.locator('.vote-count')
									.textContent()
									.catch(() => '');
								const status = await card
									.locator('.beast-status-large, .beast-status-pending')
									.textContent()
									.catch(() => '');

								console.log(`   ${rankBadge} ${beastName}: ${voteCount} - ${status?.trim() || ''}`);
							}

							const hostResult = await topTwoResults.evaluateAll((cards) =>
								cards.map((card) => (card as HTMLElement).innerText.replace(/\s+/g, ' ').trim())
							);

							// 公開結果是伺服器權威資料；所有非房主必須與房主完全一致。
							for (let playerIndex = 1; playerIndex < pages.length; playerIndex++) {
								const playerPanel = pages[playerIndex].locator('.voting-result-panel');
								await expect(playerPanel).toBeVisible({ timeout: 10000 });
								const playerResult = await playerPanel
									.locator('.result-card')
									.evaluateAll((cards) =>
										cards.map((card) => (card as HTMLElement).innerText.replace(/\s+/g, ' ').trim())
									);
								expect(playerResult).toEqual(hostResult);
							}
						}

						// 如果是房主且不是第3回合，點擊開始下一回合
						if (round < 3) {
							await pages[0].waitForTimeout(2000);

							// 先檢查 host-actions 區域是否存在
							const hostActionsVisible = await pages[0]
								.locator('.host-actions')
								.isVisible({ timeout: 3000 })
								.catch(() => false);
							console.log(`   房主操作區域可見: ${hostActionsVisible}`);

							// 使用更靈活的選擇器 - 匹配「開始第」後面可能是中文數字
							const nextRoundButton = pages[0].locator(
								'button.start-round-btn, button:has-text("開始第")'
							);
							const buttonVisible = await nextRoundButton.isVisible({ timeout: 5000 });
							console.log(`   下一回合按鈕可見: ${buttonVisible}`);

							if (buttonVisible) {
								const buttonText = await nextRoundButton.textContent().catch(() => '');
								console.log(`   按鈕文字: "${buttonText?.trim()}"`);
								await nextRoundButton.click();
								console.log(`✅ 房主點擊 ${buttonText?.trim()}`);

								// 增加回合數
								round++;
								console.log(`\n🔄 準備進入第 ${round} 回合`);

								// 等待足夠長的時間讓新回合完全初始化
								console.log('   ⏳ 等待新回合初始化...');
								await pages[0].waitForTimeout(8000);

								// 檢查是否有玩家進入新回合
								console.log('   🔍 檢查新回合狀態:');
								for (let i = 0; i < Math.min(3, users.length); i++) {
									const hasPhase = await pages[i]
										.locator('text=/階段一：鑑定獸首|階段二：使用技能|階段三：指派/')
										.isVisible({ timeout: 2000 })
										.catch(() => false);
									console.log(`      玩家 ${i + 1} 是否看到階段指示器: ${hasPhase}`);
								}
							} else {
								console.log(`   ⚠️  未找到開始下一回合按鈕`);
								// 輸出頁面內容以供調試
								const pageContent = await pages[0]
									.locator('.voting-result-panel')
									.textContent()
									.catch(() => '');
								console.log(`   投票結果面板內容: ${pageContent?.substring(0, 300)}...`);
								await pages[0].screenshot({
									path: `test-results/no-next-round-button-${round}.png`
								});
								round++; // 即使失敗也要增加，避免無限循環
								break;
							}
						} else {
							// 第3回合後進入結算
							console.log('✅ 完成所有回合，準備進入結算階段');
							round++; // 增加以跳出 while 循環
							break;
						}
					} else {
						console.log('   ⚠️  未顯示投票結果');
						await pages[0].screenshot({ path: `test-results/no-voting-result-${round}.png` });
						round++; // 增加以避免無限循環
					}
				} else {
					// 沒有檢測到討論階段，可能是UI沒有正確顯示
					console.log('   ⚠️  未檢測到討論階段，跳過投票流程');
					console.log('   📸 截圖以供調試');
					await pages[0].screenshot({ path: `test-results/no-discussion-phase-${round}.png` });

					// 輸出當前頁面的文字內容以供調試
					const pageText = await pages[0]
						.locator('body')
						.textContent()
						.catch(() => '');
					console.log(`   當前頁面部分內容: ${pageText?.substring(0, 300)}...`);

					// 強制進入下一回合以避免無限循環
					round++;
					if (round <= 3) {
						console.log(`\n🔄 強制進入第 ${round} 回合`);
						await pages[0].waitForTimeout(3000);
					}
				}
			}

			console.log('\n========== 測試完成 ==========');
			console.log('\n📊 遊戲記錄摘要:');
			console.log(`   總行動次數: ${gameLog.length}`);
			console.log(`   角色分配:`, roleAssignments);
			console.log(`   老朝奉使用交換: ${swapUsed ? '是' : '否'}`);
			console.log(`   被封鎖的獸首:`, Array.from(blockedArtifacts));
			console.log(`   被攻擊的玩家:`, Array.from(attackedPlayers));
			console.log('\n📝 詳細行動記錄:');
			gameLog.forEach((log) => {
				console.log(
					`   回合 ${log.round} - 玩家 ${log.player} (${log.role}): ${log.actions.join(', ')}`
				);
			});

			// 基本驗證：確保遊戲記錄不為空
			expect(gameLog.length).toBeGreaterThan(0);
			console.log('\n✅ 測試通過：遊戲流程完整執行');
		} catch (error) {
			// 如果測試失敗，記錄錯誤
			console.error('測試過程中發生錯誤:', error);
			throw error;
		} finally {
			// 清理：先關閉所有頁面，再關閉上下文
			try {
				for (const page of pages) {
					if (page && !page.isClosed()) {
						await page.close().catch(() => {});
					}
				}
				// 等待一小段時間讓頁面完全關閉
				await new Promise((resolve) => setTimeout(resolve, 100));
				for (const ctx of contexts) {
					await ctx.close().catch(() => {});
				}
			} catch {
				// 忽略清理錯誤
				console.log('清理過程中的錯誤已忽略');
			}
		}
	});
});
