<script>
	//import { onMount } from "svelte";
	import Login from "./Login.svelte";
	import Signup from "./screens/Signup.svelte";

	//let data = [];
	//let users = [];

	//const apiURL = "http://localhost:8080/api/register/allusers";

	// onMount(async function () {
	// 	const response = await fetch(apiURL);
	// 	data = await response.json();
	// });

	// onMount(async () => {
	// 	await fetch(apiURL)
	// 		.then((response) => response.json())
	// 		.then((data) => {
	// 			users = data;
	// 		})
	// 		.catch((error) => console.log(error));
	// });
</script>

<main>
	<Signup />
	<!-- <Login /> -->

	<!-- {#each data as item}
		<p>{item.userName}</p>
		<p>{item.email}</p>
		<p>{item.password}</p>
	{/each}
	{#each users as usr}
		<p>{usr.userName}</p>
	{/each} -->
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	/* h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  } */

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
