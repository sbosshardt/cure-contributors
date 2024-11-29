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

// Helper function to extract ZIP code from city string
const extractZipCode = (cityStr) => {
  const match = cityStr.match(/\b\d{5}\b/)
  return match ? match[0] : ''
}

// Helper function to clean city string (remove ZIP and state)
const cleanCity = (cityStr) => {
  return cityStr
    .replace(/\b\d{5}(-\d{4})?\b/, '') // Remove ZIP code
    .replace(/\s+[A-Z]{2}\s*$/, '')    // Remove state code
    .trim()
}

// Helper function to parse name
const parseName = (fullName) => {
  // First, handle suffixes by removing them
  const withoutSuffix = fullName.replace(/ (JR|SR|II|III|IV|V),/, ',')
  
  // Extract last name (first part before comma)
  const lastNameMatch = withoutSuffix.match(/^(?:[^ ,]+ )?([^ ,]+),/)
  const lastName = lastNameMatch ? lastNameMatch[1] : ''
  
  // Extract first name (first word after comma)
  const firstNameMatch = withoutSuffix.match(/^(?:[^ ,]+ ){0,3}[^ ,]+[, ]+([^, ]+)/)
  const firstName = firstNameMatch ? firstNameMatch[1] : ''
  
  return { firstName, lastName }
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

    // Define column mapping (Excel header -> DB column)
    const columnMapping = {
      'voter_id': ['av_id', 'voter_id'],
      'party': ['party'],
      'name': ['name'],
      'mailed_to': ['mailed to'],
      'city_raw': ['city'],
      'phone': ['phone'],
    }
    
    // First, get the raw data with original headers
    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: '',
      header: 'A'
    })

    if (rows.length === 0) {
      console.error('No data found in Excel file')
      return 1
    }

    // Get headers from first row and normalize them
    const headerRow = rows[0]
    const normalizedHeaders = {}
    Object.entries(headerRow).forEach(([key, value]) => {
      // Normalize by converting to lowercase and removing all extra spaces
      const normalized = value.toLowerCase().trim()
      normalizedHeaders[normalized] = key
    })
    console.log('Normalized headers:', normalizedHeaders)

    // Create a mapping from Excel columns to DB columns
    const headerToDbColumn = {}
    const columnToExcelKey = {}
    for (const [dbColumn, possibleHeaders] of Object.entries(columnMapping)) {
      // Find matching header, ignoring spaces and case
      const matchedHeader = possibleHeaders.find(header => 
        Object.keys(normalizedHeaders).some(normalizedHeader => 
          normalizedHeader === header.toLowerCase().trim()
        )
      )
      if (matchedHeader) {
        const normalizedMatch = matchedHeader.toLowerCase().trim()
        const excelKey = normalizedHeaders[normalizedMatch]
        headerToDbColumn[dbColumn] = excelKey
        columnToExcelKey[dbColumn] = excelKey
      }
    }

    console.log('Column mapping:', columnToExcelKey)

    // Open database connection
    const db = new Database(dbPath)

    try {
      // Begin transaction
      db.prepare('BEGIN').run()

      // Create insert statement with all fields
      const insertSql = `
        INSERT INTO cure_list_voters (
          voter_id,
          party,
          name,
          mailed_to,
          city,
          phone,
          zip_code,
          first_name,
          last_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      console.log('SQL:', insertSql)

      const insert = db.prepare(insertSql)

      // Insert each row (skipping header)
      let importedCount = 0
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        
        // Extract city and ZIP from the combined field
        const cityField = row[headerToDbColumn['city_raw']] || ''
        const zipCode = extractZipCode(cityField)
        const city = cleanCity(cityField)

        // Parse name into first and last
        const fullName = row[headerToDbColumn['name']] || ''
        const { firstName, lastName } = parseName(fullName)

        // Debug: show the first data row
        if (importedCount === 0) {
          console.log('First row data:', row)
          console.log('Raw city field:', cityField)
          console.log('Extracted city:', city)
          console.log('Extracted ZIP:', zipCode)
          console.log('Full name:', fullName)
          console.log('Parsed name:', { firstName, lastName })
        }

        const values = [
          row[headerToDbColumn['voter_id']] || '',
          row[headerToDbColumn['party']] || '',
          row[headerToDbColumn['name']] || '',
          row[headerToDbColumn['mailed_to']] || '',
          city,
          row[headerToDbColumn['phone']] || '',
          zipCode,
          firstName,
          lastName
        ].map(val => val.toString().trim())
        
        if (importedCount === 0) {
          console.log('Extracted values:', values)
        }
        
        insert.run(...values)
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
