import striptags from 'striptags';

function firstLine(content) {
  content = striptags(content.replace(/></gi, '>\n<')).replace(/&nbsp;/gi, ' ').trim().split('\n')[0];
  if (!content) return '';
  return content.substr(0, 250).replace(/&amp;/g, '&');
}

function secondLine(content) {
  // Remove first line
  let res = striptags(content.replace(/></gi, '>\n<')).replace(/&nbsp;/gi, ' ').trim().split('\n');
  content = res.slice(1, 10).join(' ').trim();

  if (!content) return '';
  return content.substr(0, 250).replace(/&amp;/g, '&');
}

module.exports = { firstLine, secondLine };
