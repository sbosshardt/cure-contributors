const { createRoot } = require('react-dom/client')
const App = require('../../pages/index.js')
require('bootstrap/dist/css/bootstrap.min.css')

const root = createRoot(document.getElementById('root'))
root.render(<App />)
