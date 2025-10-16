<script lang="ts">
	import AuthForm from '$lib/components/auth/AuthForm.svelte';
</script>

<AuthForm mode="login" apiEndpoint="/api/auth/login" successRedirectUrl="/" />
