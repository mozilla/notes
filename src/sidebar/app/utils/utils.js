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
  // create an Array from parentElement's `children` (limited to 20 child elements)
  const parentElementChildrenArray = Array.prototype.filter.call(parentElement.children, (el, index) => {
    return el && index < 20;
  });
  // search for first child element that is not empty and return it
  const nonEmptyChild = parentElementChildrenArray.find(el => {
    return el.textContent.trim() !== '';
  });
  return nonEmptyChild;
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
  if (formattedFilename.length > 250) { // 255 bytes (filesystem max) - 5 for ".html" extension
    formattedFilename = formattedFilename.substring(0, 250);
  }
  return `${formattedFilename}.html`;
}

export { formatFooterTime, getFirstNonEmptyElement, formatFilename };
