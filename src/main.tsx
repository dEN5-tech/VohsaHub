import { render } from 'preact';
import { App } from './App';
import './style.css';

const mountEl = document.getElementById('app');
if (mountEl) {
  render(<App />, mountEl);
}
