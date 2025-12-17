// Toggle show/hide password
const toggleBtn = document.getElementById("passwordToggle");
const passwordInput = document.getElementById("password");

toggleBtn.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleBtn.innerHTML = `<i class="fas fa-eye-slash"></i>`;
    } else {
        passwordInput.type = "password";
        toggleBtn.innerHTML = `<i class="fas fa-eye"></i>`;
    }
});
