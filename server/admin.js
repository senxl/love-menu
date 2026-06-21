import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');

const router = express.Router();

// ---- 管理员验证 ----
const ADMIN_PASSWORD = 'admin888'; // 管理员密码，可自行修改

// 管理员登录
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: '请输入管理员密码' });
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: '密码错误' });
    // 返回一个简单 token（实际用密码比对就够了）
    res.json({ success: true, token: 'admin-token' });
});

// ---- 认证中间件 ----
function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (token !== 'admin-token') {
        return res.status(401).json({ error: '未授权，请先登录管理后台' });
    }
    next();
}

// ============================================
// 用户管理
// ============================================

// 获取所有用户
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id, username, created_at FROM users ORDER BY id ASC');
        stmt.bind();
        const users = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            users.push({
                id: row.id,
                username: row.username,
                createdAt: row.created_at,
            });
        }
        stmt.free();
        res.json({ success: true, users });
    } catch (err) {
        console.error('查询用户失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除用户（连带菜谱）
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const db = await getDb();

        // 先删除该用户的所有菜谱图片
        const recipeStmt = db.prepare('SELECT images FROM recipes WHERE user_id = ?');
        recipeStmt.bind([Number(req.params.id)]);
        while (recipeStmt.step()) {
            const row = recipeStmt.getAsObject();
            const images = safeParseJson(row.images, []);
            for (const img of images) {
                const filePath = path.join(UPLOAD_DIR, img.filename);
                try { fs.unlinkSync(filePath); } catch { /* ignore */ }
            }
        }
        recipeStmt.free();

        // 删除菜谱
        db.run('DELETE FROM recipes WHERE user_id = ?', [Number(req.params.id)]);
        // 删除用户
        const result = db.run('DELETE FROM users WHERE id = ?', [Number(req.params.id)]);

        if (result.changes === 0) return res.status(404).json({ error: '用户不存在' });
        saveDb();
        res.json({ success: true });
    } catch (err) {
        console.error('删除用户失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 修改用户密码
router.put('/users/:id/password', requireAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 4) return res.status(400).json({ error: '密码至少 4 个字符' });

        const db = await getDb();
        const salt = bcrypt.genSaltSync(10);
        const hashed = bcrypt.hashSync(password, salt);
        const result = db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, Number(req.params.id)]);
        if (result.changes === 0) return res.status(404).json({ error: '用户不存在' });
        saveDb();
        res.json({ success: true, message: '密码已更新' });
    } catch (err) {
        console.error('修改密码失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 创建用户
router.post('/users', requireAdmin, async (req, res) => {
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

        res.json({ success: true, message: `用户「${username}」创建成功` });
    } catch (err) {
        console.error('创建用户失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ============================================
// 菜谱管理
// ============================================

// 获取所有菜谱（含用户名）
router.get('/recipes', requireAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const stmt = db.prepare(`
            SELECT r.id, r.user_id, u.username, r.name, r.category,
                   r.ingredients, r.steps, r.notes, r.images, r.created_at
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        stmt.bind();
        const recipes = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            recipes.push({
                id: row.id,
                userId: row.user_id,
                username: row.username || '(已删除用户)',
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

// 创建菜谱（为任意用户添加）
router.post('/recipes', requireAdmin, async (req, res) => {
    try {
        const { userId, name, category, ingredients, steps, notes } = req.body;
        if (!userId || !name) return res.status(400).json({ error: '缺少必填字段' });

        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const db = await getDb();

        // 验证用户存在
        const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
        userStmt.bind([Number(userId)]);
        if (!userStmt.step()) { userStmt.free(); return res.status(404).json({ error: '用户不存在' }); }
        userStmt.free();

        db.run(
            'INSERT INTO recipes (id, user_id, name, category, ingredients, steps, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, Number(userId), name, category || 'other', ingredients || '', steps || '', notes || '']
        );
        saveDb();
        res.json({ success: true, message: `菜谱「${name}」创建成功`, recipe: { id } });
    } catch (err) {
        console.error('添加菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 编辑菜谱
router.put('/recipes/:id', requireAdmin, async (req, res) => {
    try {
        const { name, category, ingredients, steps, notes } = req.body;
        const db = await getDb();
        const result = db.run(
            'UPDATE recipes SET name = ?, category = ?, ingredients = ?, steps = ?, notes = ? WHERE id = ?',
            [name, category, ingredients, steps, notes, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: '菜谱不存在' });
        saveDb();
        res.json({ success: true, message: `菜谱已更新` });
    } catch (err) {
        console.error('更新菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除菜谱
router.delete('/recipes/:id', requireAdmin, async (req, res) => {
    try {
        const db = await getDb();

        // 清理图片文件
        const imgStmt = db.prepare('SELECT images FROM recipes WHERE id = ?');
        imgStmt.bind([req.params.id]);
        if (imgStmt.step()) {
            const row = imgStmt.getAsObject();
            const images = safeParseJson(row.images, []);
            for (const img of images) {
                const filePath = path.join(UPLOAD_DIR, img.filename);
                try { fs.unlinkSync(filePath); } catch { /* ignore */ }
            }
        }
        imgStmt.free();

        const result = db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '菜谱不存在' });
        saveDb();
        res.json({ success: true });
    } catch (err) {
        console.error('删除菜谱失败:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

function safeParseJson(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
}

export default router;
