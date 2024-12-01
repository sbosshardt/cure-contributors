# cure-contributors

A tool to help ballot cure campaigns identify voters who have previously contributed to political campaigns.

## Requirements

- Node.js 18 or later
- SQLite3
- Linux/Unix environment (Windows support not tested)

## Features

- Import voter lists from Excel files (cure lists)
- Import FEC contribution data from CSV files
- Match voters with their contribution history using multiple criteria:
  - Name matching (first and/or last name)
  - Address matching
  - ZIP code verification
- Deduplicate contributions by committee
- Generate detailed HTML and CLI reports showing:
  - Voter information
  - Matched contributions
  - Match criteria details
  - Contribution summaries per committee

## Installation

### Ubuntu/Debian

```bash
# Build from source
npm install
npm run build

# Install the .deb package
sudo dpkg --install out/make/deb/x64/cure-contributors_1.0.0_amd64.deb
```

## Usage

Create a new database:

```bash
cure-contributors create-db database.db
```

Reset an existing database:

```bash
cure-contributors reset-db database.db
```

Import a cure list:

```bash
cure-contributors import-cure-list database.db cure-list.xls
```

Import FEC contributions:

```bash
cure-contributors import-contributions database.db contributions.csv
```

Generate a report:

```bash
# Generate HTML report (optional output file)
cure-contributors generate-report database.db report.html

# Generate CLI-only report
cure-contributors generate-report database.db
```

## Development

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Run formatter
npm run prettier

# Build
npm run build
```

## Data Format

### Cure List Excel Format

The tool supports two formats for cure lists:

#### Original Format
Excel files (.xls or .xlsx) with the following columns:
- Voter ID
- Party
- Name
- Mailed To
- City (including state and ZIP)
- Phone

#### New Format
Excel files with separate name fields:
- RegID (or similar voter ID field)
- FirstName
- LastName
- RegistrationAddr1
- RegZip5

Column headers are matched flexibly, ignoring case and extra spaces.

### FEC Contribution Data

The tool expects FEC contribution data in CSV format with standard FEC fields including:
- contributor_first_name
- contributor_last_name
- contributor_street_1
- contributor_zip
- committee_name
- contribution_receipt_date
- contribution_receipt_amount

## Troubleshooting

### Common Issues

1. **Database Errors**
   - Ensure SQLite3 is installed
   - Try resetting the database with `reset-db`
   - Check file permissions

2. **Import Failures**
   - Verify Excel/CSV file formats match expected columns
   - Check for special characters in filenames
   - Ensure input files are not open in other applications

3. **Memory Issues**
   - Large contribution files may require increased Node.js memory
   - Use `NODE_OPTIONS=--max-old-space-size=4096` for large datasets

### Debug Mode

Add `--debug` to the generate-report command for additional diagnostic information:

```bash
cure-contributors generate-report database.db report.html --debug
```

## License

[MIT](LICENSE)
