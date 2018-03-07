/**
 * Formats time for the Notes footer
 * @param time
 * @returns {string}
 */
function formatFooterTime(date) {
  date = date || Date.now();
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 *
 * @param {HTMLElement Object} parentElement
 * @returns {HTMLElement Object}
 */
function getFirstNonEmptyElement(parentElement) {
  // create an Array from parentElement's `children` (HTMLCollection)
  let parentElementChildrenArray = [];
  if (parentElement.children.length > 20) {
    parentElementChildrenArray = Array.prototype.slice.call(parentElement.children[0, 20]);
  } else {

    parentElementChildrenArray = Array.prototype.slice.call(parentElement.children);
  }
  // search for first child element that is not empty and return it
  for (const childElement of parentElementChildrenArray.entries()) {
    if (childElement[1].textContent.trim() !== '')
      return childElement[1];
  }
  return false; // all children empty, so return false
}

/**
 * Formats the filename for the "Export as HTML..." menu option.
 * Whitespace and illegal filename characters are removed, and
 * the length is shortened if longer than 250 characters.
 * @param {string} filename
 * @returns {string}
 */
function formatFilename(filename) {
  let formattedFilename = filename;
  // remove surrounding whitespace
  formattedFilename = formattedFilename.trim();
  // remove illegal filename characters
  formattedFilename = formattedFilename.replace(/[~#%{}[\]:\\<>/!@&?"*.+|\n\r\t]/g, '');
  if (formattedFilename.length > 250) { // 255 bytes (filesystem max) - 4 for ".html" extension
    formattedFilename = formattedFilename.substring(0, 250);
  }
  return formattedFilename;
}

export { formatFooterTime, getFirstNonEmptyElement, formatFilename };
