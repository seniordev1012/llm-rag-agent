const { fileData } = require("../utils/files");
const { v4: uuidv4 } = require("uuid");
const { getVectorDbClass } = require("../utils/helpers");
const { checkForMigrations } = require("../utils/database");

const Document = {
  tablename: "workspace_documents",
  colsInit: `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  docId TEXT NOT NULL UNIQUE,  
  filename TEXT NOT NULL,
  docpath TEXT NOT NULL,
  workspaceId INTEGER NOT NULL,
  metadata TEXT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  lastUpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  `,
  migrateTable: async function () {
    console.log(`\x1b[34m[MIGRATING]\x1b[0m Checking for Document migrations`);
    const db = await this.db(false);
    await checkForMigrations(this, db);
  },
  migrations: function () {
    return [];
  },
  db: async function (tracing = true) {
    const sqlite3 = require("sqlite3").verbose();
    const { open } = require("sqlite");

    const db = await open({
      filename: `${
        !!process.env.STORAGE_DIR ? `${process.env.STORAGE_DIR}/` : "storage/"
      }anythingllm.db`,
      driver: sqlite3.Database,
    });

    await db.exec(
      `CREATE TABLE IF NOT EXISTS ${this.tablename} (${this.colsInit})`
    );

    if (tracing) db.on("trace", (sql) => console.log(sql));
    return db;
  },
  forWorkspace: async function (workspaceId = null) {
    if (!workspaceId) return [];
    return await this.where(`workspaceId = ${workspaceId}`);
  },
  delete: async function (clause = "") {
    const db = await this.db();
    await db.get(`DELETE FROM ${this.tablename} WHERE ${clause}`);
    db.close();
    return true;
  },
  where: async function (clause = "", limit = null) {
    const db = await this.db();
    const results = await db.all(
      `SELECT * FROM ${this.tablename} ${clause ? `WHERE ${clause}` : ""} ${
        !!limit ? `LIMIT ${limit}` : ""
      }`
    );

    db.close();
    return results;
  },
  firstWhere: async function (clause = "") {
    const results = await this.where(clause);
    return results.length > 0 ? results[0] : null;
  },
  addDocuments: async function (workspace, additions = []) {
    const VectorDb = getVectorDbClass();
    if (additions.length === 0) return;

    const db = await this.db();
    const stmt = await db.prepare(
      `INSERT INTO ${this.tablename} (docId, filename, docpath, workspaceId, metadata) VALUES (?,?,?,?,?)`
    );
    for (const path of additions) {
      const data = await fileData(path);
      if (!data) continue;

      const docId = uuidv4();
      const { pageContent, ...metadata } = data;
      const newDoc = {
        docId,
        filename: path.split("/")[1],
        docpath: path,
        workspaceId: Number(workspace.id),
        metadata: JSON.stringify(metadata),
      };
      const vectorized = await VectorDb.addDocumentToNamespace(
        workspace.slug,
        { ...data, docId },
        path
      );
      if (!vectorized) {
        console.error("Failed to vectorize", path);
        continue;
      }
      stmt.run([
        docId,
        newDoc.filename,
        newDoc.docpath,
        newDoc.workspaceId,
        newDoc.metadata,
      ]);
    }
    stmt.finalize();
    db.close();

    return;
  },
  removeDocuments: async function (workspace, removals = []) {
    const VectorDb = getVectorDbClass();

    if (removals.length === 0) return;
    const db = await this.db();
    const stmt = await db.prepare(
      `DELETE FROM ${this.tablename} WHERE docpath = ? AND workspaceId = ?`
    );
    for (const path of removals) {
      const document = await this.firstWhere(
        `docPath = '${path}' AND workspaceId = ${workspace.id}`
      );
      if (!document) continue;
      await VectorDb.deleteDocumentFromNamespace(
        workspace.slug,
        document.docId
      );
      stmt.run([path, workspace.id]);
    }
    stmt.finalize();
    db.close();
    return true;
  },
};

module.exports = { Document };
