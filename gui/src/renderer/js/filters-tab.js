// Called from onclick="openTab(...)" attributes in index.html; ESLint's
// single-file analysis can't see that cross-file usage in this non-module
// codebase.
/**
 * Switches the active filters tab.
 * @param {Event} evt - The click event that triggered the tab switch.
 * @param {string} tabName - The id of the tab content element to show.
 */
function openTab(evt, tabName) { // eslint-disable-line no-unused-vars
  let i;
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }
  const tablinks = document.getElementsByClassName('tablinks');
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }
  document.getElementById(tabName).style.display = 'block';
  evt.currentTarget.className += ' active';
}
