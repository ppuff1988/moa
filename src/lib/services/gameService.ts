// Game API service for all game-related API calls
import { getJWTToken } from '$lib/utils/jwt';
import { goto } from '$app/navigation';
import { addNotification } from '$lib/stores/notifications';
import type { BeastHead, SkillActions, PerformedAction } from '$lib/types/game';

export class GameService {
	private roomName: string;

	constructor(roomName: string) {
		this.roomName = roomName;
	}

	private getHeaders() {
		const token = getJWTToken();
		return {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
	}

	private async handleResponse(response: Response) {
		if (!response.ok) {
			try {
				const clone = response.clone();
				const data = await clone.json();

				if (response.status === 403 && data.message === '您不在此房間中') {
					addNotification('您不在此房間中', 'error');
					await goto('/', { replaceState: true, invalidateAll: true });
				} else if (response.status === 404 && data.message === '房間不存在') {
					addNotification('房間不存在', 'error');
					await goto('/', { replaceState: true, invalidateAll: true });
				} else if (response.status === 401) {
					addNotification('認證失敗，請重新登入', 'error');
					await goto('/auth/login', { replaceState: true, invalidateAll: true });
				}
			} catch {
				// 如果解析 JSON 失敗，忽略
			}
		}
		return response;
	}

	async fetchArtifacts(): Promise<BeastHead[]> {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/artifacts`, {
			headers: { Authorization: `Bearer ${getJWTToken()}` }
		});

		await this.handleResponse(response);

		if (response.ok) {
			const data = await response.json();
			return data.artifacts || [];
		}
		return [];
	}

	async fetchMyRole(): Promise<{
		roleName: string | null;
		skillActions: SkillActions | null;
		performedActions: PerformedAction[];
	}> {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/my-role`, {
			headers: { Authorization: `Bearer ${getJWTToken()}` }
		});

		await this.handleResponse(response);

		if (response.ok) {
			const data = await response.json();
			return {
				roleName: data.hasRole && data.roleName ? data.roleName : null,
				skillActions: data.skillActions || null,
				performedActions: data.performedActions || []
			};
		}
		return { roleName: null, skillActions: null, performedActions: [] };
	}

	async updatePlayersAndRound() {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/players`, {
			headers: { Authorization: `Bearer ${getJWTToken()}` }
		});

		await this.handleResponse(response);

		if (response.ok) {
			return await response.json();
		}
		return null;
	}

	async fetchRoundStatus() {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/round-status`, {
			headers: { Authorization: `Bearer ${getJWTToken()}` }
		});

		await this.handleResponse(response);

		if (response.ok) {
			return await response.json();
		}
		return null;
	}

	async identifyArtifact(artifactName: string) {
		const response = await fetch(
			`/api/room/${encodeURIComponent(this.roomName)}/identify-artifact`,
			{
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify({ artifactName })
			}
		);

		await this.handleResponse(response);

		const data = await response.json();
		return { ok: response.ok, data };
	}

	async identifyPlayer(targetPlayerId: number) {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/identify-player`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ targetPlayerId })
		});

		await this.handleResponse(response);

		const data = await response.json();
		return { ok: response.ok, data };
	}

	async blockArtifact(artifactId: number) {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/block-artifact`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ artifactId })
		});

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async attackPlayer(targetPlayerId: number) {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/attack-player`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ targetPlayerId })
		});

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async swapArtifacts() {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/swap-artifacts`, {
			method: 'POST',
			headers: this.getHeaders()
		});

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async assignNextPlayer(nextPlayerId: number) {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/next-player`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ nextPlayerId })
		});

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async startDiscussion() {
		const response = await fetch(
			`/api/room/${encodeURIComponent(this.roomName)}/start-discussion`,
			{
				method: 'POST',
				headers: this.getHeaders()
			}
		);

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async startVoting() {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/start-voting`, {
			method: 'POST',
			headers: this.getHeaders()
		});

		await this.handleResponse(response);

		const data = response.ok ? await response.json() : await response.json();
		return { ok: response.ok, data };
	}

	async fetchFinalResult() {
		const response = await fetch(`/api/room/${encodeURIComponent(this.roomName)}/final-result`, {
			headers: { Authorization: `Bearer ${getJWTToken()}` }
		});

		await this.handleResponse(response);

		if (response.ok) {
			return await response.json();
		}
		return null;
	}
}
