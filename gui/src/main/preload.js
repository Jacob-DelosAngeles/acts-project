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

// Sign-in runs in the main process; the renderer only learns who is signed
// in. The session file and the sign-in code never cross this bridge.
contextBridge.exposeInMainWorld('actsAuth', {
  /**
   * The current session, or null when signed out or expired.
   * @return {Promise<Object|null>} {user, organization, org_role, ...}.
   */
  getSession: () => ipcRenderer.invoke('auth:get-session'),

  /**
   * Opens the browser to sign in and resolves once it completes.
   * @return {Promise<Object>} The new session.
   */
  signIn: () => ipcRenderer.invoke('auth:sign-in'),

  /** @return {Promise<void>} Abandons a sign-in in progress. */
  cancel: () => ipcRenderer.invoke('auth:cancel'),

  /** @return {Promise<void>} Forgets the session on this computer. */
  signOut: () => ipcRenderer.invoke('auth:sign-out'),

  /**
   * Receives the sign-in URL, to offer for copying if no browser opens.
   * @param {Function} callback - Called with the URL string.
   */
  onLoginUrl: (callback) => {
    ipcRenderer.on('auth:login-url', (event, url) => callback(url));
  },
});
