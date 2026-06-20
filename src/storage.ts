import type { Recipe, UploadedImage } from './types';

const API_BASE = '/api';

/* ---------- 当前登录用户（前端缓存） ---------- */

export function getCurrentUser(): { id: number; username: string } | null {
    try {
        const raw = localStorage.getItem('recipe-app-user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setCurrentUser(user: { id: number; username: string }): void {
    localStorage.setItem('recipe-app-user', JSON.stringify(user));
}

export function clearCurrentUser(): void {
    localStorage.removeItem('recipe-app-user');
}

/* ---------- API 工具 ---------- */

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
}

/* ---------- 认证 API ---------- */

export async function login(username: string, password: string): Promise<{ id: number; username: string }> {
    const data = await apiCall<{ success: boolean; user: { id: number; username: string } }>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    return data.user;
}

/* ---------- 图片上传 API ---------- */

function getUserIdOrThrow(): number {
    const user = getCurrentUser();
    if (!user || user.id === 0) throw new Error('未登录用户不能上传');
    return user.id;
}

export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
    const userId = getUserIdOrThrow();
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    formData.append('userId', String(userId));

    const res = await fetch(`${API_BASE}/upload?userId=${userId}`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data.files;
}

export async function deleteImage(filename: string): Promise<void> {
    const user = getCurrentUser();
    if (!user || (user as any).isGuest || user.id === 0) return;
    await fetch(`${API_BASE}/upload/${filename}?userId=${user.id}`, { method: 'DELETE' });
}

/* ---------- 菜谱 API ---------- */

export async function getRecipes(userId?: number): Promise<Recipe[]> {
    const query = userId ? `?userId=${userId}` : '';
    const data = await apiCall<{ success: boolean; recipes: Recipe[] }>(`/recipes${query}`);
    return data.recipes;
}

export async function getRecipeById(id: string): Promise<Recipe> {
    const data = await apiCall<{ success: boolean; recipe: Recipe }>(`/recipes/${id}`);
    return data.recipe;
}

export async function addRecipe(userId: number, recipe: Recipe): Promise<void> {
    await apiCall('/recipes', {
        method: 'POST',
        body: JSON.stringify({ ...recipe, userId }),
    });
}

export async function updateRecipe(recipeId: string, data: Partial<Recipe>): Promise<void> {
    const user = getCurrentUser();
    await apiCall(`/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, userId: user?.id }),
    });
}

export async function deleteRecipe(recipeId: string): Promise<void> {
    const user = getCurrentUser();
    await apiCall(`/recipes/${recipeId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user?.id }),
    });
}
