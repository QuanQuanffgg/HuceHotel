// public/js/main.js – ĐÃ SỬA HOÀN CHỈNH (copy-paste nguyên file này là chạy ngon 100%)

let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let selectedRoom = null;

// ==================== DỮ LIỆU 30 PHÒNG (có mô tả riêng) ====================
const rooms = [
  ...Array.from({length: 10}, (_, i) => ({
    id: 101 + i,
    type: "Phòng Đơn",
    price: 800000,
    image: "hotel1.jpg",
    description: `Phòng đơn hiện đại ${101+i}, view thành phố, đầy đủ tiện nghi.`
  })),
  ...Array.from({length: 10}, (_, i) => ({
    id: 201 + i,
    type: "Phòng Đôi",
    price: 1200000,
    image: "hotel2.jpg",
    description: `Phòng đôi sang trọng ${201+i}, giường king size, ban công riêng.`
  })),
  ...Array.from({length: 10}, (_, i) => ({
    id: 301 + i,
    type: "Phòng VIP Suite",
    price: 2800000,
    image: "hotel3.jpg",
    description: `Suite VIP ${301+i} – 80m², bồn jacuzzi, dịch vụ butler 24/7.`
  }))
];

// ==================== KHI LOAD TRANG ====================
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadNews();
  displayRooms(rooms);   // hiện tất cả phòng
  startSlider();         // chạy slider
});

// ==================== CẬP NHẬT GIAO DIỆN ĐĂNG NHẬP ====================
function updateAuthUI() {
  if (currentUser) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.name || 'Khách';
    if (currentUser.role === 'admin') {
      document.getElementById('adminLink').style.display = 'inline-block';
    }
  }
}

function logout() {
  localStorage.removeItem('user');
  location.reload();
}

// ==================== TÌM KIẾM PHÒNG ====================
function searchRooms() {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = rooms.filter(room =>
    room.id.toString().includes(keyword) ||
    room.type.toLowerCase().includes(keyword) ||
    room.description.toLowerCase().includes(keyword)
  );
  displayRooms(filtered);
}

// ==================== HIỂN THỊ DANH SÁCH PHÒNG ====================
function displayRooms(roomArray) {
  const html = roomArray.map(room => `
    <div class="room-card">
      <img src="images/${room.image}" alt="${room.type}">
      <h3>Phòng ${room.id} - ${room.type}</h3>
      <p>${room.description}</p>
      <div class="price">${room.price.toLocaleString()}đ / đêm</div>
      <button onclick="bookRoom(${room.id})">
        ${currentUser ? 'Đặt ngay' : 'Đăng nhập để đặt'}
      </button>
    </div>
  `).join('');

  document.getElementById('roomList').innerHTML = html || 
    '<p style="grid-column:1/-1;text-align:center;color:#666;">Không tìm thấy phòng phù hợp!</p>';
}

// ==================== MODAL ĐẶT PHÒNG ====================
function bookRoom(roomId) {
  if (!currentUser) {
    alert("Vui lòng đăng nhập để đặt phòng!");
    location.href = '/login.html';
    return;
  }

  selectedRoom = rooms.find(r => r.id === roomId);
  if (!selectedRoom) return;

  // Đổ dữ liệu vào modal
  document.getElementById('modalImage').src = `images/${selectedRoom.image}`;
  document.getElementById('modalTitle').textContent = `Phòng ${selectedRoom.id} - ${selectedRoom.type}`;
  document.getElementById('modalDesc').textContent = selectedRoom.description;
  document.getElementById('modalPrice').textContent = selectedRoom.price.toLocaleString() + 'đ / đêm';

  // Điền sẵn tên
  document.getElementById('customerName').value = currentUser.name || '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('checkinDate').value = '';
  document.getElementById('checkoutDate').value = '';

  // Hiện modal
  document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('bookingModal').style.display = 'none';
}

