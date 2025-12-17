// Hanya untuk show/hide password, tanpa memblokir login Flask
document.addEventListener('DOMContentLoaded', () => {
    const passwordToggle = document.getElementById("passwordToggle");
    const passwordField = document.getElementById("password");

    passwordToggle.addEventListener("click", () => {
        passwordField.type = passwordField.type === "password" ? "text" : "password";
    });
});
