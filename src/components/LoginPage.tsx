import React, { useState } from 'react';
import { Button, Card, Input, Title, Icon } from 'animal-island-ui';
import { login } from '../storage';

interface LoginPageProps {
    onLogin: (user: { id: number; username: string; isGuest?: boolean }) => void;
    onGuest?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGuest }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = username.trim();
        if (!name || !password) {
            setError('请输入用户名和密码');
            return;
        }
        if (name.length < 2) {
            setError('用户名至少 2 个字符');
            return;
        }
        if (password.length < 4) {
            setError('密码至少 4 个字符');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const user = await login(name, password);
            onLogin(user);
        } catch (err: any) {
            if (err.message === '用户名或密码错误') {
                setError('用户名或密码错误，请重试');
            } else {
                setError(err.message || '登录失败，请检查服务器是否启动');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background: 'linear-gradient(180deg, #e8f5e9 0%, #f0e6d3 100%)',
            }}
        >
            <Card
                color="app-green"
                pattern="app-green"
                style={{ width: '100%', maxWidth: 420 }}
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                        {/* 装饰图标 */}
                        <div className="login-icon-wrap" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                            <Icon name="icon-miles" size={44} bounce />
                            <Icon name="icon-camera" size={44} bounce />
                            <Icon name="icon-map" size={44} bounce />
                        </div>

                        <Title size="large" color="app-green">
                            🍳 菜谱小岛
                        </Title>

                        <p
                            style={{
                                color: '#6b5a4a',
                                marginTop: 12,
                                marginBottom: 28,
                                lineHeight: 1.6,
                                fontSize: 15,
                            }}
                        >
                            登录你的账号，管理你的私房菜 📝
                        </p>

                        {/* 用户名 — 居中 */}
                        <div style={{ marginBottom: 18, textAlign: 'center' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: '#5a4a3a',
                                    fontSize: 14,
                                    textAlign: 'center',
                                }}
                            >
                                玩家名称
                            </label>
                            <div style={{ display: 'inline-block', width: '100%', maxWidth: 300 }}>
                                <Input
                                    placeholder="例如：小厨师"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError('');
                                    }}
                                    size="large"
                                    status={error ? 'error' : undefined}
                                    prefix={<Icon name="icon-chat" size={16} />}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* 密码 — 居中 */}
                        <div style={{ marginBottom: 20, textAlign: 'center' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: '#5a4a3a',
                                    fontSize: 14,
                                    textAlign: 'center',
                                }}
                            >
                                密码
                            </label>
                            <div style={{ display: 'inline-block', width: '100%', maxWidth: 300 }}>
                                <Input
                                    type="password"
                                    placeholder="输入密码"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    size="large"
                                    status={error ? 'error' : undefined}
                                    prefix={<Icon name="icon-miles" size={16} />}
                                />
                            </div>
                        </div>

                        {/* 错误提示 */}
                        {error && (
                            <p
                                style={{
                                    color: '#e74c3c',
                                    fontSize: 13,
                                    marginBottom: 16,
                                    textAlign: 'center',
                                }}
                            >
                                {error}
                            </p>
                        )}

                        {/* 提交按钮 */}
                        <div style={{ textAlign: 'center' }}>
                            <Button
                                type="primary"
                                size="large"
                                htmlType="submit"
                                loading={loading}
                                style={{ minWidth: 200 }}
                            >
                                <Icon name="icon-miles" size={16} />
                                {loading ? '登录中…' : '🏝️ 登岛'}
                            </Button>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                            <Button
                                type="default"
                                size="large"
                                onClick={() => onGuest?.()}
                                style={{ minWidth: 200 }}
                            >
                                👀 游客浏览
                            </Button>
                        </div>

                        <p style={{ marginTop: 20, fontSize: 12, color: '#a09080' }}>
                            🔒 登录用户可管理菜谱，游客仅可浏览
                        </p>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;
