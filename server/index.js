import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from './db.js';
import adminRouter from './admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// ---- multer 配置 ----
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持 jpg/png/gif/webp/bmp 格式'));
        }
    },
});

// ---- 认证中间件：验证 userId 是否为有效注册用户 ----
async function requireUser(req, res, next) {
    const userId = req.body.userId || req.query.userId;
    if (!userId || userId === 0) {
        return res.status(401).json({ error: '未登录用户不能执行此操作' });
    }
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id FROM users WHERE id = ?');
        stmt.bind([Number(userId)]);
        if (!stmt.step()) {
            stmt.free();
            return res.status(403).json({ error: '用户不存在或已失效' });
        }
        stmt.free();
        next();
    } catch (err) {
        console.error('认证失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

// ---- middleware ----
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api/admin', adminRouter);

// ---- 图片上传 ----
app.post('/api/upload', requireUser, upload.array('images', 9), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '未选择文件' });
    }
    const files = req.files.map((f) => ({
        filename: f.filename,
        url: `/uploads/${f.filename}`,
    }));
    res.json({ success: true, files });
});

app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '文件大小不能超过 10MB' });
        if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: '最多上传 9 张图片' });
        return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
});

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
        if (username.length < 2) return res.status(400).json({ error: '用户名至少 2 个字符' });
        if (password.length < 4) return res.status(400).json({ error: '密码至少 4 个字符' });

        const db = await getDb();
        const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
        stmt.bind([username]);
        if (stmt.step()) { stmt.free(); return res.status(409).json({ error: '该用户名已被使用' }); }
        stmt.free();

        const salt = bcrypt.genSaltSync(10);
        const hashed = bcrypt.hashSync(password, salt);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
        saveDb();

        const stmt2 = db.prepare('SELECT id FROM users WHERE username = ?');
        stmt2.bind([username]);
        stmt2.step();
        const newId = stmt2.getAsObject().id;
        stmt2.free();

        res.json({ success: true, user: { id: newId, username } });
    } catch (err) {
        console.error('注册失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

        const db = await getDb();
        const stmt = db.prepare('SELECT id, username, password FROM users WHERE username = ?');
        stmt.bind([username]);

        if (!stmt.step()) { stmt.free(); return res.status(401).json({ error: '用户名或密码错误' }); }

        const row = stmt.getAsObject();
        stmt.free();

        const valid = bcrypt.compareSync(password, row.password);
        if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

        res.json({ success: true, user: { id: row.id, username: row.username } });
    } catch (err) {
        console.error('登录失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.get('/api/recipes', async (req, res) => {
    try {
        const { userId } = req.query;
        const db = await getDb();

        let stmt;
        if (userId) {
            stmt = db.prepare(
                'SELECT r.id, r.user_id, u.username, r.name, r.category, r.ingredients, r.steps, r.notes, r.images, r.created_at FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC'
            );
            stmt.bind([Number(userId)]);
        } else {
            stmt = db.prepare(
                'SELECT r.id, r.user_id, u.username, r.name, r.category, r.ingredients, r.steps, r.notes, r.images, r.created_at FROM recipes r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC'
            );
            stmt.bind();
        }

        const recipes = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            recipes.push({
                id: row.id,
                createdBy: row.username || '(游客)',
                name: row.name,
                category: row.category,
                ingredients: row.ingredients,
                steps: row.steps,
                notes: row.notes,
                images: safeParseJson(row.images, []),
                createdAt: row.created_at,
            });
        }
        stmt.free();

        res.json({ success: true, recipes });
    } catch (err) {
        console.error('查询菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.get('/api/recipes/:id', async (req, res) => {
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT r.id, r.user_id, u.username, r.name, r.category, r.ingredients, r.steps, r.notes, r.images, r.created_at FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?');
        stmt.bind([req.params.id]);
        if (!stmt.step()) {
            stmt.free();
            return res.status(404).json({ error: '菜谱不存在' });
        }
        const row = stmt.getAsObject();
        stmt.free();
        res.json({
            success: true,
            recipe: {
                id: row.id,
                createdBy: row.username || '(游客)',
                name: row.name,
                category: row.category,
                ingredients: row.ingredients,
                steps: row.steps,
                notes: row.notes,
                images: safeParseJson(row.images, []),
                createdAt: row.created_at,
            },
        });
    } catch (err) {
        console.error('查询菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.post('/api/recipes', requireUser, async (req, res) => {
    try {
        const { userId, id, name, category, ingredients, steps, notes, images } = req.body;
        if (!userId || !id || !name) return res.status(400).json({ error: '缺少必填字段' });

        const db = await getDb();
        db.run(
            'INSERT INTO recipes (id, user_id, name, category, ingredients, steps, notes, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, Number(userId), name, category || 'other', ingredients || '', steps || '', notes || '', JSON.stringify(images || [])]
        );
        saveDb();

        res.json({ success: true });
    } catch (err) {
        console.error('添加菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.put('/api/recipes/:id', requireUser, async (req, res) => {
    try {
        const { userId, name, category, ingredients, steps, notes, images } = req.body;
        if (!userId) return res.status(400).json({ error: '缺少用户信息' });
        const db = await getDb();
        const result = db.run(
            'UPDATE recipes SET name = ?, category = ?, ingredients = ?, steps = ?, notes = ?, images = ? WHERE id = ?',
            [name, category, ingredients, steps, notes, JSON.stringify(images || []), req.params.id]
        );

        if (result.changes === 0) return res.status(404).json({ error: '菜谱不存在' });
        saveDb();
        res.json({ success: true });
    } catch (err) {
        console.error('更新菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.delete('/api/recipes/:id', requireUser, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: '缺少用户信息' });
        const db = await getDb();
        const stmt = db.prepare('SELECT images FROM recipes WHERE id = ?');
        stmt.bind([req.params.id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            const images = safeParseJson(row.images, []);
            for (const img of images) {
                const filePath = path.join(UPLOAD_DIR, img.filename);
                try { fs.unlinkSync(filePath); } catch { /* ignore */ }
            }
        }
        stmt.free();

        const result = db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '菜谱不存在' });
        saveDb();
        res.json({ success: true });
    } catch (err) {
        console.error('删除菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.delete('/api/upload/:filename', requireUser, async (req, res) => {
    try {
        const filePath = path.join(UPLOAD_DIR, req.params.filename);
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '删除失败' });
    }
});

function safeParseJson(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
}

app.listen(PORT, () => {
    console.log(`🏝️  Recipe API server running at http://localhost:${PORT}`);
});
