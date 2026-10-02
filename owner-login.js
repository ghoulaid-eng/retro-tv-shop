const form = document.getElementById('ownerLoginForm');
const message = document.getElementById('ownerLoginMessage');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Checking the owner signal...';
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: document.getElementById('ownerUsername').value.trim(),
        password: document.getElementById('ownerPassword').value
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      message.textContent = data?.error || 'The owner portal could not sign you in.';
      return;
    }
    window.location.assign('/admin.html');
  } catch {
    message.textContent = 'The owner portal could not be reached. Please try again.';
  }
});
