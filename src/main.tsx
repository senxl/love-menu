import React from 'react';
import ReactDOM from 'react-dom/client';
import 'animal-island-ui/style';
import App from './App';

document.body.style.margin = '0';

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  * {
    box-sizing: border-box;
  }
  *::-webkit-scrollbar { display: none; }
  body {
    font-family: 'Nunito', 'Noto Sans SC', sans-serif;
    background: #f0e6d3;
    min-height: 100vh;
  }

  /* ===== 移动端响应式适配 ===== */
  @media (max-width: 480px) {
    /* 卡片缩略图 80→56 */
    .recipe-thumb { width: 56px !important; height: 56px !important; }
    /* 详情画廊图片 — 全宽展示，在移动端缩小为 90% 宽 */
    .detail-gallery-item { max-width: 90vw !important; }
    /* 弹窗预览图 100→64 */
    .preview-thumb { width: 64px !important; height: 64px !important; }
    /* 缩小弹窗内边距 */
    .modal-body { padding: 16px !important; }
    /* 登录页装饰图标 — 直接覆盖 Icon 组件的 span */
    .login-icon-wrap > span { width: 32px !important; height: 32px !important; }
    /* 主页面标题区文字 */
    .page-title { font-size: 20px !important; }
  }
`;
document.head.appendChild(globalStyle);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
