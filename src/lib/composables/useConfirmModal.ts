export interface ConfirmModalOptions {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void | Promise<void>;
	onCancel?: () => void;
}

// 此文件保留用於未來擴展通用確認 modal 功能
// 目前直接在組件中使用 ConfirmModal 組件即可
