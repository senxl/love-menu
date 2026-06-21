# 🍳 菜谱小岛 (Recipe Island)

一个温馨可爱的私房菜谱管理分享应用。用户可以在自己的"小岛"上记录、分类、管理菜谱，并生成分享链接给朋友。

## ✨ 功能特性

### 📝 菜谱管理
- **添加菜谱** — 填写名称、分类、食材清单、制作步骤、备注
- **上传图片** — 每道菜最多 9 张图片，支持 jpg/png/gif/webp/bmp
- **编辑菜谱** — 随时修改已保存的菜谱
- **删除菜谱** — 一键删除，关联图片自动清理
- **自定义分类** — 除内置分类外，支持创建带 emoji 的自定义分类

### 🔍 浏览与查找
- **网格/列表视图** — 两种浏览模式，自动记住偏好
- **分类筛选** — 按内置分类或自定义分类快速筛选
- **全文搜索** — 搜索菜谱名称、食材、备注
- **渐进加载** — 滚动自动加载更多，体验流畅

### 🔗 分享功能
- **生成分享链接** — 一键分享菜谱给朋友（支持 Web Share API）
- **分享页** — 无需登录即可查看分享的菜谱（含作者信息）

### 👤 用户系统
- **注册/登录** — 用户名+密码认证
- **游客浏览** — 无需登录即可浏览所有菜谱
- **密码加密** — 使用 bcryptjs 安全存储
- **后端鉴权** — 所有写操作（增/删/改/上传）验证用户身份，游客/未登录用户无法操作

### ⚙️ 管理后台
- **独立入口** — 通过 `?admin=1` URL 参数访问
- **密码保护** — 独立的管理员密码登录
- **用户管理** — 查看用户列表、添加用户、修改密码、删除用户（连带菜谱）
- **菜谱管理** — 查看所有菜谱（含作者）、添加菜谱（为任意用户）、编辑菜谱、删除菜谱

### 🎨 界面特点
- 温暖手绘风格 UI（基于 `animal-island-ui`）
- 响应式适配移动端
- 全中文界面与提示
- 菜谱卡片图片背景沉浸展示
- 详情页显示菜谱作者

## 🏗️ 技术栈

| 层次 | 技术 |
|------|------|
| **前端框架** | React 18 + TypeScript |
| **构建工具** | Vite 5 |
| **UI 组件库** | animal-island-ui |
| **后端** | Node.js + Express |
| **数据库** | SQLite（sql.js） |
| **认证** | bcryptjs（密码哈希） |
| **文件上传** | multer（图片存储） |

## 📁 项目结构

```
love-menu/
├── index.html                # 前端入口 HTML
├── package.json              # 前端依赖配置
├── vite.config.ts            # Vite 配置（含 API 代理）
├── tsconfig.json             # TypeScript 配置
├── .gitignore
├── README.md
├── src/                      # 前端源码
│   ├── main.tsx              # 应用入口
│   ├── App.tsx               # 根组件（路由/登录态管理）
│   ├── types.ts              # 类型定义 & 分类常量
│   ├── storage.ts            # API 调用封装
│   └── components/
│       ├── LoginPage.tsx         # 登录/注册页
│       ├── RecipeApp.tsx         # 主页面（菜谱列表/详情）
│       ├── RecipeCard.tsx        # 菜谱卡片（网格视图）
│       ├── AddRecipeModal.tsx    # 添加/编辑菜谱弹窗
│       ├── SharedRecipePage.tsx  # 分享查看页
│       └── AdminPage.tsx         # 管理后台
└── server/                   # 后端
    ├── index.js              # Express 服务（API 路由）
    ├── admin.js              # 管理后台 API
    ├── db.js                 # SQLite 数据库初始化
    ├── package.json          # 后端依赖配置
    └── uploads/              # 图片上传存储目录
```

## 🚀 快速启动

### 前置要求

- Node.js >= 18
- npm

### 1️⃣ 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
npm --prefix server install
```

### 2️⃣ 启动服务

```bash
# 启动后端 API（端口 3001）
npm --prefix server start

