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
  console.log(
    `In createDb. Parameters passed to function: dbFilename=${dbFilename}`,
  )

  // Indicate that the task/program should exit with a success status code.
  return 0
}

const resetDb = async (dbFilename) => {
  console.log(
    `In resetDb. Parameters passed to function: dbFilename=${dbFilename}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

const importContributions = async (dbFilename, csvFilenames) => {
  console.log(
    `In importContributions. Parameters passed to function: csvFilenames=${csvFilenames}, dbFilename=${dbFilename}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

const importCureList = async (dbFilename, excelFilename) => {
  console.log(
    `In importCureList. Parameters passed to function: excelFilename=${excelFilename}, dbFilename=${dbFilename}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

const generateReport = async (dbFilename, outputFile) => {
  console.log(
    `In generateReport. Parameters passed to function: dbFilename=${dbFilename}, outputFile=${outputFile}`,
  )
  // Indicate that the task/program should exit with a success status code.
  return 0
}

export {
  purgeContributions,
  createDb,
  resetDb,
  importContributions,
  importCureList,
  generateReport,
}
