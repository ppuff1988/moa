<script lang="ts">
	export let text: string;
</script>

<div class="footer-decoration">
	<div class="footer-line left"></div>
	<div class="footer-content">
		<div class="footer-icon">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
		</div>
		<span class="footer-text">{text}</span>
		<div class="footer-icon">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
		</div>
	</div>
	<div class="footer-line right"></div>
</div>

<style>
	.footer-decoration {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 700px;
		padding: 2rem 1rem;
		margin-top: 2rem;
	}

	.footer-line {
		flex: 1;
		height: 2px;
		position: relative;
		overflow: hidden;
	}

	.footer-line::before {
		content: '';
		position: absolute;
		top: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(to right, transparent, rgba(212, 175, 55, 0.6), transparent);
		animation: shimmer 3s ease-in-out infinite;
	}

	.footer-line.left::before {
		animation-delay: 0s;
	}

	.footer-line.right::before {
		animation-delay: 1.5s;
	}

	@keyframes shimmer {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	.footer-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.08));
		border: 1px solid rgba(212, 175, 55, 0.3);
		border-radius: calc(var(--radius) * 2);
		backdrop-filter: blur(10px);
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.footer-icon {
		color: rgba(212, 175, 55, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: pulse-icon 2s ease-in-out infinite;
	}

	@keyframes pulse-icon {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.footer-text {
		color: hsl(var(--foreground));
		font-style: italic;
		font-size: 1rem;
		white-space: nowrap;
		font-weight: 600;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.02em;
	}

	@media (max-width: 768px) {
		.footer-decoration {
			gap: 1rem;
			padding: 1.5rem 0.5rem;
			margin-top: 1.5rem;
		}

		.footer-content {
			padding: 0.625rem 1.25rem;
		}

		.footer-text {
			font-size: 0.9rem;
		}

		.footer-icon svg {
			width: 16px;
			height: 16px;
		}
	}

	@media (max-width: 480px) {
		.footer-line {
			display: none;
		}

		.footer-decoration {
			gap: 0;
		}
	}
</style>