# 启动前端开发服务器（端口 5173）
npm run dev
```

Vite 会自动将 `/api/*` 和 `/uploads/*` 请求代理到后端 `localhost:3001`。

### 3️⃣ 打开浏览器

访问 `http://localhost:5173/`

- 新用户：输入用户名和密码自动注册并登录
- 已有账号：直接登录
- 游客：点击「游客浏览」无需登录

## 📸 功能预览

### 登录页
输入玩家名称和密码即可登岛，或选择游客浏览模式。

### 主页面
- 顶部：小岛标题、菜谱数量、用户信息、退出按钮
- 搜索栏：按名称/食材/备注搜索
- 分类标签：内置分类 + 自定义分类
- 视图切换：网格/列表，偏好自动保存
- 菜谱卡片：网格视图显示缩略图，列表视图以图片为背景

### 菜谱详情
点击卡片进入全屏详情页，展示：
- 菜谱名称与分类
- 居中大图展示（多张纵向排列）
- 食材清单、制作步骤、备注
- 作者信息与创建时间
- 分享/编辑/删除操作

### 添加/编辑菜谱
全屏弹窗表单，支持：
- 菜谱名称（必填）
- 分类选择（内置 + 已有自定义 + 新建自定义）
- 多图上传（最多 9 张）
- 食材清单（必填）
- 制作步骤（必填）
- 备注（可选）

### ⚙️ 管理后台

访问 `http://localhost:5173/?admin=1` 进入。

**👤 用户管理**
| 操作 | 说明 |
|------|------|
| 查看 | 所有注册用户列表（ID、用户名、注册时间） |
| 添加 | 创建新用户（用户名 + 密码） |
| 修改密码 | 重置任意用户的密码 |
| 删除 | 删除用户及其所有菜谱 |

**🍳 菜谱管理**
| 操作 | 说明 |
|------|------|
| 查看 | 所有菜谱列表（名称、作者、分类、食材预览、图片数、时间） |
| 添加 | 为任意用户创建菜谱 |
| 编辑 | 修改菜谱的名称、分类、食材、步骤、备注 |
| 删除 | 删除菜谱及关联图片 |

> 默认管理员密码：`admin888`（可在 `server/admin.js` 中修改）

## 🗂️ 分类系统

内置分类：

| 标识 | 名称 |
|------|------|
| `main` | 🍚 主食 |
| `dessert` | 🍰 甜品 |
| `soup` | 🥣 汤品 |
| `drink` | 🥤 饮品 |
| `appetizer` | 🥗 凉菜/前菜 |
| `other` | 🍳 其他 |

支持创建**自定义分类**，可带 emoji 图标（如：🥬 小小、🧆 空气炸锅）。

## 🔒 安全机制

- **用户密码** — bcrypt 加盐哈希存储
- **API 鉴权** — 所有写操作（添加/编辑/删除/上传）需验证有效 `userId`
- **游客隔离** — 游客（`userId=0`）被后端拒绝所有写操作
- **管理后台** — 独立密码保护，Token 存储在 `sessionStorage`

## 📡 API 接口

### 公开 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/register` | 用户注册 |
| POST | `/api/login` | 用户登录 |
| GET | `/api/recipes` | 获取菜谱列表（支持 `?userId=` 筛选） |
| GET | `/api/recipes/:id` | 获取单个菜谱（含作者信息） |

### 需认证 API（需 body 中携带有效 `userId`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/recipes` | 添加菜谱 |
| PUT | `/api/recipes/:id` | 更新菜谱 |
| DELETE | `/api/recipes/:id` | 删除菜谱 |
| POST | `/api/upload` | 上传图片（multipart） |
| DELETE | `/api/upload/:filename` | 删除图片 |

### 管理 API（需 `x-admin-token` 头）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/users` | 获取所有用户 |
| POST | `/api/admin/users` | 创建用户 |
| PUT | `/api/admin/users/:id/password` | 修改用户密码 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| GET | `/api/admin/recipes` | 获取所有菜谱 |
| POST | `/api/admin/recipes` | 添加菜谱 |
| PUT | `/api/admin/recipes/:id` | 编辑菜谱 |
| DELETE | `/api/admin/recipes/:id` | 删除菜谱 |

## 🧩 开发

```bash
# 启动后端（支持 --watch 热重载）
npm --prefix server run dev

# 启动前端
npm run dev

# TypeScript 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build
```

## 📄 开源协议

MIT
