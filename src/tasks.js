const path = require('path')
const Database = require('better-sqlite3')
const fs = require('fs')
const XLSX = require('xlsx-js-style')

const purgeContributions = async (dbFilename) => {
  console.log(
    `In purgeContributions. Parameters passed to function: dbFilename=${dbFilename}`,
  )
  // Add the actual logic for purging the cure list here

  // Indicate that the task/program should exit with a success status code.
  return 0
}

// Add more shared tasks as needed
const createDb = async (dbFilename) => {
  try {
    // Ensure we have an absolute path
    const dbPath = path.resolve(dbFilename)
    console.log(`Creating/opening database at: ${dbPath}`)

    // Open the database (creates it if it doesn't exist)
    const db = new Database(dbPath)

    // Create tables if they don't exist
    db.exec(`
      -- Contributions table matching CSV structure
      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        committee_id TEXT,
        committee_name TEXT,
        transaction_id TEXT,
        file_number TEXT,
        contributor_first_name TEXT,
        contributor_last_name TEXT,
        contributor_street_1 TEXT,
        contributor_city TEXT,
        contributor_state TEXT,
        contributor_zip TEXT,
        contribution_receipt_date DATE,
        contribution_receipt_amount DECIMAL(10,2),
        link_id TEXT,
        memo_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Cure list voters table matching Excel structure
      CREATE TABLE IF NOT EXISTS cure_list_voters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_id TEXT,
        party TEXT,
        name TEXT,
        mailed_to TEXT,
        city TEXT,
        phone TEXT,
        zip_code TEXT,
        last_name TEXT,
        first_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for faster lookups
      CREATE INDEX IF NOT EXISTS idx_contributor_name 
        ON contributions(contributor_first_name, contributor_last_name);
      CREATE INDEX IF NOT EXISTS idx_contributor_zip 
        ON contributions(contributor_zip);
      CREATE INDEX IF NOT EXISTS idx_voter_id
        ON cure_list_voters(voter_id);
      CREATE INDEX IF NOT EXISTS idx_voter_name 
        ON cure_list_voters(last_name, first_name);
      CREATE INDEX IF NOT EXISTS idx_voter_zip 
        ON cure_list_voters(zip_code);
    `)

    // Close the database connection
    db.close()

    console.log('Database created/verified successfully')
    return 0 // Success
  } catch (error) {
    console.error('Error creating database:', error)
    return 1 // Error
  }
}

const resetDb = async (dbFilename) => {
  try {
    // Ensure we have an absolute path
    const dbPath = path.resolve(dbFilename)

    // Delete the file if it exists
    if (fs.existsSync(dbPath)) {
      console.log(`Deleting existing database at: ${dbPath}`)
      fs.unlinkSync(dbPath)
    }

    // Create new database
    console.log('Creating new database...')
    return await createDb(dbPath)
  } catch (error) {
    console.error('Error resetting database:', error)
    return 1 // Error
  }
}

const importContributions = async (dbFilename, csvFilenames) => {
  console.log(
    `In importContributions. Parameters passed to function: csvFilenames=${csvFilenames}, dbFilename=${dbFilename}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

const importCureList = async (dbFilename, excelFile) => {
  try {
    // Ensure we have absolute paths
    const dbPath = path.resolve(dbFilename)
    const excelPath = path.resolve(excelFile)
    
    console.log(`Importing cure list from ${excelPath} into ${dbPath}`)

    // Read the Excel file
    const workbook = XLSX.readFile(excelPath)
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with header mapping
    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false, // Convert everything to strings
      defval: '', // Default value for empty cells
      header: [
        'voter_id',
        'party',
        'name',
        'mailed_to',
        'city',
        'phone',
        'zip_code',
        'last_name',
        'first_name'
      ]
    })

    // Open database connection
    const db = new Database(dbPath)

    try {
      // Begin transaction
      db.prepare('BEGIN').run()

      // Prepare insert statement
      const insert = db.prepare(`
        INSERT INTO cure_list_voters (
          voter_id,
          party,
          name,
          mailed_to,
          city,
          phone,
          zip_code,
          last_name,
          first_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      // Skip header row if it exists (check if first row contains headers)
      const startIndex = rows[0].voter_id.toLowerCase() === 'voter_id' ? 1 : 0

      // Insert each row
      let importedCount = 0
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i]
        insert.run(
          row.voter_id,
          row.party,
          row.name,
          row.mailed_to,
          row.city,
          row.phone,
          row.zip_code,
          row.last_name,
          row.first_name
        )
        importedCount++
      }

      // Commit transaction
      db.prepare('COMMIT').run()

      console.log(`Successfully imported ${importedCount} voters`)
      return 0 // Success
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run()
      throw error
    } finally {
      // Close database connection
      db.close()
    }
  } catch (error) {
    console.error('Error importing cure list:', error)
    return 1 // Error
  }
}

const generateReport = async (dbFilename, outputFile) => {
  console.log(
    `In generateReport. Parameters passed to function: dbFilename=${dbFilename}, outputFile=${outputFile}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

function handleCliCommands(args) {
  const { Command } = require('commander')
  const program = new Command()

  // Set up your commands
  program.version(require('../package.json').version)
  // ... rest of your command setup ...

  program.parse(['node', 'cure-contributors', ...args])
}

module.exports = {
  createDb,
  resetDb,
  importContributions,
  importCureList,
  generateReport,
  purgeContributions,
  handleCliCommands,
}
