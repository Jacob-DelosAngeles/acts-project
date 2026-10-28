/* ! auth.js | Project ACTS | shared Clerk loader for the web pages */

// Everything here is public by design: a Clerk publishable key only
// identifies the Clerk instance, and the API checks every token itself.
// The secret key lives on the API server (CLERK_SECRET_KEY) and never here.
window.ACTS_AUTH = {
  CLERK_PUBLISHABLE_KEY:
    'pk_test_ZW5kbGVzcy1qZW5uZXQtNDQzNi5jbGVyay5hY2NvdW50cy5kZXYk',
  API_BASE: 'https://acts-api-d65l.onrender.com',
  // Bump with each desktop release; the filename carries the version.
  DOWNLOAD_URL: 'https://github.com/Jacob-DelosAngeles/acts-project' +
    '/releases/latest/download/Project.ACTS-1.0.2.Setup.exe',
};

(function() {
  const config = window.ACTS_AUTH;
  let loading = null;

  /**
   * Loads clerk-js from this Clerk instance's own Frontend API, so there is
   * no extra CDN to trust. The Frontend API host is encoded in the
   * publishable key itself (base64 of "<host>$").
   * @return {Promise<Object>} The loaded Clerk instance.
   */
  function loadClerk() {
    if (loading) {
      return loading;
    }
    const key = config.CLERK_PUBLISHABLE_KEY;
    const frontendApi = atob(key.split('_')[2]).replace(/\$$/, '');

    loading = new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-clerk-publishable-key', key);
      script.src = 'https://' + frontendApi +
        '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      script.onload = function() {
        window.Clerk.load({afterSignOutUrl: '/'})
            .then(function() {
              resolve(window.Clerk);
            })
            .catch(reject);
      };
      script.onerror = function() {
        reject(new Error('Could not load the sign-in service.'));
      };
      document.head.appendChild(script);
    });
    return loading;
  }

  /**
   * Calls the ACTS API as the signed-in user. Clerk session tokens live
   * about 60 seconds, so a fresh one is requested for every call instead
   * of being cached.
   * @param {string} path - API path, e.g. "/auth/me".
   * @param {Object} options - fetch options.
   * @return {Promise<Response>} The raw response.
   */
  async function apiFetch(path, options) {
    const clerk = await loadClerk();
    const token = await clerk.session.getToken();
    const opts = Object.assign({}, options);
    opts.headers = Object.assign(
        {'Authorization': 'Bearer ' + token}, opts.headers);
    return fetch(config.API_BASE + path, opts);
  }

  /**
   * Makes sure a team is active in this browser session. Clerk's team
   * widgets render nothing without one. This is for the UI only; who is on
   * which team is decided by the API, never by this.
   * @param {Object} clerk - The loaded Clerk instance.
   * @return {Promise<void>}
   */
  async function ensureActiveOrg(clerk) {
    if (clerk.organization) {
      return;
    }
    const memberships = await clerk.user.getOrganizationMemberships();
    const first = (memberships.data || [])[0];
    if (first) {
      await clerk.setActive({organization: first.organization.id});
    }
  }

  /**
   * Accepts only same-site relative paths as post-sign-in destinations, so
   * a crafted link can't bounce a fresh session to another site.
   * @param {string} target - Candidate redirect path.
   * @param {string} fallback - Used when target is not acceptable.
   * @return {string} A safe path on this site.
   */
  function safeRedirect(target, fallback) {
    if (target && target.charAt(0) === '/' && target.charAt(1) !== '/' &&
        target.indexOf('\\') === -1) {
      return target;
    }
    return fallback;
  }

  window.ACTS_AUTH.loadClerk = loadClerk;
  window.ACTS_AUTH.apiFetch = apiFetch;
  window.ACTS_AUTH.ensureActiveOrg = ensureActiveOrg;
  window.ACTS_AUTH.safeRedirect = safeRedirect;
})();
