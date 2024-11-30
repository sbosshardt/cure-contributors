// CLI Format
const displayReportCli = (matches) => {
  matches.forEach(({ voter, contributions }) => {
    console.log('\n----------------------------------------')
    console.log(`Voter: ${voter.first_name} ${voter.last_name}`)
    console.log(`Address: ${voter.mailed_to}`)
    console.log(`Party: ${voter.party}`)
    console.log(`Voter ID: ${voter.voter_id}`)

    contributions.forEach((contribution) => {
      console.log('\nContribution:')
      console.log(`  Committee: ${contribution.committee_name}`)
      console.log(`  Amount: $${contribution.contribution_receipt_amount}`)
      console.log(`  Date: ${contribution.contribution_receipt_date}`)
      console.log(
        `  Contributor: ${contribution.contributor_first_name} ${contribution.contributor_last_name}`,
      )
      console.log(`  Address: ${contribution.contributor_street_1}`)

      // Add match details section
      console.log('  Match Details:')
      console.log(
        `    Address: ${contribution.match_details.address ? '✓' : '✗'}`,
      )
      console.log(`    ZIP Code: ${contribution.match_details.zip ? '✓' : '✗'}`)
      console.log(
        `    First Name: ${contribution.match_details.first_name ? '✓' : '✗'}`,
      )
      console.log(
        `    Last Name: ${contribution.match_details.last_name ? '✓' : '✗'}`,
      )
    })
  })
}

