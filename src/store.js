import { writable } from "svelte/store";

export const users = writable(
    localStorage.users ? JSON.parse(localStorage.getItem("users")) : null
)