# cure-contributors

A tool to help ballot cure campaigns identify voters who have previously contributed to political campaigns.

## Features

- Import voter lists from Excel files (cure lists)
- Import FEC contribution data from CSV files
- Match voters with their contribution history
- Cross-reference by name and ZIP code
- Works in both GUI and CLI modes

## Installation

### Ubuntu/Debian

```
# Build from source
npm install
npm run build

# Install the .deb package
sudo dpkg --install out/make/deb/x64/cure-contributors_1.0.0_amd64.deb
```

## Usage

### CLI Mode

Create a new database:

```
cure-contributors create-db database.db
```

Reset an existing database:

```
cure-contributors reset-db database.db
```

Import a cure list:

```
cure-contributors import-cure-list database.db cure-list.xls
```

### GUI Mode

Launch the application from your desktop environment or run:

```
cure-contributors
```

## Development

```
# Install dependencies
npm install

# Run in development mode
npm start

# Run linter
npm run lint

# Run formatter
npm run prettier

# Build
npm run build
```

## Data Format

### Cure List Excel Format

The tool expects cure lists in Excel format (.xls or .xlsx) with the following columns:

- Voter ID
- Party
- Name
- Mailed To
- City (including state and ZIP)
- Phone

Column headers are matched flexibly, ignoring case and extra spaces.

## License

[MIT](LICENSE)
