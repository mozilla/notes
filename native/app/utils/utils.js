import striptags from 'striptags';

function firstLine(content) {
  content = striptags(content.replace(/></gi, '>\n<')).replace(/&nbsp;/gi, ' ').trim().split('\n')[0];
  if (!content) return '';
  return content.substr(0, 250).replace(/&amp;/g, '&');
}

function secondLine(content) {
  // Remove first line
  content = striptags(content.replace(/></gi, '>\n<')).replace(/&nbsp;/gi, ' ').trim().split('\n')[1];
  if (!content) return '';
  return content.substr(0, 250).replace(/&amp;/g, '&');
}

module.exports = { firstLine, secondLine };
