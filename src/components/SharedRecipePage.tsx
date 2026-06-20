import React, { useEffect, useState } from 'react';
import { Button, Card, Icon, Title } from 'animal-island-ui';
import type { Recipe } from '../types';
import { getCategoryLabel } from '../types';
import { getRecipeById } from '../storage';

interface SharedRecipePageProps {
    recipeId: string;
    onBack: () => void;
}

const SharedRecipePage: React.FC<SharedRecipePageProps> = ({ recipeId, onBack }) => {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getRecipeById(recipeId)
            .then(setRecipe)
            .catch((err) => setError(err.message || '菜谱不存在'));
    }, [recipeId]);

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0e6d3', padding: 24 }}>
                <Card color="default" style={{ textAlign: 'center', padding: 32, maxWidth: 400 }}>
                    <Icon name="icon-critterpedia" size={48} />
                    <p style={{ color: '#e74c3c', marginTop: 12 }}>{error}</p>
                    <Button type="primary" onClick={onBack} style={{ marginTop: 16 }}>
                        ← 返回首页
                    </Button>
                </Card>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0e6d3' }}>
                <Icon name="icon-critterpedia" size={48} bounce />
                <p style={{ color: '#8b7a62', marginLeft: 12 }}>加载中…</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f0e6d3' }}>
            {/* 顶部栏 */}
            <div style={{ background: '#fff9f0', borderBottom: '3px solid #c8b89a', padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
                <Button type="default" onClick={onBack}>
                    ← 返回首页
                </Button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: '#a09080' }}>分享的菜谱</span>
            </div>

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
                {/* 标题卡片 */}
                <div style={{ marginBottom: 24, background: '#fff9f0', borderRadius: 16, border: '2px solid #c8b89a', padding: '20px 20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#4a3a2a', marginBottom: 10, lineHeight: 1.3 }}>
                        {recipe.name}
                    </div>
                    <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#8fb88a', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                        {getCategoryLabel(recipe.category)}
                    </span>
                </div>

                {/* 图片 */}
                {recipe.images && recipe.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                        {recipe.images.map((img) => (
                            <div key={img.filename} style={{ width: 140, height: 140, borderRadius: 14, overflow: 'hidden', border: '2px solid #d4c5b0', background: '#f5f0e8' }}>
                                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* 食材 */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>🥘 食材</h4>
                    <div style={{ background: '#fffdf8', borderRadius: 12, border: '1px solid #d4c5b0', padding: '14px 16px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#4a3a2a', fontSize: 15 }}>
                        {recipe.ingredients}
                    </div>
                </div>

                {/* 步骤 */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>📋 制作步骤</h4>
                    <div style={{ background: '#fffdf8', borderRadius: 12, border: '1px solid #d4c5b0', padding: '14px 16px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#4a3a2a', fontSize: 15 }}>
                        {recipe.steps}
                    </div>
                </div>

                {recipe.notes && (
                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ color: '#4a3a2a', marginBottom: 10, fontSize: 17, fontWeight: 700 }}>💡 备注</h4>
                        <div style={{ background: '#fffdf8', borderRadius: 12, border: '1px solid #d4c5b0', padding: '14px 16px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#4a3a2a', fontSize: 15 }}>
                            {recipe.notes}
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', padding: '20px 0', color: '#a09080', fontSize: 13 }}>
                    来自 菜谱小岛 的分享
                </div>
            </div>
        </div>
    );
};

export default SharedRecipePage;
