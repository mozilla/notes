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
function getFirstNonEmptyElement(parentElement, index = 0) {
  // create an Array from parentElement's `children` (limited to 20 child elements)
  const parentElementChildrenArray = Array.prototype.filter.call(parentElement.children, (el, index) => {
    return el && index < 20;
  });

  let counter = 0;
  // search for first child element that is not empty and return it
  const nonEmptyChild = parentElementChildrenArray.find(el => {

    if (el.textContent.trim() !== '') {
      if (counter === index) {
        return el.textContent.trim();
      }
      counter = counter + 1;
    }

  });
  return nonEmptyChild;
}

function getFirstLineFromContent(content) {
  // assign contents to container element for later parsing
  const parentElement = document.createElement('div');
  parentElement.innerHTML = content; // eslint-disable-line no-unsanitized/property

  const element = getFirstNonEmptyElement(parentElement);

  if (!element) {
    return null;
  }

  return element.textContent.trim().replace(/[~#%{}[\]\\<>/+|\n\r\t]/g, '').substring(0, 250) || null;
}

function getSecondLineFromContent(content) {
  // assign contents to container element for later parsing
  const parentElement = document.createElement('div');
  parentElement.innerHTML = content; // eslint-disable-line no-unsanitized/property

  const element = getFirstNonEmptyElement(parentElement, 1);

  if (!element) {
    return null;
  }

  return element.textContent.trim().replace(/[~#%{}[\]\\<>/+|\n\r\t]/g, '').substring(0, 250) || null;
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

export { formatFooterTime, getFirstNonEmptyElement, formatFilename, getFirstLineFromContent, getSecondLineFromContent };