async function confirmBooking() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const checkin = document.getElementById('checkinDate').value;
  const checkout = document.getElementById('checkoutDate').value;

  if (!name || !phone || !checkin || !checkout) {
    alert("Vui lòng điền đầy đủ thông tin!");
    return;
  }

  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: currentUser,
      roomId: selectedRoom.id,
      checkin, checkout,
      customerName: name,
      customerPhone: phone
    })
  });

  const data = await res.json();

  if (data.success) {
    closeModal();
    showToast("Đặt phòng thành công! Chúng tôi sẽ liên hệ ngay.");
  } else if (res.status === 409) {
    // HIỆN CẢNH BÁO TRÙNG NGAY TRONG MODAL
    const warning = document.createElement('div');
    warning.style.cssText = 'background:#ffebee;color:#c62828;padding:15px;border-radius:10px;margin:15px 0;border-left:5px solid #e74c3c;font-weight:bold;';
    warning.innerHTML = `
      Phòng đã có khách đặt từ <strong>${data.conflict.from}</strong> đến <strong>${data.conflict.to}</strong><br>
      Khách hàng: <strong>${data.conflict.customer}</strong><br><br>
      Vui lòng chọn ngày khác!
    `;
    document.querySelector('.booking-form').insertBefore(warning, document.querySelector('.form-actions'));
  } else {
    alert("Lỗi: " + data.message);
  }
}
function showToast(message) {
  const toast = document.getElementById('successToast');
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// Đóng modal khi click ngoài
window.onclick = function(e) {
  const modal = document.getElementById('bookingModal');
  if (e.target === modal) closeModal();
};

// ==================== SLIDER TỰ ĐỘNG ====================
function startSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  let index = 0;

  function show(n) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    index = (n + slides.length) % slides.length;
    slides[index].classList.add('active');
    dots[index].classList.add('active');
  }

  setInterval(() => show(index + 1), 4500);
  window.currentSlide = (n) => show(n);
  show(0);
}

// TIN TỨC Ở TRANG CHỦ: MỚI NHẤT LÊN ĐẦU + CÓ ẢNH MINH HỌA ĐẸP
function loadNews() {
  fetch('/api/admin/news')
    .then(r => r.json())
    .then(res => {
      if (!res.success || !res.data || res.data.length === 0) {
        document.getElementById('newsList').innerHTML = 
          '<p style="text-align:center;color:#666;font-size:18px;padding:50px;">Chưa có tin tức nào.</p>';
        return;
      }

      // Sắp xếp: tin mới nhất lên đầu
      const sortedNews = res.data
        .slice()
        .sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateB - dateA;
        });

      // Hiển thị với ảnh minh họa siêu đẹp
      document.getElementById('newsList').innerHTML = sortedNews.map(n => `
        <div style="background:white;padding:35px;margin:30px 0;border-radius:20px;
                    box-shadow:0 15px 40px rgba(0,0,0,0.12);overflow:hidden;
                    border-left:6px solid #1a4971;transition:0.3s;">
          <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start;">
            <!-- Ảnh minh họa -->
            <div style="flex:1;min-width:280px;">
              <img src="${n.image || 'images/news-default.jpg'}" 
                   alt="${n.title}"
                   style="width:100%;height:260px;object-fit:cover;border-radius:15px;
                          box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            </div>
            <!-- Nội dung -->
            <div style="flex:2;min-width:300px;">
              <h3 style="color:#1a4971;font-size:28px;margin:0 0 15px 0;line-height:1.3;">
                ${n.title}
              </h3>
              <p style="color:#444;line-height:1.8;font-size:17px;margin-bottom:15px;">
                ${n.content}
              </p>
              <small style="color:#e67e22;font-weight:bold;">
                Đăng ngày: ${n.date}
              </small>
            </div>
          </div>
        </div>
      `).join('');
    })
    .catch(err => {
      console.error("Lỗi tải tin tức:", err);
      document.getElementById('newsList').innerHTML = 
        '<p style="text-align:center;color:#e74c3c;">Không thể tải tin tức. Vui lòng thử lại sau!</p>';
    });
}