// HTML Format
const generateHtmlReport = (matches) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Cure List Contribution Matches</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .match {
        border: 1px solid #ccc;
        margin: 20px 0;
        padding: 20px;
        border-radius: 5px;
      }
      .section {
        margin: 10px 0;
        padding: 10px;
        background-color: #f5f5f5;
      }
      .section-title {
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
      }
      .field {
        margin: 5px 0;
      }
      .label {
        font-weight: bold;
        display: inline-block;
        width: 120px;
      }
      .contribution {
        margin: 10px 0;
        padding: 10px;
        border-left: 3px solid #ccc;
      }
      .summary {
        text-align: center;
        font-size: 1.2em;
        margin: 20px 0;
        padding: 10px;
        background-color: #eef;
      }
      
      /* Add styles for match details */
      .match-details {
        margin: 10px 0;
        padding: 10px;
        background-color: #f8f8f8;
        border-radius: 3px;
      }
      .match-indicator {
        display: inline-block;
        margin-right: 15px;
      }
      .match-true {
        color: #2e7d32;
        font-weight: bold;
      }
      .match-false {
        color: #c62828;
      }
      
      .match-summary {
        margin: 10px 0;
        padding: 15px;
        background-color: #e8f5e9;
        border-radius: 3px;
        border-left: 4px solid #2e7d32;
      }
      .match-summary.partial {
        background-color: #fff3e0;
        border-left-color: #ef6c00;
      }
      .match-type {
        font-weight: bold;
        margin-bottom: 8px;
      }
      .match-explanation {
        font-size: 0.9em;
        color: #555;
        margin-top: 5px;
      }
    </style>
  </head>
  <body>
    <h1>Cure List Contribution Matches</h1>
    
    ${matches
      .map((match, index) => {
        // Calculate match summary for this voter
        const allContributions = match.contributions || []
        const matchSummary = allContributions.reduce(
          (summary, contrib) => {
            const details = contrib.match_details
            if (details.address && (details.first_name || details.last_name)) {
              summary.addressMatches++
            }
            if (details.first_name && details.last_name) {
              summary.nameMatches++
            }
            return summary
          },
          { addressMatches: 0, nameMatches: 0 },
        )

        return `
      <div class="match">
        <h2>Match #${index + 1}</h2>
        
        <div class="match-summary ${matchSummary.addressMatches > 0 && matchSummary.nameMatches > 0 ? '' : 'partial'}">
          <div class="match-type">Match Summary for ${match.voter.first_name} ${match.voter.last_name}</div>
          <div>
            • ${matchSummary.addressMatches} contribution(s) matched by address + partial name
            <br>
            • ${matchSummary.nameMatches} contribution(s) matched by full name
          </div>
          <div class="match-explanation">
            ${
              matchSummary.addressMatches > 0
                ? '✓ Found address-based matches (street address + either first or last name)'
                : '✗ No address-based matches found'
            }
            <br>
            ${
              matchSummary.nameMatches > 0
                ? '✓ Found full name matches (both first and last name)'
                : '✗ No full name matches found'
            }
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Cure List Voter</div>
          <div class="field"><span class="label">Last Name:</span> ${match.voter.last_name}</div>
          <div class="field"><span class="label">First Name:</span> ${match.voter.first_name}</div>
          <div class="field"><span class="label">Zip Code:</span> ${match.voter.zip_code}</div>
          <div class="field"><span class="label">Party:</span> ${match.voter.party}</div>
          <div class="field"><span class="label">Full Name:</span> ${match.voter.name}</div>
          <div class="field"><span class="label">Street Address:</span> ${match.voter.mailed_to}</div>
          <div class="field"><span class="label">Voter ID:</span> ${match.voter.voter_id}</div>
        </div>
        
        <div class="section">
          <div class="section-title">FEC Contributions</div>
          ${match.contributions
            .map(
              (contribution) => `
            <div class="contribution">
              <div class="field"><span class="label">Full Name:</span> ${contribution.contributor_last_name}, ${contribution.contributor_first_name}</div>
              <div class="field"><span class="label">Street Address:</span> ${contribution.contributor_street_1}</div>
              <div class="field"><span class="label">Committee:</span> ${contribution.committee_name}</div>
              <div class="field"><span class="label">Date:</span> ${contribution.contribution_receipt_date}</div>
              <div class="field"><span class="label">Amount:</span> $${contribution.contribution_receipt_amount.toFixed(2)}</div>
              <div class="field"><span class="label">Employer:</span> ${contribution.contributor_employer}</div>
              <div class="field"><span class="label">Occupation:</span> ${contribution.contributor_occupation}</div>
              <div class="field"><span class="label">Transaction ID:</span> ${contribution.transaction_id}</div>
              
              <div class="match-details">
                <div class="section-title">Match Details</div>
                <span class="match-indicator ${contribution.match_details.address ? 'match-true' : 'match-false'}">
                  Address: ${contribution.match_details.address ? '✓' : '✗'}
                </span>
                <span class="match-indicator ${contribution.match_details.zip ? 'match-true' : 'match-false'}">
                  ZIP: ${contribution.match_details.zip ? '✓' : '✗'}
                </span>
                <span class="match-indicator ${contribution.match_details.first_name ? 'match-true' : 'match-false'}">
                  First Name: ${contribution.match_details.first_name ? '✓' : '✗'}
                </span>
                <span class="match-indicator ${contribution.match_details.last_name ? 'match-true' : 'match-false'}">
                  Last Name: ${contribution.match_details.last_name ? '✓' : '✗'}
                </span>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
      })
      .join('')}
    
    <div class="summary">
      Total Voters Found: ${matches.length}<br>
      Total Contributions: ${matches.reduce((sum, m) => sum + m.contributions.length, 0)}
    </div>
  </body>
  </html>
  `
  return html
}

// Add name variations map
const NAME_VARIATIONS = {
  robert: ['bob', 'rob', 'bobby', 'bert'],
  william: ['will', 'bill', 'billy', 'willie', 'liam'],
  richard: ['rick', 'dick', 'richie', 'ricky'],
  james: ['jim', 'jimmy', 'jamie'],
  john: ['jack', 'johnny', 'jon'],
  margaret: ['maggie', 'meg', 'peggy', 'marge', 'margie'],
  elizabeth: ['beth', 'liz', 'betty', 'lizzy', 'eliza', 'lisa', 'betsy'],
  katherine: ['kathy', 'kate', 'katie', 'katy', 'kay'], // 'kit' removed due to conflict with 'christopher'
  michael: ['mike', 'mikey', 'mick', 'mickey'],
  christopher: ['chris', 'topher'], // 'kit' removed due to conflict with 'katherine'
  joseph: ['joe', 'joey', 'jos'],
  daniel: ['dan', 'danny', 'dani'],
  anthony: ['tony', 'ant'],
  benjamin: ['ben', 'benji', 'benny'],
  charles: ['chuck', 'charlie', 'chas'],
  david: ['dave', 'davey'],
  donald: ['don', 'donny'],
  edward: ['ed', 'eddie', 'ted', 'ned'],
  francis: ['frank', 'frankie'],
  george: ['georgie'],
  gerald: ['gerry', 'jerry'],
  gregory: ['greg', 'gregg'],
  jennifer: ['jen', 'jenny', 'jenn'],
  kenneth: ['ken', 'kenny'],
  lawrence: ['larry', 'lars'],
  matthew: ['matt', 'matty'],
  nicholas: ['nick', 'nicky'],
  patricia: ['patty', 'trish'], // 'pat' removed due to conflict with 'patrick'
  patrick: ['paddy'], // 'pat' removed due to conflict with 'patricia'
  peter: ['pete', 'petey'],
  raymond: ['ray', 'raymon'],
  ronald: ['ron', 'ronnie'],
  samuel: ['sam', 'sammy'],
  sandra: ['sandy'],
  stephen: ['steve', 'steven', 'steph'],
  susan: ['sue', 'susie', 'suzy'],
  thomas: ['tom', 'tommy'],
  timothy: ['tim', 'timmy'],
  victoria: ['vicki', 'vicky'],
  virginia: ['ginny', 'ginger'],
}

// Validate name variation mappings
function validateNameMappings() {
  const errors = []
  const allVariations = new Set()

  // Check for duplicate variations
  for (const [standard, variations] of Object.entries(NAME_VARIATIONS)) {
    // Ensure standard name isn't used as a variation elsewhere
    if (allVariations.has(standard)) {
      errors.push(
        `Standard name "${standard}" is used as a variation in another mapping`,
      )
    }

    // Check for duplicate variations across different standard names
    variations.forEach((variation) => {
      if (allVariations.has(variation)) {
        errors.push(
          `Variation "${variation}" is mapped to multiple standard names`,
        )
      }
      allVariations.add(variation)
    })

    // Check for variations matching their standard name
    if (variations.includes(standard)) {
      errors.push(
        `Standard name "${standard}" appears in its own variation list`,
      )
    }

    // Validate variation format
    variations.forEach((variation) => {
      if (typeof variation !== 'string') {
        errors.push(
          `Invalid variation type for "${standard}": ${typeof variation}`,
        )
      }
      if (!variation.trim()) {
        errors.push(`Empty variation found for "${standard}"`)
      }
      if (variation !== variation.toLowerCase()) {
        errors.push(
          `Variation "${variation}" for "${standard}" should be lowercase`,
        )
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
    road: 'rd',
    drive: 'dr',
    lane: 'ln',
    court: 'ct',
    circle: 'cir',
    'boulevard|blvd': 'bl',
    place: 'pl',
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
  normalized = normalized.replace(
    /\b(unit|apt|apartment|suite|ste|#)\s*[\w-]+\b/gi,
    '',
  )
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
      steps.push({
        step: 'name variation',
        result: normalized,
        note: `mapped from ${name} to ${standard}`,
      })
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
    nameMapErrors.forEach((error) => console.error(`- ${error}`))
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
    '654 Forest Parkway, Suite 200',
  ]

  const nameTests = [
    'Robert Smith Jr.',
    'Bob Smith',
    'Elizabeth Jones-Taylor',
    'Betty Jones',
    'William Johnson III',
    'Bill Johnson',
    "Katherine Marie O'Brien",
    "Katie O'Brien",
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
    "Patricia Ellen O'Connor",
    "Patty O'Connor",
  ]

  console.log('Address Normalization Tests:')
  addressTests.forEach((addr) => {
    console.log(`\nOriginal: "${addr}"`)
    normalizeAddress(addr, true)
  })

  console.log('\nName Normalization Tests:')
  nameTests.forEach((name) => {
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
        nameMapErrors.forEach((error) => console.error(`- ${error}`))
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
            c.memo_text,
            -- Add match indicators
            (normalize_address(c.contributor_street_1) = normalize_address(v.mailed_to)) as address_matched,
            (c.contributor_zip = v.zip_code) as zip_matched,
            (normalize_name(c.contributor_first_name) = normalize_name(v.first_name)) as first_name_matched,
            (normalize_name(c.contributor_last_name) = normalize_name(v.last_name)) as last_name_matched
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
        `,
        )
        .all()

      // Group contributions by voter
      const groupedMatches = matches.reduce((acc, row) => {
        const voterKey = `${row.voter_last_name}_${row.voter_first_name}_${row.voter_id}`

        if (!acc[voterKey]) {
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

        // Add contribution with match details
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
          // Add match indicators
          match_details: {
            address: row.address_matched === 1,
            zip: row.zip_matched === 1,
            first_name: row.first_name_matched === 1,
            last_name: row.last_name_matched === 1,
          },
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

module.exports = {
  displayReportCli,
  generateHtmlReport,
  generateReport,
}
