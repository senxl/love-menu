import React from 'react';
import { Icon } from 'animal-island-ui';
import type { Recipe } from '../types';
import { getCategoryLabel } from '../types';

interface RecipeCardProps {
    recipe: Recipe;
    onView: (recipe: Recipe) => void;
    onDelete: (id: string) => void;
    isGuest?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onView, onDelete, isGuest = false }) => {
    const hasImages = recipe.images && recipe.images.length > 0;
    const thumbUrl = hasImages ? recipe.images[0].url : '';
    const moreCount = hasImages ? recipe.images.length - 1 : 0;

    return (
        <div
            style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: '2px solid #d4c5b0',
                background: '#fff9f0',
                cursor: 'pointer',
                position: 'relative',
                aspectRatio: '1 / 1',
            }}
            onClick={() => onView(recipe)}
        >
            {/* ===== 图片 ===== */}
            {thumbUrl ? (
                <img
                    src={thumbUrl}
                    alt={recipe.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            ) : (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f0e6d3',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    <Icon name="icon-camera" size={48} />
                    <span style={{ fontSize: 14, color: '#a09080' }}>{recipe.name}</span>
                </div>
            )}

            {!isGuest && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recipe.id);
                    }}
                    style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(231,76,60,0.75)',
                        color: '#fff',
                        fontSize: 13,
                        lineHeight: '22px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        backdropFilter: 'blur(2px)',
                        zIndex: 2,
                    }}
                    title="删除"
                >
                    ×
                </button>
            )}

            {/* 多张图片角标（放左上角） */}
            {moreCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        fontSize: 11,
                        borderRadius: 8,
                        padding: '1px 6px',
                        backdropFilter: 'blur(2px)',
                        zIndex: 2,
                    }}
                >
                    +{moreCount}
                </div>
            )}

            {/* ===== 分类标签（右下角） ===== */}
            <span
                style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.45)',
                    color: 'rgba(255,255,255,0.95)',
                    fontSize: 11,
                    backdropFilter: 'blur(4px)',
                    zIndex: 2,
                }}
            >
                {getCategoryLabel(recipe.category)}
            </span>

            {/* ===== 底部名称浮层 ===== */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                    padding: '30px 10px 8px',
                }}
            >
                <span
                    style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {recipe.name}
                </span>
            </div>
        </div>
    );
};

export default RecipeCard;
