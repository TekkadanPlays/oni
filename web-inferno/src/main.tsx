import { createElement } from 'inferno-create-element';
import { render } from 'inferno';
import { App } from './components/App';
import { AdminPage } from './components/admin/AdminPage';

const root = document.getElementById('root');
if (root) {
  const isAdmin = window.location.pathname.startsWith('/admin');
  render(isAdmin ? <AdminPage /> : <App />, root);
}
