export interface UploadedImage {
    filename: string;
    url: string;
}

export interface Recipe {
    id: string;
    createdBy?: string;
    name: string;
    category: string;
    ingredients: string;
    steps: string;
    notes: string;
    images: UploadedImage[];
    createdAt: string;
}

export const CATEGORIES = [
    { key: 'main', label: '🍚 主食' },
    { key: 'dessert', label: '🍰 甜品' },
    { key: 'soup', label: '🥣 汤品' },
    { key: 'drink', label: '🥤 饮品' },
    { key: 'appetizer', label: '🥗 凉菜/前菜' },
    { key: 'other', label: '🍳 其他' },
] as const;

export function getCategoryLabel(key: string): string {
    return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
