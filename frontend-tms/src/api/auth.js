const PREFIX = 'tms';

function getTabId() {
  let id = sessionStorage.getItem('tms_tab_id');
  if (!id) {
    id = (Math.random() + 1).toString(36).substring(7) + '_' + Date.now().toString(36);
    sessionStorage.setItem('tms_tab_id', id);
  }
  return id;
}

const key = (name) => `${PREFIX}_${getTabId()}_${name}`;

export function setAuth({ access, refresh, role, name }) {
  localStorage.setItem(key('access'), access);
  localStorage.setItem(key('refresh'), refresh);
  localStorage.setItem(key('role'), role);
  localStorage.setItem(key('name'), name || '');
}

export function setAuthName(name) {
  localStorage.setItem(key('name'), name || '');
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(key('access'), access);
  if (refresh) localStorage.setItem(key('refresh'), refresh);
}

export function getAuth() {
  return {
    access: localStorage.getItem(key('access')),
    refresh: localStorage.getItem(key('refresh')),
    role: localStorage.getItem(key('role')),
    name: localStorage.getItem(key('name')),
  };
}

export function getAccess() {
  return localStorage.getItem(key('access'));
}

export function getRefresh() {
  return localStorage.getItem(key('refresh'));
}

export function clearAuth() {
  localStorage.removeItem(key('access'));
  localStorage.removeItem(key('refresh'));
  localStorage.removeItem(key('role'));
  localStorage.removeItem(key('name'));
}
