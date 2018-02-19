import React from 'react';
import ReactDOM from 'react-dom';

import Panel from './components/Panel';

import '../static/scss/styles.scss';

// Initialize theming
import './utils/theme.js';

ReactDOM.render(<Panel />, document.getElementById('notes'));
