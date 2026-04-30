// fav_bridge.js
let _authCache = null;
let _authFetchedAt = 0;
let _authMonitorStarted = false;
const AUTH_CACHE_KEY = 'wp_last_auth_me_v1';
const AUTH_CACHE_TTL = 10000;

function markSessionLoginFromUrl(){
  try{
    const params = new URLSearchParams(location.search);

    if(params.get('session_login') === '1'){
      sessionStorage.setItem('wp_session_login', '1');
    }

    if(params.get('session_login') === '0'){
      sessionStorage.removeItem('wp_session_login');
    }

    if(params.has('session_login')){
      params.delete('session_login');
      const cleanUrl =
        location.pathname +
        (params.toString() ? '?' + params.toString() : '') +
        location.hash;

      history.replaceState({}, '', cleanUrl);
    }
  }catch(e){}
}

async function enforceSessionCloseLogout(){
  return;
}

markSessionLoginFromUrl();

export async function getAuth(){
  return getAuthFresh();
}

export async function getAuthFresh(options = {}){
  const force = !!options.force;
  const now = Date.now();

  if(!force && _authCache && (now - _authFetchedAt) < AUTH_CACHE_TTL){
    return _authCache;
  }

  await enforceSessionCloseLogout();

  try{
    const r = await fetch('/auth_me.php', {
      credentials: 'include',
      cache: 'no-store'
    });

    _authCache = await r.json();
    _authFetchedAt = now;
    try{
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
        cachedAt: now,
        data: _authCache
      }));
    }catch(e){}
    return _authCache;
  }catch(err){
    if(force) throw err;

    try{
      const raw = localStorage.getItem(AUTH_CACHE_KEY);
      if(raw){
        const cached = JSON.parse(raw);
        const payload = cached && typeof cached === 'object' && cached.data ? cached.data : cached;
        const cachedAt = Number(cached && cached.cachedAt ? cached.cachedAt : 0);
        if(payload && typeof payload === 'object'){
          _authCache = payload;
          _authFetchedAt = cachedAt || now;
          return _authCache;
        }
      }
    }catch(e){}
    throw err;
  }
}

export async function favApiBase(){
  const a = await getAuthFresh();
  return a.loggedIn ? '/user_favorites_api.php' : '/favorites_api.php';
}

async function renderNavbarAuthUI(force = false){
  // next param՝ որպեսզի login/register-ից հետո վերադառնա նույն էջը
  const next = location.pathname + location.search + location.hash;

  const loginBtn    = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const userBox     = document.getElementById('userBox');
  const userName    = document.getElementById('userName');
  const logoutBtn   = document.getElementById('logoutBtn');

  // եթե loginBtn չկա՝ nav չկա
  if(!loginBtn && !registerBtn && !userBox) return;

  if(loginBtn)    loginBtn.href    = (window.WP && typeof window.WP.withAppSource === 'function')
    ? window.WP.withAppSource('/loginuser.php?next=' + encodeURIComponent(next))
    : '/loginuser.php?next=' + encodeURIComponent(next);
  if(registerBtn) registerBtn.href = (window.WP && typeof window.WP.withAppSource === 'function')
    ? window.WP.withAppSource('/registeruser.php?next=' + encodeURIComponent(next))
    : '/registeruser.php?next=' + encodeURIComponent(next);

  let a = { loggedIn:false };
  try{ a = await getAuthFresh({ force }); }catch(e){}

  if(a.loggedIn){
    if(loginBtn) loginBtn.style.display = 'none';
    if(registerBtn) registerBtn.style.display = 'none';

    if(userBox){
      userBox.style.display = 'flex';
      userBox.style.alignItems = 'center';
      userBox.style.gap = '10px';
    }
    if(userName) userName.textContent = a.user?.name || a.user?.username || a.user?.email || 'User';

    if(logoutBtn){
      logoutBtn.onclick = () => { window.location.href = '/logout_users.php'; };
    }
  }else{
    if(loginBtn) loginBtn.style.display = '';
    if(registerBtn) registerBtn.style.display = '';
    if(userBox) userBox.style.display = 'none';
  }

  // ✅ unlock page only when auth state is resolved
  document.getElementById('menu')?.classList.remove('auth-pending');
  document.documentElement.classList.remove('auth-lock');
  
  if(!a.loggedIn && /\/account\.html$/i.test(location.pathname)){
    const target = (window.WP && typeof window.WP.withAppSource === 'function')
      ? window.WP.withAppSource('/loginuser.php?next=' + encodeURIComponent(next))
      : '/loginuser.php?next=' + encodeURIComponent(next);
    location.href = target;
  }
}

function startNavbarAuthMonitor(){
  if(_authMonitorStarted) return;
  _authMonitorStarted = true;

  const refresh = () => {
    renderNavbarAuthUI(true).catch(()=>{});
  };

  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'visible'){
      refresh();
    }
  });

  setInterval(()=>{
    if(document.visibilityState === 'visible'){
      refresh();
    }
  }, 15000);

  window.addEventListener('wp-auth-statechange', (event) => {
    const detail = event && event.detail ? event.detail : {};
    if(detail.loggedIn){
      _authCache = null;
      _authFetchedAt = 0;
      renderNavbarAuthUI(true).catch(()=>{});
      return;
    }

    _authCache = { loggedIn: false, session_type: null };
    _authFetchedAt = Date.now();
    try{
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
        cachedAt: _authFetchedAt,
        data: _authCache
      }));
    }catch(e){}
    renderNavbarAuthUI(false).catch(()=>{});
  });
}

export async function initNavbarAuthUI(){
  await renderNavbarAuthUI(false);
  startNavbarAuthMonitor();
}
