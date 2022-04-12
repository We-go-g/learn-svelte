<script>
    import { users } from "./stores";

    let _user;

    users.subscribe((data) => (_user = data));
    const logout = () => {
        users.set(null);
        localStorage.clear();
    };
</script>

{#if users && _user}
    <h3>Welcome {_user?.profile?.FullName}</h3>
    <button on:click={logout}>Logout</button>
{/if}
