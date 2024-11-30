const { Command } = require('commander')
const tasks = require('./tasks.js')
const path = require('path')
const { spawn } = require('child_process')

function launchGui(isDev) {
  if (isDev) {
    // Development: Use electron-forge start
    const projectRoot = path.resolve(__dirname, '..')
    const electronForge = path.join(
      projectRoot,
      'node_modules',
      '.bin',
      'electron-forge',
    )

    const child = spawn(electronForge, ['start'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: 1,
        FORCE_GUI: '1',
      },
      cwd: projectRoot,
    })

    handleChildProcess(child)
  } else {
    // Production: Launch the installed electron app
    const electronExecutable = '/usr/lib/cure-contributors/cure-contributors'

    const child = spawn(electronExecutable, [], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: 1,
        FORCE_GUI: '1',
      },
    })

    handleChildProcess(child)
  }
}

function handleChildProcess(child) {
  child.on('error', (err) => {
    console.error('Failed to start application:', err)
    process.exit(1)
  })

  child.on('close', (code) => {
    process.exit(code)
  })
}

function setupCliCommands(program) {
  program
    .name('cure-contributors')
    .version(require('../package.json').version)
    .description(
      'Generate reports of campaign contributions by cure list voters.',
    )

  program
    .command('create-db')
    .argument('<dbFile>', 'Database file to create')
    .description('Create a new database file (if needed)')
    .action(async (dbFile) => {
      const code = await tasks.createDb(dbFile)
      process.exit(code)
    })

  program
    .command('reset-db')
    .argument('<dbFile>', 'Database file to reset')
    .description('Delete all existing tables and recreate them')
    .action(async (dbFile) => {
      const code = await tasks.resetDb(dbFile)
      process.exit(code)
    })

  program
    .command('import-contributions')
    .argument('<dbFile>', 'Database file to import into')
    .argument('<csvFiles...>', 'CSV files to import')
    .description('Import contributions CSV files into the database')
    .action(async (dbFile, csvFiles) => {
      const code = await tasks.importContributions(dbFile, csvFiles)
      process.exit(code)
    })

  program
    .command('import-cure-list')
    .argument('<dbFile>', 'Database file to import into')
    .argument('<excelFile>', 'Excel file to import')
    .description('Import a cure list Excel file into the database')
    .action(async (dbFile, excelFile) => {
      const code = await tasks.importCureList(dbFile, excelFile)
      process.exit(code)
    })

  program
    .command('generate-report')
    .argument('<dbFile>', 'Database file to generate report from')
    .description('Generate a report based on the database')
    .option(
      '-o, --output-file <outputFile>',
      'Write output to a file instead of stdout',
    )
    .option('-d, --debug', 'Enable debug logging for normalization steps')
    .action(async (dbFile, options) => {
      const code = await tasks.generateReport(
        dbFile,
        options.outputFile || null,
        options.debug || false,
      )
      process.exit(code)
    })

  program
    .command('purge-contributions')
    .argument('<dbFile>', 'Database file to purge contributions from')
    .description('Purge contributions data from db')
    .action(async (dbFile) => {
      const code = await tasks.purgeContributions(dbFile)
      process.exit(code)
    })

  // Add purge-cure-list command
  program
    .command('purge-cure-list')
    .argument('<dbFile>', 'Database file to purge cure list from')
    .description('Purge cure list voters from db')
    .action(async (dbFile) => {
      const code = await tasks.purgeCureList(dbFile)
      process.exit(code)
    })
}

function handleCliCommands(args) {
  // If no arguments provided, launch GUI
  if (args.length <= 2) {
    // Check if we're running the development version
    const isDev = args[1].startsWith('.')
    launchGui(isDev)
    return
  }

  // Handle CLI commands
  const program = new Command()
  setupCliCommands(program)
  program.parse(args)
}

module.exports = {
  handleCliCommands,
}
