const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'FE')));
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rolling1234',
  database: process.env.DB_NAME || 'rolling_paper',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Wait for database connection with retry logic
async function waitForDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('Database connected successfully');
      conn.release();
      return true;
    } catch (err) {
      console.log(`DB connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error('Failed to connect to database after all retries');
  process.exit(1);
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'FE', 'index.html'));
});

// Serve teacher page
app.get('/teacherSYJ', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'FE', 'teacher.html'));
});

// Validate student code
app.post('/api/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, remaining: 0 });
    }

    // Check if code exists
    const [students] = await pool.query(
      'SELECT id FROM students WHERE code = ?',
      [code]
    );

    if (students.length === 0) {
      return res.json({ valid: false, remaining: 0 });
    }

    // Count existing messages by this student
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM messages WHERE student_code = ?',
      [code]
    );

    const messageCount = rows[0].cnt;
    const remaining = 3 - messageCount;

    return res.json({ valid: true, remaining });
  } catch (err) {
    console.error('Validate error:', err);
    return res.status(500).json({ valid: false, remaining: 0 });
  }
});

// Post a new message
app.post('/api/messages', upload.single('image'), async (req, res) => {
  try {
    const { name, message, code } = req.body;

    // Validate required fields
    if (!code) {
      return res.status(400).json({ success: false, error: 'Student code is required' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (message.length > 400) {
      return res.status(400).json({ success: false, error: 'Message must be 400 characters or less' });
    }

    // Check if code exists
    const [students] = await pool.query(
      'SELECT id FROM students WHERE code = ?',
      [code]
    );

    if (students.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid student code' });
    }

    // Check remaining messages
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM messages WHERE student_code = ?',
      [code]
    );

    const remaining = 3 - rows[0].cnt;
    if (remaining <= 0) {
      return res.status(400).json({ success: false, error: 'Maximum messages reached (3)' });
    }

    // Handle image
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert message
    const [result] = await pool.query(
      'INSERT INTO messages (student_code, name, message, image_url) VALUES (?, ?, ?, ?)',
      [code, name.trim(), message, imageUrl]
    );

    // Fetch the inserted row
    const [inserted] = await pool.query(
      'SELECT id, name, message, image_url, created_at FROM messages WHERE id = ?',
      [result.insertId]
    );

    return res.json({ success: true, data: inserted[0] });
  } catch (err) {
    console.error('Post message error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const [messages] = await pool.query(
      'SELECT id, name, message, image_url, created_at FROM messages ORDER BY created_at DESC'
    );

    return res.json({ success: true, data: messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Multer error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size must be under 5MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

// Start server
async function start() {
  await waitForDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
