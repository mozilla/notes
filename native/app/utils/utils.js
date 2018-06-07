
import striptags from 'striptags';

function firstLine(content) {
	content = content.split('</')[0].replace(/<\/p>|<\/li>/gi, '&nbsp;');
	return striptags(content.replace(/&nbsp;/gi, ' ')).trim().substr(0, 250).replace(/&amp;/g, '&');
}

function secondLine(content) {
	// Remove first line
	content = content.replace(content.split('</')[0], '');
	content = content.replace(/<\/p>|<\/li>/gi, '&nbsp;');
	return striptags(content.replace(/&nbsp;/gi, ' ')).trim().substr(0, 250).replace(/&amp;/g, '&');
}

module.exports = { firstLine, secondLine };
