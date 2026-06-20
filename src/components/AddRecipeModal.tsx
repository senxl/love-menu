import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Card,
    Input,
    Title,
    Icon,
    Tooltip,
} from 'animal-island-ui';
import { CATEGORIES } from '../types';
import type { Recipe, UploadedImage } from '../types';
import { uploadImages, deleteImage } from '../storage';

interface AddRecipeModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
    editRecipe?: Recipe | null;
    /** 已有的自定义分类列表，供快速选择 */
    customCategories?: string[];
}

const emptyForm = {
    name: '',
    category: 'main',
    ingredients: '',
    steps: '',
    notes: '',
};

/* ===== 统一的输入框样式 ===== */
const TEXTAREA_STYLE: React.CSSProperties = {
    width: '100%',
    minHeight: 140,
    padding: '12px 14px',
    borderRadius: 12,
    border: '2px solid #d4c5b0',
    fontSize: 15,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    background: '#fffdf8',
    boxSizing: 'border-box',
    lineHeight: 1.7,
    color: '#4a3a2a',
};

const TEXTAREA_ERROR_STYLE: React.CSSProperties = {
    ...TEXTAREA_STYLE,
    border: '2px solid #e74c3c',
};

/* ===== 分类按钮样式 ===== */
const CAT_BTN_BASE: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '2px solid #d4c5b0',
    background: '#fffdf8',
    color: '#6b5a4a',
    fontWeight: 400,
};

const CAT_BTN_ACTIVE: React.CSSProperties = {
    ...CAT_BTN_BASE,
    border: '2px solid #8fb88a',
    background: '#8fb88a',
    color: '#fff',
    fontWeight: 700,
};

