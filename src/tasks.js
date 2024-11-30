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

// Add name variations map
const NAME_VARIATIONS = {
  'robert': ['bob', 'rob', 'bobby', 'bert'],
  'william': ['will', 'bill', 'billy', 'willie', 'liam'],
  'richard': ['rick', 'dick', 'richie', 'ricky'],
  'james': ['jim', 'jimmy', 'jamie'],
  'john': ['jack', 'johnny', 'jon'],
  'margaret': ['maggie', 'meg', 'peggy', 'marge', 'margie'],
  'elizabeth': ['beth', 'liz', 'betty', 'lizzy', 'eliza', 'lisa', 'betsy'],
  'katherine': ['kathy', 'kate', 'katie', 'katy', 'kay'], // 'kit' removed due to conflict with 'christopher'
  'michael': ['mike', 'mikey', 'mick', 'mickey'],
  'christopher': ['chris', 'topher'], // 'kit' removed due to conflict with 'katherine'
  'joseph': ['joe', 'joey', 'jos'],
  'daniel': ['dan', 'danny', 'dani'],
  'anthony': ['tony', 'ant'],
  'benjamin': ['ben', 'benji', 'benny'],
  'charles': ['chuck', 'charlie', 'chas'],
  'david': ['dave', 'davey'],
  'donald': ['don', 'donny'],
  'edward': ['ed', 'eddie', 'ted', 'ned'],
  'francis': ['frank', 'frankie'],
  'george': ['georgie'],
  'gerald': ['gerry', 'jerry'],
  'gregory': ['greg', 'gregg'],
  'jennifer': ['jen', 'jenny', 'jenn'],
  'kenneth': ['ken', 'kenny'],
  'lawrence': ['larry', 'lars'],
  'matthew': ['matt', 'matty'],
  'nicholas': ['nick', 'nicky'],
  'patricia': ['patty', 'trish'],// 'pat' removed due to conflict with 'patrick'
  'patrick': ['paddy'], // 'pat' removed due to conflict with 'patricia'
  'peter': ['pete', 'petey'],
  'raymond': ['ray', 'raymon'],
  'ronald': ['ron', 'ronnie'],
  'samuel': ['sam', 'sammy'],
  'sandra': ['sandy'],
  'stephen': ['steve', 'steven', 'steph'],
  'susan': ['sue', 'susie', 'suzy'],
  'thomas': ['tom', 'tommy'],
  'timothy': ['tim', 'timmy'],
  'victoria': ['vicki', 'vicky'],
  'virginia': ['ginny', 'ginger']
}

// Validate name variation mappings
function validateNameMappings() {
  const errors = []
  const allVariations = new Set()

  // Check for duplicate variations
  for (const [standard, variations] of Object.entries(NAME_VARIATIONS)) {
    // Ensure standard name isn't used as a variation elsewhere
    if (allVariations.has(standard)) {
      errors.push(`Standard name "${standard}" is used as a variation in another mapping`)
    }

    // Check for duplicate variations across different standard names
    variations.forEach(variation => {
      if (allVariations.has(variation)) {
        errors.push(`Variation "${variation}" is mapped to multiple standard names`)
      }
      allVariations.add(variation)
    })

    // Check for variations matching their standard name
    if (variations.includes(standard)) {
      errors.push(`Standard name "${standard}" appears in its own variation list`)
    }

    // Validate variation format
    variations.forEach(variation => {
      if (typeof variation !== 'string') {
        errors.push(`Invalid variation type for "${standard}": ${typeof variation}`)
      }
      if (!variation.trim()) {
        errors.push(`Empty variation found for "${standard}"`)
      }
      if (variation !== variation.toLowerCase()) {
        errors.push(`Variation "${variation}" for "${standard}" should be lowercase`)
      }
    })
  }

  return errors
}

// Input validation for normalization functions
function validateAddressInput(addr) {
  if (addr === undefined || addr === null) {
    return ''
  }
  if (typeof addr !== 'string') {
    throw new Error(`Address must be a string, got ${typeof addr}`)
  }
  return addr
}

function validateNameInput(name) {
  if (name === undefined || name === null) {
    return ''
  }
  if (typeof name !== 'string') {
    throw new Error(`Name must be a string, got ${typeof name}`)
  }
  return name
}

