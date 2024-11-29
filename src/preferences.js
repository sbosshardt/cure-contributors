const Store = require('electron-store')

class Preferences {
  constructor(fileName = 'preferences.json') {
    try {
      this.store = new Store({
        name: fileName,
        defaults: {
          theme: 'light',
        },
        clearInvalidConfig: true
      })
    } catch (err) {
      console.error('Failed to initialize electron-store:', err)
      this.store = {
        get: () => null,
        set: () => {},
        delete: () => {}
      }
    }
  }

  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue)
  }

  set(key, value) {
    this.store.set(key, value)
  }

  delete(key) {
    this.store.delete(key)
  }
}

module.exports = new Preferences()
