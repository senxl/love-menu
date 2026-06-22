import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Card,
    Icon,
    Tooltip,
    Input,
} from 'animal-island-ui';
import type { Recipe } from '../types';
import { CATEGORIES, getCategoryLabel } from '../types';
import { getRecipes, addRecipe, updateRecipe, deleteRecipe } from '../storage';
import RecipeCard from './RecipeCard';
import AddRecipeModal from './AddRecipeModal';

interface RecipeAppProps {
    user: { id: number; username: string; isGuest?: boolean };
    onLogout: () => void;
}

const RecipeApp: React.FC<RecipeAppProps> = ({ user, onLogout }) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Recipe | null>(null);
    const [viewTarget, setViewTarget] = useState<Recipe | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const saved = localStorage.getItem('recipe-view-mode');
        return saved === 'grid' || saved === 'list' ? saved : 'grid';
    });
    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const [displayCount, setDisplayCount] = useState(20);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const BATCH = 20;

    // 重置显示数量（搜索/切换分类时）
    const resetDisplay = () => setDisplayCount(BATCH);
    React.useEffect(() => { resetDisplay(); }, [activeTab, searchText]);
    React.useEffect(() => { localStorage.setItem('recipe-view-mode', viewMode); }, [viewMode]);

    const doSearch = () => {
        setSearchText(searchInput.trim());
        resetDisplay();
    };

    // 加载菜谱
    const isGuest = user.isGuest;
    const loadRecipes = async () => {
        setLoading(true);
        try {
            const data = await getRecipes(isGuest ? undefined : user.id);
            setRecipes(data);
        } catch (err) {
            console.error('加载菜谱失败:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecipes();
    }, [user.id]);

    // 添加菜谱
    const handleAdd = async (data: Omit<Recipe, 'id' | 'createdAt'>) => {
        const newRecipe: Recipe = {
            ...data,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            createdAt: new Date().toLocaleString('zh-CN'),
        };
        try {
            await addRecipe(user.id, newRecipe);
            await loadRecipes();
            setAddOpen(false);
        } catch (err) {
            console.error('添加失败:', err);
        }
    };

    // 编辑菜谱
    const handleEdit = async (data: Omit<Recipe, 'id' | 'createdAt'>) => {
        if (!editTarget) return;
        try {
            await updateRecipe(editTarget.id, data);
            await loadRecipes();
            setEditTarget(null);
        } catch (err) {
            console.error('编辑失败:', err);
        }
    };

    // 删除菜谱
    const handleDelete = async (id: string) => {
        if (!window.confirm('确定要删除这个菜谱吗？')) return;
        try {
            await deleteRecipe(id);
            await loadRecipes();
            if (viewTarget?.id === id) setViewTarget(null);
        } catch (err) {
            console.error('删除失败:', err);
        }
    };

    const handleShare = async (recipe: Recipe) => {
        const url = `${window.location.origin}${'?recipe='}${recipe.id}`;
        // iOS Safari 需要 HTTPS 才能用 Web Share API，HTTP 下 fallback 到传统复制
        try {
            if (navigator.share) {
                await navigator.share({ title: recipe.name, text: `查看菜谱：${recipe.name}`, url });
                return;
            }
        } catch {
            // 用户取消或不支持，继续走复制
        }
        // 传统复制方式（兼容 HTTP / iOS）
        try {
            const input = document.createElement('input');
            input.value = url;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('分享链接已复制！');
        } catch {
            alert(`请手动复制链接：${url}`);
        }
    };

    // 过滤 + 搜索
    const filteredRecipes = recipes.filter((r) => {
        if (activeTab !== 'all' && r.category !== activeTab) return false;
        if (searchText) {
            const q = searchText.toLowerCase();
            return (
                r.name.toLowerCase().includes(q) ||
                r.ingredients.toLowerCase().includes(q) ||
                r.notes.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // 渐进加载：IntersectionObserver（放在 filteredRecipes 之后，确保变量已声明）
    React.useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setDisplayCount((prev) => Math.min(prev + BATCH, filteredRecipes.length));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [filteredRecipes.length]);

    // 分类标签
    // 从菜谱中提取所有自定义分类（不在内置列表中的）
    const customCats = React.useMemo(() => {
        const keys = new Set<string>();
        recipes.forEach((r) => {
            if (r.category && !CATEGORIES.some((c) => c.key === r.category)) {
                keys.add(r.category);
            }
        });
        return Array.from(keys).map((k) => ({ key: k, label: k }));
    }, [recipes]);

    const customCatKeys = React.useMemo(() => customCats.map((c) => c.key), [customCats]);

    const tabItems = [
        { key: 'all', label: '📋 全部' },
        ...CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
        ...customCats,
    ];

    const renderTabBar = () => (
        <div
            style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 20,
            }}
        >
            {tabItems.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: `2px solid ${isActive ? '#8fb88a' : '#d4c5b0'}`,
                            background: isActive ? '#8fb88a' : '#fffdf8',
                            color: isActive ? '#fff' : '#6b5a4a',
                            fontWeight: isActive ? 700 : 400,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f0e6d3',
                paddingBottom: 80,
            }}
        >
            {/* ===== 顶部导航栏（简化版） ===== */}
            <div
                style={{
                    background: '#fff9f0',
                    borderBottom: '3px solid #c8b89a',
                    padding: '8px 16px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div
                    style={{
                        maxWidth: 800,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#4a3a2a' }}>
                            🍳 菜谱小岛
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#6b5a4a' }}>
                            {recipes.length} 个菜谱
                        </span>
                        <span style={{ fontSize: 13, color: '#8b7a62' }}>
                            👤 {user.username}
                        </span>
                            <button
                                type="button"
                                onClick={onLogout}
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    border: '1px solid #d4c5b0',
                                    background: 'transparent',
                                    color: '#a09080',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }}
                            >
                                退出
                            </button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px' }}>
                {/* ===== 标题栏（精简） ===== */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#4a3a2a' }}>
                        🍽️ 我的私房菜谱
                    </span>
                    <span style={{ fontSize: 13, color: '#8b7a62' }}>
                        {loading ? '…' : `${recipes.length} 个菜谱${searchText ? ` · ${filteredRecipes.length} 个` : ''}`}
                    </span>
                </div>

                {/* ===== 搜索 + 添加 ===== */}
                <Card color="app-yellow" style={{ marginBottom: 24 }}>
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            padding: 4,
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 180, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <Input
                                    placeholder="搜索菜谱、食材…"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            doSearch();
                                        }
                                    }}
                                    allowClear
                                    onClear={() => { setSearchInput(''); setSearchText(''); }}
                                    prefix={<Icon name="icon-camera" size={14} />}
                                />
                            </div>
                            <Tooltip title="搜索" placement="bottom">
                                <Button type="primary" size="middle" onClick={doSearch} style={{ flexShrink: 0 }}>
                                    🔍 搜索
                                </Button>
                            </Tooltip>
                        </div>


                    </div>
                </Card>

                {/* ===== 分类标签 ===== */}
                {renderTabBar()}

                {/* ===== 视图切换 + 添加 ===== */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    {!isGuest && (
                        <Button type="primary" size="middle" onClick={() => setAddOpen(true)}>
                            <Icon name="icon-miles" size={14} /> 添加菜谱
                        </Button>
                    )}
                    <button
                        type="button"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        title={viewMode === 'grid' ? '切换列表视图' : '切换网格视图'}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: '1px solid #d4c5b0',
                            background: '#fffdf8',
                            color: '#6b5a4a',
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        {viewMode === 'grid' ? '☰ 列表' : '⊞ 网格'}
                    </button>
                </div>

                {/* ===== 菜谱列表 ===== */}
                {loading ? (
                    <Card color="default">
                        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                            <Icon name="icon-critterpedia" size={48} />
                            <p style={{ color: '#8b7a62', marginTop: 12 }}>加载菜谱中…</p>
                        </div>
                    </Card>
                ) : filteredRecipes.length === 0 ? (
                    <Card color="default">
                        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                            <Icon name="icon-critterpedia" size={48} />
                            <p style={{ color: '#8b7a62', marginTop: 12, fontSize: 15 }}>
                                {searchText || activeTab !== 'all'
                                    ? '没有找到匹配的菜谱 🧐'
                                    : '还没有菜谱呢，快添加第一个吧！ 🎉'}
                            </p>
                            {!isGuest && !searchText && activeTab === 'all' && (
                                <Button
                                    type="primary"
                                    onClick={() => setAddOpen(true)}
                                    style={{ marginTop: 8 }}
                                >
                                    添加第一道菜谱
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : viewMode === 'grid' ? (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: 14,
                        }}
                    >
                        {filteredRecipes.slice(0, displayCount).map((recipe) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onView={(r) => setViewTarget(r)}
                                onDelete={handleDelete}
                                isGuest={isGuest}
                            />
                        ))}
                    </div>
                ) : (
                    /* ===== 列表视图 ===== */
                    <div>
                        {filteredRecipes.slice(0, displayCount).map((recipe) => {
                            const hasBg = recipe.images && recipe.images.length > 0;
                            return (
                            <Card key={recipe.id} color="default" style={{
                                marginBottom: 12,
                                position: 'relative',
                                overflow: 'hidden',
                                minHeight: 80,
                                background: hasBg
                                    ? `linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.15)), url(${recipe.images[0].url}) center/cover`
                                    : '#fff9f0',
                                border: hasBg ? 'none' : undefined,
                            }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 12,
                                        alignItems: 'center',
                                        padding: '14px 16px',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                    onClick={() => setViewTarget(recipe)}
                                >
                                    {/* 小缩略图 */}
                                    {hasBg ? (
                                        <div
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                border: '2px solid rgba(255,255,255,0.4)',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            }}
                                        >
                                            <img
                                                src={recipe.images[0].url}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 10,
                                                flexShrink: 0,
                                                background: '#f0e6d3',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name="icon-camera" size={20} />
                                        </div>
                                    )}
                                    {/* 名称 + 分类 */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: hasBg ? '#fff' : '#4a3a2a',
                                            textShadow: hasBg ? '0 1px 4px rgba(0,0,0,0.6)' : undefined,
                                        }}>
                                            {recipe.name}
                                        </div>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                marginTop: 4,
                                                padding: '2px 10px',
                                                borderRadius: 10,
                                                background: hasBg ? 'rgba(0,0,0,0.35)' : '#f0e6d3',
                                                fontSize: 11,
                                                color: hasBg ? '#fff' : '#7a6a5a',
                                                backdropFilter: hasBg ? 'blur(3px)' : undefined,
                                            }}
                                        >
                                            {getCategoryLabel(recipe.category)}
                                        </span>
                                    </div>

                                    {/* 操作 */}
                                    {!isGuest && (
                                        <Tooltip title="删除" placement="top">
                                            <Button
                                                size="small"
                                                type="dashed"
                                                danger
                                                onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                                            >
                                                删除
                                            </Button>
                                        </Tooltip>
                                    )}
                                </div>
                            </Card>
                            );
                        })}
                    </div>
                )}

                {/* ===== 渐进加载哨兵 ===== */}
                {displayCount < filteredRecipes.length && (
                    <div ref={sentinelRef} style={{ height: 1 }} />
                )}

                {/* ===== 添加菜谱弹窗 ===== */}
                <AddRecipeModal
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    onSave={handleAdd}
                    customCategories={customCatKeys}
                />

                {/* ===== 编辑菜谱弹窗 ===== */}
                <AddRecipeModal
                    open={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleEdit}
                    editRecipe={editTarget}
                    customCategories={customCatKeys}
                />

                {/* ===== 查看详情全屏页 ===== */}
                {viewTarget && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#f0e6d3',
                        }}
                    >
                        {/* 顶部操作栏 */}
                        <div
                            style={{
                                background: '#fff9f0',
                                borderBottom: '3px solid #c8b89a',
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexShrink: 0,
                            }}
                        >
                            <Button type="default" onClick={() => setViewTarget(null)}>
                                ← 返回
                            </Button>
                            <div style={{ flex: 1 }} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                <Button
                                    size="small"
                                    type="default"
                                    onClick={() => handleShare(viewTarget)}
                                >
                                    🔗 分享
                                </Button>
                                {!isGuest && (
                                    <>
                                        <Button
                                            size="small"
                                            type="default"
                                            onClick={() => {
                                                setEditTarget(viewTarget);
                                                setViewTarget(null);
                                            }}
                                        >
                                            编辑
                                        </Button>
                                        <Button
                                            size="small"
                                            type="dashed"
                                            danger
                                            onClick={() => handleDelete(viewTarget.id)}
                                        >
                                            删除
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 可滚动内容 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
                            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                                {/* 标题 + 分类 */}
                                <div style={{ marginBottom: 24, background: '#fff9f0', borderRadius: 16, border: '2px solid #c8b89a', padding: '20px 20px 16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#4a3a2a', marginBottom: 10, lineHeight: 1.3 }}>
                                        {viewTarget.name}
                                    </div>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '4px 16px',
                                            borderRadius: 20,
                                            background: '#8fb88a',
                                            color: '#fff',
                                            fontSize: 13,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {getCategoryLabel(viewTarget.category)}
                                    </span>
                                </div>

                                {/* 图片画廊 — 居中大图展示 */}
                                {viewTarget.images && viewTarget.images.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 16,
                                            }}
                                        >
                                            {viewTarget.images.map((img) => (
                                                <div
                                                    key={img.filename}
                                                    className="detail-gallery-item"
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: 600,
                                                        borderRadius: 14,
                                                        overflow: 'hidden',
                                                        border: '2px solid #d4c5b0',
                                                        background: '#f5f0e8',
                                                    }}
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt=""
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            display: 'block',
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 食材 */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>
                                        🥘 食材
                                    </h4>
                                    <div
                                        style={{
                                            background: '#fffdf8',
                                            borderRadius: 12,
                                            border: '1px solid #d4c5b0',
                                            padding: '14px 16px',
                                            lineHeight: 1.8,
                                            whiteSpace: 'pre-wrap',
                                            color: '#4a3a2a',
                                            fontSize: 15,
                                        }}
                                    >
                                        {viewTarget.ingredients}
                                    </div>
                                </div>

                                {/* 步骤 */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>
                                        📋 制作步骤
                                    </h4>
                                    <div
                                        style={{
                                            background: '#fffdf8',
                                            borderRadius: 12,
                                            border: '1px solid #d4c5b0',
                                            padding: '14px 16px',
                                            lineHeight: 1.8,
                                            whiteSpace: 'pre-wrap',
                                            color: '#4a3a2a',
                                            fontSize: 15,
                                        }}
                                    >
                                        {viewTarget.steps}
                                    </div>
                                </div>

                                {/* 备注 */}
                                {viewTarget.notes && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>
                                            💡 备注
                                        </h4>
                                        <div
                                            style={{
                                                background: '#fffdf8',
                                                borderRadius: 12,
                                                border: '1px solid #d4c5b0',
                                                padding: '14px 16px',
                                                lineHeight: 1.8,
                                                whiteSpace: 'pre-wrap',
                                                color: '#4a3a2a',
                                                fontSize: 15,
                                            }}
                                        >
                                            {viewTarget.notes}
                                        </div>
                                    </div>
                                )}

                                {/* 作者 + 创建时间 */}
                                <div style={{ textAlign: 'center', padding: '20px 0 40px', color: '#a09080', fontSize: 13 }}>
                                    {viewTarget.createdBy && <span>👤 {viewTarget.createdBy} · </span>}
                                    创建于 {viewTarget.createdAt}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== Footer ===== */}
                <div style={{ marginTop: 40, textAlign: 'center', padding: '20px 0', color: '#a09080', fontSize: 14 }}>
                    🍳 菜谱小岛 · {user.username} 的私房菜
                </div>
            </div>
        </div>
    );
};

export default RecipeApp;
