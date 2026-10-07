const form = document.getElementById("signupForm");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  const submitBtn = form.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    // Use relative URL — always hits the correct server (local or Render)
    const response = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.text();

    if (result === "Signup Successful") {
      alert("Account created! Please log in.");
      window.location.href = "/login";
    } else {
      alert(result || "Signup failed. Please try again.");
    }

  } catch (error) {
    console.error("Signup error:", error);
    alert("Could not reach the server. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
