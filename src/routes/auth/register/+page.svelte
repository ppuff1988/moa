<script lang="ts">
	import AuthForm from '$lib/components/auth/AuthForm.svelte';
</script>

<AuthForm mode="register" apiEndpoint="/api/auth/register" successRedirectUrl="/" />
