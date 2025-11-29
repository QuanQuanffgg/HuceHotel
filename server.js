// server.js – PHIÊN BẢN CUỐI CÙNG: LƯU DỮ LIỆU VĨNH VIỄN VÀO FILE db.json

const express = require('express');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// === KẾT NỐI VÀ TẢI DỮ LIỆU TỪ FILE db.json ===
const adapter = new FileSync('db.json');
const db = low(adapter);

// Khởi tạo nếu chưa có
db.defaults({ users: [], bookings: [], news: [] }).write();

// Lấy dữ liệu
let users = db.get('users');
let bookings = db.get('bookings');
let news = db.get('news');

// === 30 PHÒNG (giữ nguyên) ===
const rooms = [
  ...Array.from({length: 10}, (_, i) => ({ id: 101 + i, type: "Phòng Đơn", price: 800000, image: "hotel1.jpg", description: `Phòng đơn sang trọng ${101+i}` })),
  ...Array.from({length: 10}, (_, i) => ({ id: 201 + i, type: "Phòng Đôi", price: 1200000, image: "hotel2.jpg", description: `Phòng đôi rộng rãi ${201+i}` })),
  ...Array.from({length: 10}, (_, i) => ({ id: 301 + i, type: "Phòng VIP Suite", price: 2800000, image: "hotel3.jpg", description: `Suite VIP ${301+i}` }))
];

// === AUTH ===
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password).value();
  if (!user) return res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email).value()) return res.status(400).json({ success: false, message: "Email đã tồn tại!" });
  const newUser = { id: Date.now(), name, email, password, role: "user" };
  users.push(newUser).write();
  res.json({ success: true, message: "Đăng ký thành công!" });
});

// === API PHÒNG ===
app.get('/api/rooms', (req, res) => {
  let result = rooms;
  const q = req.query.q?.toLowerCase();
  if (q) {
    result = rooms.filter(r =>
      r.id.toString().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, data: result });
});

// === KIỂM TRA TRÙNG PHÒNG ===
function isRoomBooked(roomId, checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  return bookings.some(b => {
    if (b.roomId != roomId) return false;
    const eStart = new Date(b.checkin);
    const eEnd = new Date(b.checkout);
    return start <= eEnd && end >= eStart;
  }).value();
}

app.post('/api/bookings/check', (req, res) => {
  const { roomId, checkin, checkout } = req.body;
  if (isRoomBooked(roomId, checkin, checkout)) {
    const conflict = bookings.find(b => b.roomId == roomId &&
      new Date(checkin) <= new Date(b.checkout) &&
      new Date(checkout) >= new Date(b.checkin)).value();
    res.json({ available: false, conflict: { from: conflict.checkin, to: conflict.checkout, customer: conflict.userName } });
  } else {
    res.json({ available: true });
  }
});

// === ĐẶT PHÒNG ===
app.post('/api/bookings', (req, res) => {
  const { user, roomId, checkin, checkout, customerName, customerPhone } = req.body;

  const room = rooms.find(r => r.id == roomId);
  if (!room) return res.status(404).json({ success: false, message: "Phòng không tồn tại!" });

  if (isRoomBooked(roomId, checkin, checkout)) {
    const conflict = bookings.find(b => b.roomId == roomId &&
      new Date(checkin) <= new Date(b.checkout) &&
      new Date(checkout) >= new Date(b.checkin)).value();
    return res.status(409).json({
      success: false,
      message: "Phòng đã có khách đặt!",
      conflict: { from: conflict.checkin, to: conflict.checkout, customer: conflict.userName }
    });
  }

  const days = Math.ceil((new Date(checkout) - new Date(checkin)) / (1000*60*60*24)) || 1;
  const totalPrice = room.price * days;

  const newBooking = {
    id: Date.now(),
    userId: user?.id || null,
    userName: customerName || user?.name || "Khách",
    userEmail: user?.email || "Không có",
    phone: customerPhone || "Không có",
    roomId: room.id,
    roomType: room.type,
    checkin, checkout, days, totalPrice,
    status: "pending",
    createdAt: new Date().toLocaleDateString('vi-VN')
  };

  bookings.push(newBooking).write();
  res.json({ success: true, message: "Đặt phòng thành công!", data: newBooking });
});

// === ADMIN API ===
app.get('/api/admin/bookings', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });
  res.json({ success: true, data: bookings.value() });
});

app.get('/api/admin/news', (req, res) => res.json({ success: true, data: news.value() }));

app.post('/api/admin/news', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });

  const { title, content, image } = req.body;
  const n = {
    id: Date.now(),
    title, content,
    image: image || "images/news-default.jpg",
    date: new Date().toLocaleDateString('vi-VN')
  };
  news.unshift(n).write();
  res.json({ success: true, data: n });
});

app.delete('/api/admin/news/:id', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });
  news.remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.put('/api/admin/news/:id', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });
  const id = parseInt(req.params.id);
  news.find({ id }).assign(req.body).write();
  res.json({ success: true });
});

// CHẤP NHẬN / TỪ CHỐI ĐƠN
app.put('/api/admin/bookings/:id/approve', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });
  bookings.find({ id: parseInt(req.params.id) }).assign({ status: "approved" }).write();
  res.json({ success: true });
});

app.delete('/api/admin/bookings/:id', (req, res) => {
  const authUser = JSON.parse(req.headers.user || '{}');
  if (authUser.role !== 'admin') return res.status(403).json({ success: false });
  bookings.remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`HUCE HOTEL đang chạy tại http://localhost:${port}`);
  console.log(`→ Đưa lên GitHub thoải mái – dữ liệu vẫn lưu vĩnh viễn trong db.json`);
});