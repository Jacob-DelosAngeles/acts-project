const getStartModal =
    new bootstrap.Modal(document.getElementById('startModal'));
const btnLoading = $('#btn-loading');
const btnGetStarted = $('#btn-get-started');
btnLoading.hide();
getStartModal.show();

$('#acts-login').submit(async function(e) {
  e.preventDefault();
  const name = $('#form-name').val();
  const email = $('#form-email').val();
  btnGetStarted.hide();
  btnLoading.show();

  // Best-effort registration against the onboarding backend. It is not yet
  // deployed (ACTS.apis.GET_STARTED_ENDPOINT is empty), and even once it is,
  // a failure must never trap the user on the launch modal; always proceed.
  const endpoint = ACTS.apis.GET_STARTED_ENDPOINT;
  if (endpoint) {
    const url = `${endpoint}?name=${encodeURIComponent(name)}` +
        `&email=${encodeURIComponent(email)}`;
    try {
      await fetchGetStart(url);
    } catch (err) {
      console.error('get-started registration failed (continuing):', err);
    }
  }

  getStartModal.hide();
});

/**
 * Registers the user via the get-started API and returns the response.
 * @param {string} url - The get-started endpoint URL with query params.
 * @return {Promise<Object>} The parsed JSON response.
 */
async function fetchGetStart(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  });
  const data = await response.json();
  return data;
}
