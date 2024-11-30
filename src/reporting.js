// CLI Format
const displayReportCli = (matches) => {
  matches.forEach((match, index) => {
    console.log('\n' + '='.repeat(50))
    console.log(`Match #${index + 1}`)
    console.log('='.repeat(50))

    console.log('\nCure List Voter:')
    console.log('-'.repeat(20))
    console.log(`Last Name:      ${match.voter.last_name}`)
    console.log(`First Name:     ${match.voter.first_name}`)
    console.log(`Zip Code:       ${match.voter.zip_code}`)
    console.log(`Party:          ${match.voter.party}`)
    console.log(`Full Name:      ${match.voter.name}`)
    console.log(`Street Address: ${match.voter.mailed_to}`)
    console.log(`Voter ID:       ${match.voter.voter_id}`)

    console.log('\nFEC Contributions:')
    console.log('-'.repeat(20))
    match.contributions.forEach((contribution, i) => {
      if (i > 0) console.log('-'.repeat(10)) // Separator between contributions
      console.log(
        `Full Name:      ${contribution.contributor_last_name}, ${contribution.contributor_first_name}`,
      )
      console.log(`Street Address: ${contribution.contributor_street_1}`)
      console.log(`Committee:      ${contribution.committee_name}`)
      console.log(`Date:          ${contribution.contribution_receipt_date}`)
      console.log(
        `Amount:        $${contribution.contribution_receipt_amount.toFixed(2)}`,
      )
      console.log(`Employer:       ${contribution.contributor_employer}`)
      console.log(`Occupation:     ${contribution.contributor_occupation}`)
      console.log(`Transaction ID: ${contribution.transaction_id}`)
    })
  })

  console.log('\n' + '='.repeat(50))
  console.log(`Total Voters Found: ${matches.length}`)
  console.log(
    'Total Contributions:',
    matches.reduce((sum, m) => sum + m.contributions.length, 0),
  )
  console.log('='.repeat(50) + '\n')
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
    </style>
  </head>
  <body>
    <h1>Cure List Contribution Matches</h1>
    
    ${matches
      .map(
        (match, index) => `
      <div class="match">
        <h2>Match #${index + 1}</h2>
        
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
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
      )
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

module.exports = {
  displayReportCli,
  generateHtmlReport,
}
