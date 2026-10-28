const getStartModal =
    new bootstrap.Modal(document.getElementById('startModal'));
const signInBox = $('#acts-signin');
const waitingBox = $('#acts-signin-waiting');
const signInError = $('#signin-error');
const userChip = $('#acts-user');

/**
 * Shows who is signed in and unlocks the app.
 * @param {Object} session - From window.actsAuth.
 */
function showSignedIn(session) {
  $('#acts-user-name').text(session.user.full_name || session.user.email);
  $('#acts-user-team').text(
      session.organization ? '· ' + session.organization.name : '');
  userChip.css('display', 'flex');
  getStartModal.hide();
}

/**
 * Locks the app behind the sign-in modal.
 * @param {string} error - Optional message to show under the button.
 */
function showSignedOut(error) {
  userChip.hide();
  waitingBox.hide();
  signInBox.show();
  if (error) {
    signInError.text(error).show();
  } else {
    signInError.hide();
  }
  getStartModal.show();
}

window.actsAuth.onLoginUrl(function(url) {
  $('#signin-link').val(url);
});

$('#btn-sign-in').click(async function() {
  signInError.hide();
  signInBox.hide();
  $('#signin-link').val('');
  waitingBox.show();

  try {
    showSignedIn(await window.actsAuth.signIn());
  } catch (err) {
    // Electron prefixes errors thrown across IPC; show only our message.
    const message = String(err.message || err)
        .replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    showSignedOut(
        message === 'Sign-in was cancelled.' ? '' : message);
  }
});

$('#btn-cancel-sign-in').click(function() {
  window.actsAuth.cancel();
});

$('#btn-copy-link').click(function() {
  navigator.clipboard.writeText($('#signin-link').val());
  $(this).text('Copied');
});

$('#btn-sign-out').click(async function() {
  await window.actsAuth.signOut();
  showSignedOut();
});

window.actsAuth.getSession().then(function(session) {
  if (session) {
    showSignedIn(session);
  } else {
    showSignedOut();
  }
});
