import React, { useState, useEffect, useCallback } from 'react';
import { Button, Icon } from 'animal-island-ui';

const ADMIN_TOKEN_KEY = 'recipe-admin-token';
const API_BASE = '/api/admin';

/* ========== API 封装 ========== */
async function adminApi(url: string, options?: RequestInit) {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const res = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token || '',
        },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
}

/* ========== 类型 ========== */
interface AdminUser {
    id: number;
    username: string;
    createdAt: string;
}
interface AdminRecipe {
    id: string;
    userId: number;
    username: string;
    name: string;
    category: string;
    ingredients: string;
    steps: string;
    notes: string;
    images: { filename: string; url: string }[];
    createdAt: string;
}

interface AdminPageProps {
    onBack: () => void;
}

/* ========== 主组件 ========== */
const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
    const [loggedIn, setLoggedIn] = useState(() => !!sessionStorage.getItem(ADMIN_TOKEN_KEY));
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleLogin = async () => {
        setLoginError('');
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
            setLoggedIn(true);
            setPassword('');
        } catch (err: any) {
            setLoginError(err.message);
        }
    };

    if (!loggedIn) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 400, background: '#16213e', borderRadius: 16, padding: 40, border: '1px solid #0f3460' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                        <h2 style={{ color: '#e74c3c', marginBottom: 8, fontSize: 22 }}>管理后台</h2>
                        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>请输入管理员密码</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                            placeholder="管理员密码"
                            autoFocus
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: 10,
                                border: '2px solid #333', fontSize: 16, outline: 'none',
                                boxSizing: 'border-box', marginBottom: 12,
                                background: '#0d1b2a', color: '#fff',
                            }}
                        />
                        {loginError && <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
                        <button type="button" onClick={handleLogin} style={{
                            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                            background: '#e74c3c', color: '#fff', fontSize: 16, fontWeight: 700,
                            cursor: 'pointer', marginBottom: 12,
                        }}>
                            进入管理后台
                        </button>
                        <a href="/" style={{ color: '#555', fontSize: 13, textDecoration: 'none' }}>← 返回首页</a>
                    </div>
                </div>
            </div>
        );
    }

    return <AdminDashboard onBack={onBack} />;
};