const AddRecipeModal: React.FC<AddRecipeModalProps> = ({ open, onClose, onSave, editRecipe, customCategories = [] }) => {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [customCatInput, setCustomCatInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭 emoji 选择器
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showEmojiPicker]);

    // 编辑时填充表单
    useEffect(() => {
        if (editRecipe) {
            setForm({
                name: editRecipe.name,
                category: editRecipe.category,
                ingredients: editRecipe.ingredients,
                steps: editRecipe.steps,
                notes: editRecipe.notes,
            });
            setImages(editRecipe.images || []);
            const isBuiltin = CATEGORIES.some((c) => c.key === editRecipe.category);
            if (editRecipe.category && !isBuiltin) {
                setCustomCatInput(editRecipe.category);
            } else {
                setCustomCatInput('');
            }
        } else {
            setForm(emptyForm);
            setImages([]);
            setCustomCatInput('');
        }
        setErrors({});
        // 滚动到顶部
        if (formRef.current) formRef.current.scrollTop = 0;
    }, [editRecipe, open]);

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = '请输入菜谱名称';
        if (!form.ingredients.trim()) errs.ingredients = '请输入食材清单';
        if (!form.steps.trim()) errs.steps = '请输入制作步骤';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ---- 图片上传 ----
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const totalAfter = images.length + files.length;
        if (totalAfter > 9) {
            alert('最多上传 9 张图片');
            return;
        }

        setUploading(true);
        try {
            const uploaded = await uploadImages(Array.from(files));
            setImages((prev) => [...prev, ...uploaded]);
        } catch (err: any) {
            alert(err.message || '上传失败');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleRemoveImage = async (img: UploadedImage) => {
        setImages((prev) => prev.filter((i) => i.filename !== img.filename));
        try { await deleteImage(img.filename); } catch { /* ignore */ }
    };

    const handleSave = () => {
        if (!validate()) return;
        const finalCategory = form.category === '__custom__' ? '' : form.category;
        if (!finalCategory) {
            setErrors((prev) => ({ ...prev, category: '请选择或输入分类' }));
            return;
        }
        onSave({
            name: form.name.trim(),
            category: finalCategory,
            ingredients: form.ingredients.trim(),
            steps: form.steps.trim(),
            notes: form.notes.trim(),
            images,
        });
    };

    if (!open) return null;

    return (
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
            {/* ===== 顶部操作栏 ===== */}
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
                <Button type="default" onClick={onClose}>
                    ← 返回
                </Button>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#4a3a2a' }}>
                    {editRecipe ? '📝 编辑菜谱' : '✨ 添加菜谱'}
                </span>
                <Button type="primary" onClick={handleSave} loading={uploading}>
                    <Icon name="icon-miles" size={14} /> {editRecipe ? '保存' : '发布'}
                </Button>
            </div>

            {/* ===== 可滚动内容区 ===== */}
            <div
                ref={formRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px 16px',
                }}
            >
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    {/* ---- 菜谱名称 ---- */}
                    <div style={{ marginBottom: 20 }}>
                        <Label text="菜谱名称" required />
                        <Input
                            placeholder="例如：番茄炒蛋"
                            value={form.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            size="large"
                            status={errors.name ? 'error' : undefined}
                            prefix={<Icon name="icon-diy" size={16} />}
                        />
                        {errors.name && <ErrorText text={errors.name} />}
                    </div>

                    {/* ---- 分类 ---- */}
                    <div style={{ marginBottom: 20 }}>
                        <Label text="分类" />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {CATEGORIES.map((cat) => {
                                const isActive = form.category === cat.key;
                                return (
                                    <button
                                        key={cat.key}
                                        type="button"
                                        onClick={() => { updateField('category', cat.key); setCustomCatInput(''); }}
                                        style={isActive ? CAT_BTN_ACTIVE : CAT_BTN_BASE}
                                    >
                                        {cat.label}
                                    </button>
                                );
                            })}
                            {/* 已有自定义分类 */}
                            {customCategories.map((cat) => {
                                const isActive = form.category === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => { updateField('category', cat); setCustomCatInput(''); }}
                                        style={isActive ? CAT_BTN_ACTIVE : { ...CAT_BTN_BASE, borderStyle: 'dashed' }}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                            {/* 新建自定义 */}
                            <button
                                type="button"
                                onClick={() => updateField('category', '__custom__')}
                                style={form.category === '__custom__' ? CAT_BTN_ACTIVE : CAT_BTN_BASE}
                            >
                                ✏️ 自定义
                            </button>
                        </div>
                        {/* 自定义输入框 — 仅用户点击「自定义」按钮时显示 */}
                        {form.category === '__custom__' ? (
                            <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                                <Input
                                    placeholder="输入自定义分类名称，例如：烤箱菜"
                                    value={customCatInput}
                                    onChange={(e) => {
                                        setCustomCatInput(e.target.value);
                                        if (e.target.value.trim()) {
                                            updateField('category', e.target.value.trim());
                                        } else {
                                            updateField('category', '__custom__');
                                        }
                                    }}
                                    size="middle"
                                    prefix={
                                        <span
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: 18,
                                                lineHeight: 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 28,
                                                userSelect: 'none',
                                            }}
                                            title="点击选择图标"
                                        >
                                            {extractEmoji(customCatInput) || '📝'}
                                        </span>
                                    }
                                    autoFocus
                                />
                                {/* emoji 选择弹出框 */}
                                {showEmojiPicker && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            marginTop: 4,
                                            background: '#fffdf8',
                                            border: '2px solid #d4c5b0',
                                            borderRadius: 12,
                                            padding: 8,
                                            display: 'flex',
                                            gap: 4,
                                            flexWrap: 'wrap',
                                            width: 280,
                                            zIndex: 10,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                        }}
                                    >
                                        {['🍕','🥘','🍲','🥗','🌮','🍜','🍝','🥟','🍣','🫕','🥪','🧆','🌯','🥓','🧁','🍪','🥧','🧋','🍸','🥂','🥩','🫘','🥜','🌶️','🥒','🥕','🧄','🧅','🍄','🥬'].map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    const text = customCatInput.replace(/^.\s*/, '');
                                                    const val = emoji + ' ' + text;
                                                    setCustomCatInput(val);
                                                    updateField('category', val);
                                                    setShowEmojiPicker(false);
                                                }}
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: customCatInput.startsWith(emoji) ? '#e8f5e9' : 'transparent',
                                                    fontSize: 18,
                                                    cursor: 'pointer',
                                                    lineHeight: '32px',
                                                    textAlign: 'center',
                                                    padding: 0,
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                        {errors.category && <ErrorText text={errors.category} />}
                    </div>

                    {/* ---- 图片上传 ---- */}
                    <Card color="default" style={{ marginBottom: 20 }}>
                        <div style={{ padding: '12px 8px' }}>
                            <Label text="🖼️ 菜谱图片（最多 9 张，可选）" />
                            {images.length > 0 && (
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                    {images.map((img) => (
                                        <div
                                            key={img.filename}
                                            className="preview-thumb"
                                            style={{
                                                position: 'relative',
                                                width: 100,
                                                height: 100,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                border: '2px solid #d4c5b0',
                                                background: '#f5f0e8',
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(img)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: 'rgba(231,76,60,0.85)',
                                                    color: '#fff',
                                                    fontSize: 14,
                                                    lineHeight: '22px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                }}
                                                title="删除图片"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                <Button
                                    type="dashed"
                                    size="small"
                                    disabled={uploading || images.length >= 9}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    {uploading ? '上传中…' : images.length >= 9 ? '已达上限' : '+ 添加图片'}
                                </Button>
                                {uploading && <span style={{ fontSize: 13, color: '#8b7a62' }}>上传中…</span>}
                                <span style={{ fontSize: 12, color: '#a09080' }}>
                                    {images.length}/9 张
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* ---- 食材清单（大编辑框） ---- */}
                    <div style={{ marginBottom: 20 }}>
                        <Label text="🥘 食材清单" required />
                        <textarea
                            placeholder={'例如：\n鸡蛋 3个\n番茄 2个\n盐 适量\n糖 1茶匙'}
                            value={form.ingredients}
                            onChange={(e) => updateField('ingredients', e.target.value)}
                            style={errors.ingredients ? TEXTAREA_ERROR_STYLE : TEXTAREA_STYLE}
                        />
                        {errors.ingredients && <ErrorText text={errors.ingredients} />}
                    </div>

                    {/* ---- 制作步骤（大编辑框） ---- */}
                    <div style={{ marginBottom: 20 }}>
                        <Label text="📋 制作步骤" required />
                        <textarea
                            placeholder={'例如：\n1. 番茄洗净切块，鸡蛋打散加少许盐\n2. 热锅倒油，油热后倒入蛋液\n3. 蛋液凝固后炒散盛出备用\n4. 锅中再加少许油，放入番茄翻炒\n5. 番茄出汁后加糖和盐调味\n6. 倒入炒好的鸡蛋，翻炒均匀即可出锅'}
                            value={form.steps}
                            onChange={(e) => updateField('steps', e.target.value)}
                            style={{
                                ...(errors.steps ? TEXTAREA_ERROR_STYLE : TEXTAREA_STYLE),
                                minHeight: 200,
                            }}
                        />
                        {errors.steps && <ErrorText text={errors.steps} />}
                    </div>

                    {/* ---- 备注 ---- */}
                    <div style={{ marginBottom: 24 }}>
                        <Label text="💡 备注（可选）" />
                        <textarea
                            placeholder="个人心得、注意事项、建议搭配…"
                            value={form.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            style={{ ...TEXTAREA_STYLE, minHeight: 80 }}
                        />
                    </div>

                    {/* ---- 底部操作按钮 ---- */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center',
                            padding: '16px 0 40px',
                        }}
                    >
                        <Button type="default" size="large" onClick={onClose}>
                            取消
                        </Button>
                        <Button type="primary" size="large" onClick={handleSave} loading={uploading}>
                            <Icon name="icon-miles" size={16} /> {editRecipe ? '保存修改' : '添加菜谱'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* 标签组件 */
const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
    <label
        style={{
            display: 'block',
            marginBottom: 8,
            fontWeight: 600,
            color: '#5a4a3a',
            fontSize: 15,
        }}
    >
        {text}
        {required && <span style={{ color: '#e74c3c', marginLeft: 2 }}>*</span>}
    </label>
);

const ErrorText: React.FC<{ text: string }> = ({ text }) => (
    <p style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{text}</p>
);

/** 提取字符串开头的 emoji（如果有） */
function extractEmoji(s: string): string {
    const match = s.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    return match ? match[1] : '';
}

export default AddRecipeModal;
