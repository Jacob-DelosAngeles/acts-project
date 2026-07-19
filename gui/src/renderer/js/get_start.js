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
  // const url = `https://qxt297xd1k.execute-api.ap-northeast-1.amazonaws.com/getStart?name=${name}&email=${email}`
  const url = `https://actsproject.uplb.edu.ph/api/get-started?name=${name}&email=${email}`;
  await fetchGetStart(url).then((res) => {
    getStartModal.hide();
  });
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
