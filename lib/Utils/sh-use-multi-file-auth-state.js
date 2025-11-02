"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shUseMultiFileAuthState = void 0;

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { proto } = require("../../WAProto");
const { initAuthCreds } = require("./auth-utils");
const { BufferJSON } = require("./generics");

const shUseMultiFileAuthState = async (folder) => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const dbPath = path.join(folder, "session.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); 

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_state (
      category TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (category, id)
    );
  `);

  const safeParse = (json) => {
    try {
      const obj = JSON.parse(json, BufferJSON.reviver);
      if (obj && typeof obj === "object") return obj;
    } catch {}
    return null;
  };

  const writeData = (category, id, data) => {
    try {
      const json = JSON.stringify(data, BufferJSON.replacer);
      db.prepare(
        `INSERT OR REPLACE INTO auth_state (category, id, data) VALUES (?, ?, ?)`
      ).run(category, id, json);
    } catch (err) {
      console.error(`[AuthState:WriteError] ${category}:${id}`, err);
    }
  };

  const readData = (category, id) => {
    try {
      const row = db
        .prepare(`SELECT data FROM auth_state WHERE category=? AND id=?`)
        .get(category, id);
      return row ? safeParse(row.data) : null;
    } catch (err) {
      console.error(`[AuthState:ReadError] ${category}:${id}`, err);
      return null;
    }
  };

  const readCategory = (category) => {
    const result = {};
    try {
      const rows = db
        .prepare(`SELECT id, data FROM auth_state WHERE category=?`)
        .all(category);
      for (const row of rows) {
        const parsed = safeParse(row.data);
        if (parsed) result[row.id] = parsed;
        else console.warn(`[AuthState:CorruptRow] ${category}:${row.id} skipped`);
      }
    } catch (err) {
      console.error(`[AuthState:CategoryReadError] ${category}`, err);
    }
    return result;
  };

  const removeData = (category, id) => {
    try {
      db.prepare(`DELETE FROM auth_state WHERE category=? AND id=?`).run(category, id);
    } catch (err) {
      console.error(`[AuthState:RemoveError] ${category}:${id}`, err);
    }
  };

  const migrateOldFiles = () => {
    const files = fs.readdirSync(folder);
    const migrated = [];

    for (const file of files) {
      if (!file.endsWith(".json") || file === "creds.json") continue;
      const match = /^([a-zA-Z0-9_-]+)-(.+)\.json$/.exec(file);
      if (match) {
        const [, category, id] = match;
        try {
          const content = fs.readFileSync(path.join(folder, file), "utf-8");
          const parsed = safeParse(content);
          if (parsed) {
            writeData(category, id, parsed);
            migrated.push(file);
          }
          fs.unlinkSync(path.join(folder, file));
        } catch (err) {
          console.error(`[AuthState:MigrateError] ${file}`, err);
        }
      }
    }

    if (migrated.length > 0) {
      console.log(`[AuthState] Migrated ${migrated.length} old JSON files → session.db`);
    }
  };

  migrateOldFiles();

  const creds = readData("creds", "main") || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const all = readCategory(type);
          const data = {};
          for (const id of ids) {
            let value = all[id];
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          db.transaction(() => {
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                if (value) writeData(category, id, value);
                else removeData(category, id);
              }
            }
          })();
        },
      },
    },
    saveCreds: () => writeData("creds", "main", creds),
  };
};

exports.shUseMultiFileAuthState = shUseMultiFileAuthState;