<script>
    import { users } from "./store";

    let userName, password, loading;
    let loginResponse = {
        error: null,
        success: null,
        profile: null,
    };

    const handleSubmit = (e) => {
        let loginFields = { userName, password };
        loading = true;
        loginResponse = {
            error: null,
            success: null,
            profile: null,
        };

        const apiURL = `http://localhost:8080/api/user/login/${userName}`;

        fetch(apiURL, {
            method: "POST",
            //mode: "no-cors",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginFields),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.ErrorCode) {
                    if (data.ErrorCode == 404) {
                        loginResponse = {
                            ...loginResponse,
                            error: data.Message,
                        };
                    } else if (data.ErrorCode == 500) {
                        loginResponse = {
                            ...loginResponse,
                            error: data.Errors[0].ErrorMessage,
                        };
                    } else {
                        loginResponse = {
                            ...loginResponse,
                            error: data.Description,
                        };
                    }
                } else {
                    console.log(data);
                    loginResponse = {
                        ...loginResponse,
                        success: true,
                        userName: data.userName,
                        email: data.email,
                        profile: data.Profile,
                    };
                    users.set(loginResponse);
                    localStorage.setItem(
                        "users",
                        JSON.stringify(loginResponse)
                    );
                }
            })
            .catch((error) => console.log(error))
            .finally(() => (loading = false));
    };

    const navigateToSignup = () => {};
</script>

<form on:submit|preventDefault={handleSubmit}>
    <label for="userName">Username</label>
    <input id="userName" type="text" bind:value={userName} />
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} />

    <button type="submit">Sign in</button>
</form>

{#if loginResponse.error}
    <p class="error">Error ❌ {loginResponse.error}</p>
{/if}
{#if loginResponse.success}
    <p class="success">Success ✔</p>
    <p>{loginResponse.userName}</p>
    <p>{loginResponse.email}</p>
{/if}
<p>
    Don't have an account?
    <strong class="link" on:click={navigateToSignup}>Sign up</strong>
</p>
