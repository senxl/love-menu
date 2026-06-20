import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'recipes.db');

let db = null;

export async function getDb() {
    if (db) return db;

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT    NOT NULL UNIQUE,
            password    TEXT    NOT NULL,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
            id          TEXT    PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            category    TEXT    NOT NULL DEFAULT 'other',
            ingredients TEXT    NOT NULL DEFAULT '',
            steps       TEXT    NOT NULL DEFAULT '',
            notes       TEXT    NOT NULL DEFAULT '',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    try {
        db.run("ALTER TABLE recipes ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
    } catch {
        // 列已存在则忽略
    }

    db.run('PRAGMA foreign_keys = ON');
    saveDb();

    return db;
}

export function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}
