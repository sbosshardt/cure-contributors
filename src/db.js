const Database = require('better-sqlite3')
const path = require('path')

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = path.resolve(dbPath)
    this.db = null
  }

  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath)
    }
    return this.db
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // Helper method to ensure connection exists during operations
  withConnection(operation) {
    const needsToClose = !this.db
    try {
      const db = this.connect()
      return operation(db)
    } finally {
      if (needsToClose) {
        this.close()
      }
    }
  }

  // Utility method to check if database exists and has correct schema
  validateSchema() {
    return this.withConnection(db => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name IN ('contributions', 'cure_list_voters')
      `).all()
      
      return tables.length === 2
    })
  }
}

module.exports = DatabaseManager