// app.js (shared for all pages)
import { initNavbarAuthUI, favApiBase } from '/fav_bridge.js';

// Expose favorites API base for non-module scripts
window.__favApiBase = favApiBase;

function setupHamburger(){
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');
  if(!hamburger || !menu) return;
  if(hamburger.dataset.bound==='1') return;
  hamburger.dataset.bound='1';

  hamburger.addEventListener('click', ()=>{
    hamburger.classList.toggle('active');
    menu.classList.toggle('open');
  });

  // Close menu with animation when any link is clicked
  menu.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click', ()=>{
      menu.classList.add('closing');
      hamburger.classList.remove('active');
      setTimeout(()=>{
        menu.classList.remove('open');
        menu.classList.remove('closing');
      }, 400);
    });
  });
}

function normalizePath(p){
  try{
    // strip query/hash and trailing slash (except root)
    const u = new URL(p, window.location.origin);
    let path = u.pathname || '/';
    if(path.length > 1 && path.endsWith('/')) path = path.slice(0,-1);
    return { path, hash: u.hash || '' };
  }catch(e){
    return { path: p, hash: '' };
  }
}

function setActiveMenu(){
  const menu = document.getElementById('menu');
  if(!menu) return;
  const links = menu.querySelectorAll('a');
  const curPath = window.location.pathname.length>1 && window.location.pathname.endsWith('/') 
    ? window.location.pathname.slice(0,-1) : window.location.pathname;
  const curHash = window.location.hash || '';

  links.forEach(link=>{
    link.classList.remove('active');
    const href = link.getAttribute('href') || '';
    if(!href) return;

    // ignore external links
    if(/^https?:\/\//i.test(href)) return;

    const { path: hrefPath, hash: hrefHash } = normalizePath(href);

    // Match exact page
    if(hrefHash === '' && hrefPath === curPath){
      link.classList.add('active');
      return;
    }

    // Match root variations
    if(hrefHash === '' && (hrefPath === '/' || hrefPath === '/index.html') && (curPath === '/' || curPath === '/index.html')){
      link.classList.add('active');
      return;
    }

    // Match section links like /#features or #features
    if((hrefHash || href.includes('#'))){
      const targetHash = hrefHash || (href.includes('#') ? ('#'+href.split('#')[1]) : '');
      const targetPath = hrefPath || curPath;
      if(targetHash && targetHash === curHash){
        // If href has a path part, ensure it matches current (or root)
        if(targetPath === curPath || targetPath === '/' || targetPath === '/index.html'){
          link.classList.add('active');
        }
      }
    }
  });
}

async function boot(){
  // Mark auth as pending so navbar doesn't flicker
  document.getElementById('menu')?.classList.add('auth-pending');

  // If page uses auth-lock, ensure loader is visible
  window.PageLoader?.show?.();
  try{
    await initNavbarAuthUI();
  }catch(e){
    // fail-safe: don't keep page locked forever
    document.getElementById('menu')?.classList.remove('auth-pending');
    window.PageLoader?.hide?.();
    document.documentElement.classList.remove('auth-lock');
  }

  setupHamburger();
  setActiveMenu();

  // Update active menu on hash change (single-page sections)
  window.addEventListener('hashchange', setActiveMenu);

  // Notify page-specific scripts they can run now
  window.dispatchEvent(new Event('app:ready'));
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot, { once:true });
}else{
  boot();
}
