/* ! preload.js | Project ACTS | github.com/project-acts */

const {contextBridge, ipcRenderer} = require('electron');

// The renderer runs with contextIsolation on and no Node access, so the
// bundled model engine is reachable only through this narrow bridge. Only
// these two calls are exposed — never ipcRenderer itself.
contextBridge.exposeInMainWorld('actsEngine', {
  /**
   * Whether a bundled engine executable is present in this install.
   * @return {Promise<boolean>} True if models can be fit locally.
   */
  isAvailable: () => ipcRenderer.invoke('acts:engine-available'),

  /**
   * Fits the four models on this machine's CPU.
   * @param {string} csvText - The survey CSV contents.
   * @return {Promise<Object>} The parsed engine results payload.
   */
  runModels: (csvText) => ipcRenderer.invoke('acts:run-models', csvText),
});
