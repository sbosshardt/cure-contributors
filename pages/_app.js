const React = require('react')
const PropTypes = require('prop-types')
require('bootstrap/dist/css/bootstrap.min.css')
//import { hot } from 'react-hot-loader'

// Based on: https://www.electronforge.io/config/plugins/webpack
//const preloadPath = window.electron.getPreloadPath();

const MyApp = ({ Component, pageProps }) => {
  return <Component {...pageProps} />
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
}

//export default hot(module)(MyApp)
//export default MyApp
module.exports = MyApp
