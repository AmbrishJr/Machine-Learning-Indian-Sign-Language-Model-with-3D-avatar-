import React from 'react';
import ReactDOM from 'react-dom';
// Bootstrap first, so the app's design tokens (index.css) take precedence.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
