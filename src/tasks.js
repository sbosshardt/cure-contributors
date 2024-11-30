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
      CREATE INDEX IF NOT EXISTS idx_contributor_name_zip 
        ON contributions(contributor_first_name, contributor_last_name, contributor_zip);
      CREATE INDEX IF NOT EXISTS idx_contributor_street_1 
        ON contributions(contributor_street_1);
      CREATE INDEX IF NOT EXISTS idx_voter_id
        ON cure_list_voters(voter_id);
      CREATE INDEX IF NOT EXISTS idx_voter_name 
        ON cure_list_voters(last_name, first_name);
      CREATE INDEX IF NOT EXISTS idx_voter_zip 
        ON cure_list_voters(zip_code);
      CREATE INDEX IF NOT EXISTS idx_voter_name_zip 
        ON cure_list_voters(last_name, first_name, zip_code);
      CREATE INDEX IF NOT EXISTS idx_voter_mailed_to 
        ON cure_list_voters(mailed_to);
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
              formatZipCode(row.contributor_zip),
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

const importCureList = async (dbFilename, xlsxFile) => {
  let db = null
  try {
    const dbPath = path.resolve(dbFilename)
    console.log(`Importing cure list from ${xlsxFile} into ${dbPath}`)

    // Read the Excel file
    const workbook = XLSX.readFile(xlsxFile)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      throw new Error('No data found in Excel file')
    }

    // Detect format based on headers (case-insensitive)
    const firstRow = data[0]
    const headers = Object.keys(firstRow).map((h) => h.toLowerCase())
    const isNewFormat =
      headers.includes('firstname') && headers.includes('lastname')

    // Find voter ID field if it exists (look for 'regid' in any header)
    const voterIdField = Object.keys(firstRow).find((header) =>
      header.toLowerCase().includes('regid'),
    )
    console.log(
      `Detected format: ${isNewFormat ? 'new' : 'original'}${voterIdField ? `, using ${voterIdField} for voter ID` : ''}`,
    )

    db = new Database(dbPath)
    db.prepare('BEGIN').run()

    try {
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

      let imported = 0
      for (const row of data) {
        if (isNewFormat) {
          // New format with separate name fields
          const values = [
            voterIdField ? row[voterIdField] || '' : null, // Use found voter ID field if it exists
            null, // party (not available)
            `${row.lastname || row.LastName}, ${row.firstname || row.FirstName}`,
            row.registrationaddr1 || row.RegistrationAddr1 || '',
            null, // city (not available)
            null, // phone (not available)
            formatZipCode(row.regzip5 || row.RegZip5),
            row.lastname || row.LastName || '',
            row.firstname || row.FirstName || '',
          ]
          insert.run(values)
        } else {
          // Original format with name parsing
          // const nameParts = (row.Name || '').split(',').map(part => part.trim())
          // const lastName = nameParts[0] || ''
          // const firstName = nameParts[1] || ''
          const { lastName, firstName } = parseName(row.Name)

          // Extract zip code from address - try multiple patterns
          let zipCode = ''
          //const mailedTo = row['Mailed To'] || ''
          const cityStateZip = row.City || ''

          // First try to find a 5-digit sequence
          const zipMatch = cityStateZip.match(/\b\d{5}\b/)
          if (zipMatch) {
            zipCode = zipMatch[0]
          } else {
            // If no 5-digit sequence, try to find any sequence of 4-5 digits at the end
            const looseMatch = cityStateZip.match(/\b\d{4,5}$/)
            zipCode = looseMatch ? looseMatch[0].padStart(5, '0') : ''
          }

          const values = [
            row['Voter ID'] || '',
            row.Party || '',
            row.Name || '',
            row['Mailed To'] || '',
            row.City || '',
            row.Phone || '',
            formatZipCode(zipCode),
            lastName,
            firstName,
          ]
          insert.run(values)
        }
        imported++
      }

      db.prepare('COMMIT').run()
      console.log(`Successfully imported ${imported} cure list voters`)
      return 0 // Success
    } catch (error) {
      db.prepare('ROLLBACK').run()
      throw error
    }
  } catch (error) {
    console.error('Error importing cure list:', error)
    return 1 // Error
  } finally {
    if (db) db.close()
  }
}

const generateReport = async (dbFilename, outputFile, debug = false) => {
  const { generateReport: gr } = require('./reporting.js')
  return gr(dbFilename, outputFile, debug)
}

// Add this helper function
const formatZipCode = (zip) => {
  if (!zip) return ''
  // Convert to string, remove any non-digits, take first 5 digits
  return String(zip).replace(/\D/g, '').slice(0, 5).padStart(5, '0')
}

const purgeCureList = async (dbFilename) => {
  let db = null
  try {
    const dbPath = path.resolve(dbFilename)
    console.log(`Purging all cure list voters from database: ${dbPath}`)

    db = new Database(dbPath)

    // Begin transaction
    db.prepare('BEGIN').run()

    try {
      // Delete all records
      const result = db.prepare('DELETE FROM cure_list_voters').run()

      // Commit transaction
      db.prepare('COMMIT').run()

      console.log(`Successfully purged ${result.changes} cure list voters`)
      return 0 // Success
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run()
      throw error
    }
  } catch (error) {
    console.error('Error purging cure list:', error)
    return 1 // Error
  } finally {
    if (db) db.close()
  }
}

module.exports = {
  createDb,
  resetDb,
  importContributions,
  importCureList,
  generateReport,
  purgeContributions,
  purgeCureList,
}
