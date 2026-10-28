/* ! auth.js | Project ACTS | github.com/project-acts */

const {app, ipcMain, safeStorage, shell} = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

// Sign-in happens in the system browser on the website, which hands a
// one-time code back to a listener on 127.0.0.1. The app trades that code
// with the API for the user's identity once, then keeps its own session so
// it works offline from then on. Both bases can be pointed at local copies
// for development.
const WEB_BASE = (process.env.ACTS_WEB_BASE ||
  'https://acts-project.vercel.app').replace(/\/$/, '');
const API_BASE = (process.env.ACTS_API_BASE ||
  'https://acts-api-d65l.onrender.com').replace(/\/$/, '');

// How long the app stays signed in without going back online.
const SESSION_DAYS = 30;

// Long enough to type a password and an email code; after that the
// listener closes and the user starts again.
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

// Covers a cold start of the free-tier API host.
const EXCHANGE_TIMEOUT_MS = 60 * 1000;

let pending = null;
// Used only when the OS offers no encryption for safeStorage: the session
// then lasts until the app quits rather than being written in the clear.
let memorySession = null;

/**
 * @return {string} Where the encrypted session is kept.
 */
function sessionPath() {
  return path.join(app.getPath('userData'), 'session.bin');
}

/**
 * Returns the stored session, or null when there is none or it expired.
 * A file that no longer decrypts (another Windows account, a reinstalled
 * OS) is removed so the user simply signs in again.
 * @return {Object|null} The session.
 */
function readSession() {
  let session = memorySession;

  if (!session && safeStorage.isEncryptionAvailable()) {
    try {
      const sealed = fs.readFileSync(sessionPath());
      session = JSON.parse(safeStorage.decryptString(sealed));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Discarding unreadable session:', err.message);
        clearSession();
      }
      return null;
    }
  }

  if (!session || !session.expires_at || Date.now() > session.expires_at) {
    clearSession();
    return null;
  }
  return session;
}

/**
 * Persists a session encrypted with the OS keystore (DPAPI on Windows).
 * Only this main process reads it, so encryption at rest is what protects
 * it; the renderer never sees the file.
 * @param {Object} session - The session to keep.
 */
function writeSession(session) {
  if (!safeStorage.isEncryptionAvailable()) {
    memorySession = session;
    return;
  }
  fs.mkdirSync(path.dirname(sessionPath()), {recursive: true});
  fs.writeFileSync(sessionPath(), safeStorage.encryptString(
      JSON.stringify(session)));
}

/** Forgets the session in memory and on disk. */
function clearSession() {
  memorySession = null;
  try {
    fs.rmSync(sessionPath(), {force: true});
  } catch (err) {
    console.error('Could not remove the session file:', err.message);
  }
}

/**
 * POSTs JSON with Node's https module (Electron 17's main process has no
 * global fetch).
 * @param {string} url - Absolute URL.
 * @param {Object} body - JSON body.
 * @return {Promise<Object>} {status, body}.
 */
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const transport = url.startsWith('https:') ? https : http;
    const request = transport.request(url, {
      method: 'POST',
      timeout: EXCHANGE_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        let parsed = {};
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          // Leave it empty; the status code still says what happened.
        }
        resolve({status: response.statusCode, body: parsed});
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('The ACTS server took too long to answer.'));
    });
    request.on('error', reject);
    request.end(data);
  });
}

/**
 * A small page for the browser tab once the hand-off is over.
 * @param {string} title - Heading.
 * @param {string} text - Body text.
 * @return {string} HTML.
 */
function resultPage(title, text) {
  return '<!doctype html><meta charset="utf-8"><title>Project ACTS</title>' +
    '<body style="font-family:Segoe UI,Arial,sans-serif;background:#f7f4ef;' +
    'color:#12233b;display:flex;align-items:center;justify-content:center;' +
    'min-height:90vh;text-align:center"><div><h1 style="font-weight:600">' +
    title + '</h1><p style="color:#5c6b82">' + text + '</p></div></body>';
}

/** Abandons the sign-in in progress, if any. */
function cancelPending() {
  if (!pending) {
    return;
  }
  const {server, timer, reject} = pending;
  pending = null;
  clearTimeout(timer);
  server.close();
  reject(new Error('Sign-in was cancelled.'));
}

/**
 * Runs the browser hand-off and resolves with the new session.
 *
 * A fresh listener on an OS-chosen loopback port receives the browser's
 * redirect. The random state ties that redirect to this attempt, so a page
 * that merely knows the port can't sign the app in as someone else.
 *
 * @param {Function} onLoginUrl - Called with the URL opened in the browser,
 *     so the renderer can offer it for copying if no browser appears.
 * @return {Promise<Object>} The session.
 */
function signIn(onLoginUrl) {
  cancelPending();

  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(32).toString('hex');
    let settled = false;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/desktop-callback' || req.method !== 'GET') {
        res.writeHead(404).end();
        return;
      }

      const supplied = Buffer.from(url.searchParams.get('state') || '');
      const expected = Buffer.from(state);
      const code = url.searchParams.get('code');
      if (settled || supplied.length !== expected.length ||
          !crypto.timingSafeEqual(supplied, expected) || !code) {
        res.writeHead(400, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(resultPage('This sign-in link has expired',
            'Go back to the ACTS app and click “Sign in with your ' +
            'browser” again.'));
        return;
      }
      settled = true;

      try {
        const {status, body} = await postJson(
            API_BASE + '/auth/desktop/exchange', {code});
        if (status !== 200 || !body.email) {
          throw new Error(body.error || `Sign-in failed (${status}).`);
        }

        const now = Date.now();
        const session = {
          user: {
            clerk_id: body.clerk_id,
            email: body.email,
            full_name: body.full_name,
          },
          organization: body.organization,
          org_role: body.org_role,
          issued_at: now,
          expires_at: now + SESSION_DAYS * 24 * 60 * 60 * 1000,
        };
        writeSession(session);

        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(resultPage('Signed in to ACTS',
            'You can close this tab and return to the app.'));
        finish(null, session);
      } catch (err) {
        res.writeHead(502, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(resultPage('Sign-in didn’t finish',
            'Return to the ACTS app and try again.'));
        finish(err);
      }
    });

    const finish = (err, session) => {
      if (!pending || pending.server !== server) {
        return;
      }
      clearTimeout(pending.timer);
      pending = null;
      server.close();
      if (err) {
        reject(err);
      } else {
        resolve(session);
      }
    };

    const timer = setTimeout(() => {
      finish(new Error('Sign-in timed out. Please try again.'));
    }, SIGN_IN_TIMEOUT_MS);

    pending = {server, timer, reject};

    server.on('error', (err) => finish(err));
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      const callback =
        `http://127.0.0.1:${port}/desktop-callback?state=${state}`;
      const loginUrl = `${WEB_BASE}/desktop-auth.html?cb=` +
        encodeURIComponent(callback);
      onLoginUrl(loginUrl);
      shell.openExternal(loginUrl).catch((err) => {
        // The renderer still shows the link to copy, so keep waiting.
        console.error('Could not open the browser:', err.message);
      });
    });
  });
}

/** Registers the auth IPC handlers with the main process. */
exports.register = function() {
  ipcMain.handle('auth:get-session', () => readSession());
  ipcMain.handle('auth:sign-in', (event) => signIn((url) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('auth:login-url', url);
    }
  }));
  ipcMain.handle('auth:cancel', () => cancelPending());
  ipcMain.handle('auth:sign-out', () => {
    cancelPending();
    clearSession();
  });
};