// Update the helper functions to use validation
function normalizeAddress(addr, debug = false) {
  addr = validateAddressInput(addr)
  if (!addr) return ''
  
  const steps = []
  let normalized = addr.toLowerCase()
  steps.push({ step: 'lowercase', result: normalized })

  // Standardize common abbreviations
  const streetTypes = {
    'street|str': 'st',
    'avenue|ave': 'av',
    'road': 'rd',
    'drive': 'dr',
    'lane': 'ln',
    'court': 'ct',
    'circle': 'cir',
    'boulevard|blvd': 'bl',
    'place': 'pl',
    'terrace|ter': 'tr',
    'highway|hwy': 'hw',
    'parkway|pkwy': 'pw',
  }

  for (const [pattern, replacement] of Object.entries(streetTypes)) {
    const regex = new RegExp(`\\b(${pattern})\\b`, 'g')
    if (normalized.match(regex)) {
      normalized = normalized.replace(regex, replacement)
      steps.push({ step: `standardize ${pattern}`, result: normalized })
    }
  }

  // Remove unit/apt numbers
  normalized = normalized.replace(/\b(unit|apt|apartment|suite|ste|#)\s*[\w-]+\b/gi, '')
  steps.push({ step: 'remove units', result: normalized })

  // Remove all punctuation and spaces
  normalized = normalized.replace(/[.,#\s-]+/g, '')
  steps.push({ step: 'remove punctuation', result: normalized })

  if (debug) {
    console.log('Address normalization steps:', steps)
  }

  return normalized
}

function normalizeName(name, debug = false) {
  name = validateNameInput(name)
  if (!name) return ''
  
  const steps = []
  let normalized = name.toLowerCase().trim()
  steps.push({ step: 'lowercase and trim', result: normalized })

  // Check for name variations
  for (const [standard, variations] of Object.entries(NAME_VARIATIONS)) {
    if (variations.includes(normalized)) {
      normalized = standard
      steps.push({ step: 'name variation', result: normalized, note: `mapped from ${name} to ${standard}` })
      break
    }
  }

  // Remove common suffixes
  normalized = normalized.replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
  steps.push({ step: 'remove suffixes', result: normalized })

  // Remove all punctuation
  normalized = normalized.replace(/[.,'-]+/g, '')
  steps.push({ step: 'remove punctuation', result: normalized })

  if (debug) {
    console.log('Name normalization steps:', steps)
  }

  return normalized
}

// Add validation to the test runner
function runNormalizationTests() {
  console.log('Running normalization tests...\n')

  // First run name mapping validation
  const nameMapErrors = validateNameMappings()
  if (nameMapErrors.length > 0) {
    console.error('Name mapping validation errors:')
    nameMapErrors.forEach(error => console.error(`- ${error}`))
    throw new Error('Name mapping validation failed')
  }
  console.log('Name mapping validation passed\n')

  // Add input validation tests
  console.log('Running input validation tests...')
  try {
    normalizeAddress(null)
    normalizeAddress(undefined)
    normalizeAddress(123) // Should throw
  } catch (e) {
    console.log('Address validation caught invalid input:', e.message)
  }

  try {
    normalizeName(null)
    normalizeName(undefined)
    normalizeName({}) // Should throw
  } catch (e) {
    console.log('Name validation caught invalid input:', e.message)
  }

  // Continue with existing tests...
  const addressTests = [
    '123 Main Street Apt 4B',
    '123 Main St.',
    '123 Main St Unit 4B',
    '456 Oak Avenue',
    '789 Washington Blvd.',
    '321 Park Road #5',
    '1234 N. Highland Avenue Suite 100',
    '567 South Oak Street Apartment 2C',
    '890 West Lake Boulevard Unit B',
    '432 East 9th Street #12-B',
    '765 Mountain View Terrace Apt. 3',
    '543 Sunset Drive West',
    '678 Cherry Lane South, Unit 4',
    '987 River Road N.W.',
    '654 Forest Parkway, Suite 200'
  ]

  const nameTests = [
    'Robert Smith Jr.',
    'Bob Smith',
    'Elizabeth Jones-Taylor',
    'Betty Jones',
    'William Johnson III',
    'Bill Johnson',
    'Katherine Marie O\'Brien',
    'Katie O\'Brien',
    'Christopher J. Williams Sr.',
    'Chris Williams',
    'Margaret Ann Miller-Davis',
    'Peggy Miller',
    'Michael Robert Brown II',
    'Mike Brown',
    'Jennifer Lynn Davis-Wilson',
    'Jenny Wilson',
    'Thomas Andrew McCarthy Jr.',
    'Tom McCarthy',
    'Patricia Ellen O\'Connor',
    'Patty O\'Connor'
  ]

  console.log('Address Normalization Tests:')
  addressTests.forEach(addr => {
    console.log(`\nOriginal: "${addr}"`)
    normalizeAddress(addr, true)
  })

  console.log('\nName Normalization Tests:')
  nameTests.forEach(name => {
    console.log(`\nOriginal: "${name}"`)
    normalizeName(name, true)
  })
}

// Update generateReport to include validation
const generateReport = async (dbFilename, outputFile, debug = false) => {
  try {
    // Run validation checks in debug mode
    if (debug) {
      const nameMapErrors = validateNameMappings()
      if (nameMapErrors.length > 0) {
        console.error('Name mapping validation errors:')
        nameMapErrors.forEach(error => console.error(`- ${error}`))
        throw new Error('Name mapping validation failed')
      }
      console.log('Name mapping validation passed\n')
    }

    const { displayReportCli, generateHtmlReport } = require('./reporting')
    let db = null
    try {
      const dbPath = path.resolve(dbFilename)
      console.log(`Generating report from database: ${dbPath}`)

      db = new Database(dbPath)

      // Create SQL functions with debug parameter
      db.function('normalize_address', (addr) => normalizeAddress(addr, debug))
      db.function('normalize_name', (name) => normalizeName(name, debug))

      if (debug) {
        console.log('\nRunning normalization tests before generating report...')
        runNormalizationTests()
        console.log('\nProceeding with report generation...\n')
      }

      // Updated query with fuzzy matching
      const matches = db.prepare(`
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
        JOIN contributions c ON (
          -- Match Type #1: Normalized Address + (First OR Last name)
          (normalize_address(c.contributor_street_1) = normalize_address(v.mailed_to) AND 
           (normalize_name(c.contributor_first_name) = normalize_name(v.first_name) OR 
            normalize_name(c.contributor_last_name) = normalize_name(v.last_name)))
          OR
          -- Match Type #2: Normalized First + Last names
          (normalize_name(c.contributor_first_name) = normalize_name(v.first_name) AND 
           normalize_name(c.contributor_last_name) = normalize_name(v.last_name))
        )
        ORDER BY v.last_name, v.first_name, c.contribution_receipt_date DESC
      `).all()

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
  } catch (error) {
    console.error('Error in report generation:', error)
    return 1
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
  handleCliCommands,
}