/* ========== 仪表盘 ========== */
const AdminDashboard: React.FC<AdminPageProps> = ({ onBack }) => {
    const [tab, setTab] = useState<'users' | 'recipes'>('recipes');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: 'success' as 'success' | 'error' });

    const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
    };

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi('/users');
            setUsers(data.users);
        } catch (err: any) { showMsg('加载用户失败: ' + err.message, 'error'); }
        finally { setLoading(false); }
    }, []);

    const loadRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi('/recipes');
            setRecipes(data.recipes);
        } catch (err: any) { showMsg('加载菜谱失败: ' + err.message, 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'users') loadUsers();
        else loadRecipes();
    }, [tab, loadUsers, loadRecipes]);

    // ---- 用户 CRUD ----
    const handleDeleteUser = async (id: number, username: string) => {
        if (!window.confirm(`确定删除用户「${username}」及其所有菜谱吗？`)) return;
        try {
            await adminApi(`/users/${id}`, { method: 'DELETE' });
            showMsg(`已删除用户「${username}」`);
            loadUsers();
        } catch (err: any) { showMsg('删除失败: ' + err.message, 'error'); }
    };

    // ---- 菜谱 CRUD ----
    const handleDeleteRecipe = async (id: string, name: string) => {
        if (!window.confirm(`确定删除菜谱「${name}」吗？`)) return;
        try {
            await adminApi(`/recipes/${id}`, { method: 'DELETE' });
            showMsg(`已删除菜谱「${name}」`);
            loadRecipes();
        } catch (err: any) { showMsg('删除失败: ' + err.message, 'error'); }
    };

    const handleSaveRecipe = async (data: any) => {
        try {
            if (data.id) {
                await adminApi(`/recipes/${data.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
                showMsg(`菜谱「${data.name}」已更新`);
            } else {
                await adminApi('/recipes', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
                showMsg(`菜谱「${data.name}」已创建`);
            }
            loadRecipes();
            return true;
        } catch (err: any) { showMsg(err.message, 'error'); return false; }
    };

    const handleSaveUser = async (data: { username: string; password: string }) => {
        try {
            await adminApi('/users', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            showMsg(`用户「${data.username}」已创建`);
            loadUsers();
            return true;
        } catch (err: any) { showMsg(err.message, 'error'); return false; }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/';
    };

    // ---- 弹窗状态 ----
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [editRecipe, setEditRecipe] = useState<AdminRecipe | null>(null);

    return (
        <div style={{ minHeight: '100vh', background: '#1a1a2e', color: '#e0e0e0', paddingBottom: 80 }}>
            {/* 顶部导航 */}
            <div style={{
                background: '#16213e', borderBottom: '2px solid #0f3460',
                padding: '10px 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a href="/" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← 返回首页</a>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#e74c3c' }}>⚙️ 管理后台</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TabBtn active={tab === 'recipes'} onClick={() => setTab('recipes')}>
                        🍳 菜谱 ({recipes.length})
                    </TabBtn>
                    <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>
                        👤 用户 ({users.length})
                    </TabBtn>
                    <button type="button" onClick={handleLogout} style={{
                        padding: '6px 14px', borderRadius: 8, border: '1px solid #555',
                        background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer',
                    }}>
                        退出
                    </button>
                </div>
            </div>

            {/* 提示消息 */}
            {message.text && (
                <div style={{
                    background: message.type === 'error' ? '#3d1a1a' : '#1a3d1a',
                    color: message.type === 'error' ? '#e74c3c' : '#53d769',
                    padding: '8px 16px', textAlign: 'center', fontSize: 14,
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Icon name="icon-critterpedia" size={48} bounce />
                        <p style={{ color: '#888', marginTop: 12 }}>加载中…</p>
                    </div>
                ) : tab === 'users' ? (
                    <>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#ccc', margin: 0 }}>👤 用户列表</h3>
                            <button type="button" onClick={() => setShowUserModal(true)} style={addBtnStyle}>
                                ＋ 添加用户
                            </button>
                        </div>
                        <DataTable
                            headers={['ID', '用户名', '注册时间', '操作']}
                            rows={users.map((u) => ({
                                cells: [
                                    u.id,
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{u.username}</span>,
                                    u.createdAt,
                                    <Btn danger onClick={() => handleDeleteUser(u.id, u.username)}>删除</Btn>,
                                ],
                            }))}
                        />
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#ccc', margin: 0 }}>🍳 菜谱列表</h3>
                            <button type="button" onClick={() => { setEditRecipe(null); setShowRecipeModal(true); }} style={addBtnStyle}>
                                ＋ 添加菜谱
                            </button>
                        </div>
                        <DataTable
                            headers={['名称', '作者', '分类', '食材', '图片', '创建时间', '操作']}
                            rows={recipes.map((r) => ({
                                cells: [
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{r.name}</span>,
                                    r.username,
                                    r.category,
                                    <span style={{ fontSize: 12, color: '#999' }}>{r.ingredients.slice(0, 30)}{r.ingredients.length > 30 ? '…' : ''}</span>,
                                    `${r.images.length} 张`,
                                    r.createdAt,
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <Btn onClick={() => { setEditRecipe(r); setShowRecipeModal(true); }}>编辑</Btn>
                                        <Btn danger onClick={() => handleDeleteRecipe(r.id, r.name)}>删除</Btn>
                                    </div>,
                                ],
                            }))}
                        />
                    </>
                )}
            </div>

            {/* 添加用户弹窗 */}
            {showUserModal && (
                <UserFormModal
                    onClose={() => setShowUserModal(false)}
                    onSave={handleSaveUser}
                />
            )}

            {/* 添加/编辑菜谱弹窗 */}
            {showRecipeModal && (
                <RecipeFormModal
                    recipe={editRecipe}
                    users={users}
                    onClose={() => setShowRecipeModal(false)}
                    onSave={handleSaveRecipe}
                />
            )}
        </div>
    );
};

/* ========== 子组件 ========== */

const TabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick} style={{
        padding: '8px 20px', borderRadius: 20, border: 'none',
        background: active ? '#e74c3c' : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : '#aaa', fontWeight: active ? 700 : 400,
        fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
    }}>
        {children}
    </button>
);

const Btn: React.FC<{ danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ danger, onClick, children }) => (
    <button type="button" onClick={onClick} style={{
        padding: '4px 12px', borderRadius: 6, border: `1px solid ${danger ? '#e74c3c' : '#555'}`,
        background: 'transparent', color: danger ? '#e74c3c' : '#aaa',
        fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
        {children}
    </button>
);

const addBtnStyle: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 8, border: 'none',
    background: '#53d769', color: '#1a1a2e', fontWeight: 700,
    fontSize: 13, cursor: 'pointer',
};

/* ========== 通用表格 ========== */
const DataTable: React.FC<{
    headers: string[];
    rows: { cells: React.ReactNode[] }[];
}> = ({ headers, rows }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
                <tr style={{ background: '#0f3460', color: '#fff' }}>
                    {headers.map((h, i) => (
                        <th key={i} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid #2a2a4a' }}>
                        {row.cells.map((cell, ci) => (
                            <td key={ci} style={{ padding: '10px 12px', color: '#bbb', verticalAlign: 'middle' }}>{cell}</td>
                        ))}
                    </tr>
                ))}
                {rows.length === 0 && (
                    <tr><td colSpan={headers.length} style={{ padding: '30px', textAlign: 'center', color: '#555' }}>暂无数据</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

/* ========== 用户表单弹窗 ========== */
const UserFormModal: React.FC<{
    onClose: () => void;
    onSave: (data: { username: string; password: string }) => Promise<boolean>;
}> = ({ onClose, onSave }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!username.trim() || !password) { setError('请填写完整'); return; }
        setSaving(true); setError('');
        const ok = await onSave({ username: username.trim(), password });
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <ModalOverlay onClose={onClose}>
            <ModalPanel title="👤 添加用户" onClose={onClose}>
                <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle} autoFocus />
                <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle} />
                {error && <p style={{ color: '#e74c3c', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={modalBtnStyle}>取消</button>
                    <button type="button" onClick={handleSubmit} disabled={saving} style={{ ...modalBtnStyle, background: '#53d769', color: '#1a1a2e', fontWeight: 700 }}>
                        {saving ? '创建中…' : '创建用户'}
                    </button>
                </div>
            </ModalPanel>
        </ModalOverlay>
    );
};

/* ========== 菜谱表单弹窗 ========== */
const RecipeFormModal: React.FC<{
    recipe: AdminRecipe | null;
    users: AdminUser[];
    onClose: () => void;
    onSave: (data: any) => Promise<boolean>;
}> = ({ recipe, users, onClose, onSave }) => {
    const isEdit = !!recipe;
    const [userId, setUserId] = useState(recipe?.userId ?? (users[0]?.id || 0));
    const [name, setName] = useState(recipe?.name || '');
    const [category, setCategory] = useState(recipe?.category || 'other');
    const [ingredients, setIngredients] = useState(recipe?.ingredients || '');
    const [steps, setSteps] = useState(recipe?.steps || '');
    const [notes, setNotes] = useState(recipe?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!name.trim() || !userId) { setError('请填写菜谱名称并选择作者'); return; }
        setSaving(true); setError('');
        const ok = await onSave({
            id: recipe?.id,
            userId: Number(userId),
            name: name.trim(),
            category,
            ingredients: ingredients.trim(),
            steps: steps.trim(),
            notes: notes.trim(),
        });
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <ModalOverlay onClose={onClose}>
            <ModalPanel title={isEdit ? '📝 编辑菜谱' : '✨ 添加菜谱'} onClose={onClose}>
                {/* 作者选择（添加时可选，编辑时不可改） */}
                {!isEdit && (
                    <select value={userId} onChange={(e) => setUserId(Number(e.target.value))} style={inputStyle}>
                        <option value={0}>— 选择作者 —</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>
                        ))}
                    </select>
                )}
                {isEdit && (
                    <p style={{ color: '#888', fontSize: 13, margin: '0 0 10px' }}>
                        作者：{recipe?.username} (ID: {recipe?.userId})
                    </p>
                )}

                <input placeholder="菜谱名称" value={name} onChange={(e) => setName(e.target.value)}
                    style={inputStyle} autoFocus={!isEdit} />

                <input placeholder="分类 (如 main / dessert / 自定义)" value={category}
                    onChange={(e) => setCategory(e.target.value)} style={inputStyle} />

                <textarea placeholder="食材清单" value={ingredients} onChange={(e) => setIngredients(e.target.value)}
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />

                <textarea placeholder="制作步骤" value={steps} onChange={(e) => setSteps(e.target.value)}
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />

                <textarea placeholder="备注（可选）" value={notes} onChange={(e) => setNotes(e.target.value)}
                    style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />

                {error && <p style={{ color: '#e74c3c', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={modalBtnStyle}>取消</button>
                    <button type="button" onClick={handleSubmit} disabled={saving} style={{ ...modalBtnStyle, background: '#e74c3c', color: '#fff', fontWeight: 700 }}>
                        {saving ? '保存中…' : isEdit ? '保存修改' : '添加菜谱'}
                    </button>
                </div>
            </ModalPanel>
        </ModalOverlay>
    );
};

/* ========== 通用弹窗 ========== */
const ModalOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
);

const ModalPanel: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{
        background: '#16213e', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 480, border: '1px solid #0f3460',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>{title}</h3>
        </div>
        {children}
    </div>
);

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #333', background: '#0d1b2a', color: '#fff',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    marginBottom: 12, fontFamily: 'inherit',
};

const modalBtnStyle: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 8, border: 'none',
    fontSize: 14, cursor: 'pointer',
};

export default AdminPage;
