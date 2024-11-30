const path = require('path')
const Database = require('better-sqlite3')
const fs = require('fs')
const XLSX = require('xlsx-js-style')
const csv = require('csv-parser')

const purgeContributions = async (dbFilename) => {
  let db = null
  try {
    const dbPath = path.resolve(dbFilename)
    console.log(`Purging all contributions from database: ${dbPath}`)

    db = new Database(dbPath)

    // Begin transaction
    db.prepare('BEGIN').run()

    try {
      // Delete all records
      const result = db.prepare('DELETE FROM contributions').run()

      // Commit transaction
      db.prepare('COMMIT').run()

      console.log(`Successfully purged ${result.changes} contributions`)
      return 0 // Success
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run()
      throw error
    }
  } catch (error) {
    console.error('Error purging contributions:', error)
    return 1 // Error
  } finally {
    if (db) db.close()
  }
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
        contributor_employer TEXT,
        contributor_occupation TEXT,
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
  let db = null
  try {
    const dbPath = path.resolve(dbFilename)
    const csvPaths = csvFilenames.map((f) => path.resolve(f))

    console.log(
      `Importing contributions from ${csvPaths.length} files into ${dbPath}`,
    )
    db = new Database(dbPath)

    let totalImported = 0

    // Process each CSV file
    for (const csvPath of csvPaths) {
      console.log(`Processing ${csvPath}`)

      // Begin transaction for this file
      db.prepare('BEGIN').run()

      const insertSql = `
        INSERT INTO contributions (
          committee_id,
          committee_name,
          transaction_id,
          file_number,
          contributor_first_name,
          contributor_last_name,
          contributor_street_1,
          contributor_city,
          contributor_state,
          contributor_zip,
          contributor_employer,
          contributor_occupation,
          contribution_receipt_date,
          contribution_receipt_amount,
          link_id,
          memo_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      const insert = db.prepare(insertSql)
      let fileImported = 0

      // Process the file using csv-parser
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(
            csv({
              mapHeaders: ({ header, index }) => {
                // If this is a duplicate header, append the index to make it unique
                if (header === 'committee_name') {
                  return index === 1
                    ? 'committee_name'
                    : 'committee_name_duplicate'
                }
                return header
              },
            }),
          )
          .on('data', (row) => {
            // Debug first row
            if (fileImported === 0) {
              console.log('First row data:', row)
            }

            const values = [
              row.committee_id || '',
              row.committee_name || '',
              row.transaction_id || '',
              row.file_number || '',
              row.contributor_first_name || '',
              row.contributor_last_name || '',
              row.contributor_street_1 || '',
              row.contributor_city || '',
              row.contributor_state || '',
              row.contributor_zip || '',
              row.contributor_employer || '',
              row.contributor_occupation || '',
              row.contribution_receipt_date
                ? row.contribution_receipt_date.split(' ')[0]
                : null,
              parseFloat(row.contribution_receipt_amount) || 0.0,
              row.link_id || '',
              row.memo_text || '',
            ]

            // Insert the row
            insert.run(values)
            fileImported++
          })
          .on('end', () => {
            console.log(
              `Imported ${fileImported} contributions from ${path.basename(csvPath)}`,
            )
            totalImported += fileImported
            resolve()
          })
          .on('error', reject)
      })

      // Commit transaction for this file
      db.prepare('COMMIT').run()
    }

    console.log(`Successfully imported ${totalImported} total contributions`)
    return 0 // Success
  } catch (error) {
    console.error('Error importing contributions:', error)
    if (db) db.prepare('ROLLBACK').run()
    return 1 // Error
  } finally {
    if (db) db.close()
  }
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
    .replace(/\s+[A-Z]{2}\s*$/, '') // Remove state code
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
  const firstNameMatch = withoutSuffix.match(
    /^(?:[^ ,]+ ){0,3}[^ ,]+[, ]+([^, ]+)/,
  )
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
      voter_id: ['av_id', 'voter_id'],
      party: ['party'],
      name: ['name'],
      mailed_to: ['mailed to'],
      city_raw: ['city'],
      phone: ['phone'],
    }

    // First, get the raw data with original headers
    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: '',
      header: 'A',
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
      const matchedHeader = possibleHeaders.find((header) =>
        Object.keys(normalizedHeaders).some(
          (normalizedHeader) =>
            normalizedHeader === header.toLowerCase().trim(),
        ),
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
          lastName,
        ].map((val) => val.toString().trim())

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
  const { displayReportCli, generateHtmlReport } = require('./reporting')
  let db = null
  try {
    const dbPath = path.resolve(dbFilename)
    console.log(`Generating report from database: ${dbPath}`)

    db = new Database(dbPath)

    // Query to find matches between cure list voters and contributions
    const matches = db
      .prepare(
        `
      SELECT DISTINCT
        v.voter_id,
        v.party,
        v.name as voter_name,
        v.mailed_to,
        v.city as voter_city,
        v.phone,
        v.zip_code,
        v.last_name as voter_last_name,
        v.first_name as voter_first_name,
        c.committee_id,
        c.committee_name,
        c.transaction_id,
        c.file_number,
        c.contributor_first_name,
        c.contributor_last_name,
        c.contributor_street_1,
        c.contributor_city,
        c.contributor_state,
        c.contributor_zip,
        c.contributor_employer,
        c.contributor_occupation,
        c.contribution_receipt_date,
        c.contribution_receipt_amount,
        c.link_id,
        c.memo_text
      FROM cure_list_voters v
      JOIN contributions c 
        ON v.last_name = c.contributor_last_name 
        AND v.first_name = c.contributor_first_name
      ORDER BY v.last_name, v.first_name, c.contribution_receipt_date DESC
    `,
      )
      .all()

    // Group contributions by voter
    const groupedMatches = matches.reduce((acc, row) => {
      // Create a unique key for each voter
      const voterKey = `${row.voter_last_name}_${row.voter_first_name}_${row.voter_id}`

      if (!acc[voterKey]) {
        // First time seeing this voter
        acc[voterKey] = {
          voter: {
            last_name: row.voter_last_name,
            first_name: row.voter_first_name,
            zip_code: row.zip_code,
            party: row.party,
            name: row.voter_name,
            mailed_to: row.mailed_to,
            voter_id: row.voter_id,
          },
          contributions: [],
        }
      }

      // Add this contribution to the voter's list
      acc[voterKey].contributions.push({
        contributor_last_name: row.contributor_last_name,
        contributor_first_name: row.contributor_first_name,
        contributor_street_1: row.contributor_street_1,
        committee_name: row.committee_name,
        contribution_receipt_date: row.contribution_receipt_date,
        contributor_employer: row.contributor_employer,
        contributor_occupation: row.contributor_occupation,
        transaction_id: row.transaction_id,
        contribution_receipt_amount: row.contribution_receipt_amount,
      })

      return acc
    }, {})

    // Convert the grouped object back to an array
    const transformedMatches = Object.values(groupedMatches)

    // Always show CLI output
    displayReportCli(transformedMatches)

    // If output file specified, generate HTML
    if (outputFile) {
      const html = generateHtmlReport(transformedMatches)
      fs.writeFileSync(outputFile, html)
      console.log(`Report saved to: ${outputFile}`)
    }

    return 0 // Success
  } catch (error) {
    console.error('Error generating report:', error)
    return 1 // Error
  } finally {
    if (db) db.close()
  }
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
