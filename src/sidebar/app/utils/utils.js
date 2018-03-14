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
 * the length is shortened if longer than `MAX_CHAR` characters.
 * @param {string} filename
 * @returns {string}
 */
function formatFilename(filename) {
  // maximum length of filename before ".html" extension - fixes #766
  const MAX_CHARS = 215;
  let formattedFilename = filename;
  // remove illegal filename characters
  formattedFilename = formattedFilename.replace(/[~#%{}[\]:\\<>/!@&?"*.+|\n\r\t]/g, '');
  if (formattedFilename.length > MAX_CHARS) {
    formattedFilename = formattedFilename.substring(0, MAX_CHARS);
  }
  // remove surrounding whitespace before appending extension
  formattedFilename = formattedFilename.trim();
  return `${formattedFilename}.html`;
}

export { formatFooterTime, getFirstNonEmptyElement, formatFilename };
