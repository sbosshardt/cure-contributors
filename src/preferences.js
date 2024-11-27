import Store from 'electron-store';

class Preferences {
  constructor(fileName = 'preferences.json') {
    this.store = new Store({
      name: fileName,
      defaults: {
        theme: 'light',
      },
    });
  }

  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }
}

export default new Preferences();
