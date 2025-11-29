// public/js/auth.js
function getFormData() {
  return {
    name: document.getElementById('name')?.value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };
}

async function login() {
  const { email, password } = getFormData();
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('user', JSON.stringify(data.user));
    alert("Đăng nhập thành công!");
    location.href = '/';
  } else {
    document.getElementById('msg').textContent = data.message;
  }
}

async function register() {
  const { name, email, password } = getFormData();
  if (!name || !email || !password) return showMsg("Vui lòng điền đầy đủ!", "red");

  const res = await fetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  showMsg(data.success ? "Đăng ký thành công! Đang chuyển..." : data.message, data.success ? "green" : "red");
  if (data.success) setTimeout(() => location.href = '/login.html', 1500);
}

function showMsg(text, color) {
  const msg = document.getElementById('msg');
  msg.textContent = text;
  msg.style.color = color;
}