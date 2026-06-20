import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import RecipeApp from './components/RecipeApp';
import SharedRecipePage from './components/SharedRecipePage';
import AdminPage from './components/AdminPage';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './storage';

type User = { id: number; username: string; isGuest?: boolean };

// 检查 URL 参数
function getQueryParam(name: string): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(name);
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(() => getCurrentUser());
    const [adminMode, setAdminMode] = useState(() => getQueryParam('admin') === '1');
    const sharedId = getQueryParam('recipe');

    const handleLogin = (userData: User) => {
        setCurrentUser(userData);
        setUser(userData);
    };

    const handleGuest = () => {
        const guest: User = { id: 0, username: '游客', isGuest: true };
        setCurrentUser(guest);
        setUser(guest);
    };

    const handleLogout = () => {
        clearCurrentUser();
        setUser(null);
    };

    const handleBackFromShared = () => {
        // 清除 query param 并刷新
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
    };

    // 优先显示管理后台
    if (adminMode) {
        return <AdminPage onBack={() => setAdminMode(false)} />;
    }

    // 优先显示分享的菜谱（无需登录）
    if (sharedId) {
        return <SharedRecipePage recipeId={sharedId} onBack={handleBackFromShared} />;
    }

    if (!user) {
        return <LoginPage onLogin={handleLogin} onGuest={handleGuest} />;
    }

    return <RecipeApp user={user} onLogout={handleLogout} />;
};

export default App;
