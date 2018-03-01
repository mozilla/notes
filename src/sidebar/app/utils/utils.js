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
  const parentElementChildrenArray = Array.prototype.slice.call(parentElement.children);
  // search for first child element that is not empty and return it
  for (const [index, childElement] of parentElementChildrenArray.entries()) {
    if (childElement.textContent.trim() !== '')
      return childElement;
  }
  return false; // all children empty, so return false
}

export { formatFooterTime, getFirstNonEmptyElement };
