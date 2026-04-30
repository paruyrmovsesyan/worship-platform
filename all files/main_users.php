<?php
session_start();
if(empty($_SESSION['user_id'])){
    header("Location: loginuser.php");
    exit;
}
$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'];
?>

<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Wolarm Youth — Songs</title>
<link rel="icon" href="wolarm_youth.png" type="image/png" />
<style>
:root{
  --bg:#f3f6fb; --surface:rgba(255,255,255,0.75); --text:#0f1222; --muted:#6b7280;
  --primary:#3367ff; --primary-variant:#2247d6; --accent:#ff6b6b;
  --card-elev:0 6px 18px rgba(18,25,40,0.08);
  --glass-border:rgba(255,255,255,0.45); --row-hover:rgba(51,103,255,0.06);
  --heart-active:#ff3b30; --radius-lg:16px; --radius-md:12px; --radius-sm:10px;
  --shadow-soft:0 8px 24px rgba(21,32,84,0.08); --fs-base:15px;
}
:root.dark{
  --bg:linear-gradient(180deg,#071021,#081426);
  --surface:rgba(18,24,32,0.6);
  --text:#e6eef8; --muted:#9aa7bf;
  --primary:#6ea8ff; --primary-variant:#4a90ff; --accent:#ff8b94;
  --card-elev:0 10px 30px rgba(0,0,0,0.5);
  --glass-border:rgba(255,255,255,0.04); --row-hover:rgba(110,168,255,0.06);
  --heart-active:#ff6b81; --shadow-soft:0 10px 30px rgba(0,0,0,0.5);
}
*{box-sizing:border-box;}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;padding:16px;font-size:var(--fs-base);
  transition:background .25s ease,color .2s ease;}
.container{max-width:1200px;margin:0 auto;}
.header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;}
.brand h1{margin:0;font-size:20px;font-weight:700;letter-spacing:-0.2px;}
.brand p{margin:6px 0 0 0;color:var(--muted);font-size:13px;}
.controls{display:flex;gap:10px;}
.search-card{display:flex;align-items:center;gap:10px;padding:8px;border-radius:14px;
  backdrop-filter:blur(10px) saturate(120%);background:linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.5));
  border:1px solid var(--glass-border);box-shadow:var(--shadow-soft);min-width:450px;max-width:700px;}
:root.dark .search-card{background:linear-gradient(180deg, rgba(20,28,36,0.55), rgba(20,28,36,0.45));}
.search-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-variant));
  display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;box-shadow:0 6px 14px rgba(51,103,255,0.12);}
.search-input{border:0;background:transparent;outline:none;font-size:15px;color:var(--text);width:100%;padding-right:6px;}
.search-input::placeholder{color:rgba(15,18,34,0.4);}
:root.dark .search-input::placeholder{color:#797a7b;}
.link-modern{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;
  background:linear-gradient(135deg,#ff6b6b,#ffd86f);color:#fff;text-decoration:none;font-weight:700;
  box-shadow:0 6px 18px rgba(255,107,107,0.14);}
.theme-btn{display:inline-flex;align-items:center;gap:8px;padding:8px;border-radius:10px;border:1px solid transparent;
  background:var(--surface);cursor:pointer;font-weight:600;box-shadow:var(--card-elev);}
:root.dark .theme-btn{background:rgba(255,255,255,0.02); color:white;}

.section{margin-top:18px;}
.table-card{margin-top:10px;border-radius:var(--radius-lg);overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.45));
  border:1px solid var(--glass-border);box-shadow:var(--card-elev);backdrop-filter: blur(10px) saturate(120%); opacity: 0;
  transform: translateY(15px);
  transition: opacity 0.4s ease, transform 0.4s ease;}
.table-card.show {
  opacity: 1;
  transform: translateY(0);
}
:root.dark .table-card{background:linear-gradient(180deg, rgba(14,20,28,0.6), rgba(14,20,28,0.45));}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--glass-border);}
.table-header h2{margin:0;font-size:16px;}
.songs-count{color:var(--muted);font-weight:700;}
table{width:100%;border-collapse:collapse;table-layout:fixed;}
thead th{text-align:left;color:var(--muted);font-weight:700;padding:12px;}
tbody tr{transition:background .18s,transform .12s;}
tbody tr:hover{background:var(--row-hover);transform:translateY(-1px);cursor:pointer;}
td{padding:12px;border-bottom:1px solid var(--glass-border);font-size:15px;vertical-align:middle;}
td.title-cell{width:calc(100% - 72px);}
td.heart-cell{width:72px;text-align:center;}
.title-text{font-weight:500;display:inline-block;transition:font-weight .18s,color .18s;}
.title-text::before{content:attr(data-text);font-weight:700;visibility:hidden;display:block;height:0;}
tbody tr:hover .title-text{font-weight:700;color:var(--primary);}
.heart-btn{background:transparent;border:0;font-size:20px;color:var(--muted);cursor:pointer;padding:8px;border-radius:10px;transition:transform .18s,color .18s;}
.heart-btn:active{transform:scale(.95);}
.heart-btn.active{color:var(--heart-active);}
.heart-btn.pulse{animation:heartPulse .8s cubic-bezier(.2,.9,.3,1);}
@keyframes heartPulse{0%{transform:scale(1)}35%{transform:scale(1.25)}70%{transform:scale(0.95)}100%{transform:scale(1)}}

/* Upcoming floating */
#upcomingBox{position:fixed;top:18px;right:18px;width:240px;border-radius:14px;padding:12px;background:linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.5));
border:1px solid var(--glass-border);box-shadow:var(--shadow-soft);backdrop-filter:blur(10px) saturate(120%);z-index:9999;transition: all 0.35s ease, opacity 0.25s ease;
  opacity: 1;}
  #upcomingBox.hide {
  opacity: 0;
  transform: translateY(-12px);
  pointer-events: none;
}
:root.dark #upcomingBox{background:linear-gradient(180deg, rgba(18,24,32,0.6), rgba(18,24,32,0.45));}
#upcomingBox header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
#upcomingBox h3{margin:0;font-size:14px;color:var(--primary);font-weight:700;}
.up-controls{display:flex;gap:8px;align-items:center;}
.up-btn{background:transparent;border:0;padding:6px;border-radius:8px;cursor:pointer;color:var(--muted);}
.up-badge{background:linear-gradient(90deg,var(--primary),var(--primary-variant));color:white;padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px;}
#upcomingList{list-style:none;padding:0;margin:0;max-height:220px;overflow:auto;}
#upcomingList li{padding:8px 6px;border-bottom:1px solid rgba(0,0,0,0.04);font-size:14px;}
#upcomingList li:last-child{border-bottom:none;}
.footer{margin-top:18px;padding:14px;border-radius:12px;text-align:center;background:var(--surface);border:1px solid var(--glass-border);box-shadow:var(--card-elev);}
button:focus,a:focus,input:focus{outline:none;box-shadow:0 6px 20px rgba(51,103,255,0.12);border-radius:8px;}
/* Mini button animation */
#upcomingMiniBtn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3367ff, #2247d6);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  display: none;
  z-index: 10000;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

#upcomingMiniBtn.show {
  display: inline-block;
  opacity: 1;
  transform: translateY(0);
}


@media (max-width:720px){
  body{padding:12px;}
  #upcomingBox{right:12px;top:12px;width:190px;padding:10px;}
  .search-card{min-width:unset;width:140%;}
  .controls {
  display: flex;
  flex-wrap: wrap; /* պետք է, որ փոքր էկրաններում էլ փթրվի */
  align-items: center;
  gap: 10px; /* տարածություն բոլոր control-ների միջև */
  justify-content: space-between; /* աջ կողմում կանգնեցնելու համար */
}
  td{padding:12px 8px;}
  td.heart-cell{width:64px;}
  .heart-btn{font-size:22px;}
  
  td{border-bottom:none;}
  tr { 
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    margin-bottom: 8px;
  }

  td.title-cell {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 0;
  }

  td.title-cell .title-text {
    white-space: normal;       /* Այժմ երկար վերնագրերը կկատարվեն լրիվ տողերով */
    overflow: visible;         /* Չկտրել տեքստը */
  }

  td.heart-cell {
    flex: 0;
    padding: 0;
    text-align: right;
  }

  table, thead, tbody, td, th { display: block; }
  thead { display: none; }

}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#C5F3BE;color:#21315b;font-size:12px}

.login-btn{
  
  position: absolute;
  top: 12px;
  right: 12px;
  align-items:center;
  gap:8px;
  padding:8px 14px;
  border-radius:12px;
  background:linear-gradient(135deg,#3367ff,#2247d6);
  color:#fff;
  text-decoration:none;
  font-weight:700;
  box-shadow:0 6px 18px rgba(51,103,255,0.18);
}
.update-modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.55);
  display:none;
  align-items:center;
  justify-content:center;
  z-index:100000;
  backdrop-filter: blur(4px);
}

.update-box{
  background:linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.85));
  border-radius:18px;
  padding:22px;
  max-width:340px;
  text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,0.25);
}

:root.dark .update-box{
  background:linear-gradient(180deg,rgba(18,24,32,0.9),rgba(18,24,32,0.85));
  color:#fff;
}

.update-box h3{
  margin:0 0 10px;
  font-size:18px;
}

.update-box p{
  margin:0 0 14px;
  color:var(--muted);
  font-size:14px;
}

.update-box button{
  padding:10px 20px;
  border-radius:12px;
  border:none;
  font-weight:700;
  background:linear-gradient(135deg,var(--primary),var(--primary-variant));
  color:#fff;
  cursor:pointer;
  box-shadow:0 6px 18px rgba(51,103,255,0.25);
}

#maintenance{
  position:fixed;
  inset:0;
  background:#0f172a;
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:99999;
}

#maintenance .box{
  text-align:center;
  max-width:420px;
  padding:30px;
  border-radius:16px;
  background:rgba(255,255,255,0.08);
}

</style>
</head>
<body>
<div id="maintenance" style="display:none">
  <div class="box">
    <h1>⚠ Տեխնիկական խնդիր</h1>
    <p id="maintenance-text"></p>
  </div>
</div>

    <div class="pill">v2.2</div>
<div class="container">
    <!-- Small Mini Button 
<button id="upcomingMiniBtn" aria-label="Շուտով երգերը">🎵 Շուտով</button>-->
<div class="pill">Բարև, <?=htmlspecialchars($username)?>!</div>
<a class="login-btn" href="logout_users.php">🔐 Դուրս գալ</a>



  <div class="header">
    <div class="brand"><h1>Wolarm Youth Worship</h1><p>Խմբագրում • Երգերի ցանկ</p></div>
    <div class="controls">
      <div class="search-card"><div class="search-icon">🔎</div><input id="searchBox" class="search-input" type="text" placeholder="Որոնել երգը — Օր. Մեր սուրբ Աստված"></div>
      <a class="link-modern" href="favorites_users.html">❤ Իմ պահպանած երգերը</a>
      <button id="themeToggle" class="theme-btn"><span id="themeIcon">🌙</span> Թեմա</button>
    </div>
  </div>

  <div id="upcomingBox">
    <header><h3>Շուտով</h3>
      <div class="up-controls"><div id="upBadge" class="up-badge" style="display:none">0</div>
      <button id="dragHandle" class="up-btn" title="Move">⋮</button>
      <button id="closeUpcoming" class="up-btn" title="Close">✕</button></div></header>
    <ul id="upcomingList"></ul>
  </div>

  <div class="section">
    <div class="table-card">
      <div class="table-header">
        <h2>Բոլոր երգերը</h2>
        <div id="songsCount" class="songs-count">Ընդհանուր: 0 երգ</div>
      </div>
      <div style="overflow:auto">
        <table><thead><tr><th>Անուն</th><th style="width:100px;text-align:center">Հավանել</th></tr></thead>
        <tbody id="songsTable"></tbody></table>
      </div>
    </div>
  </div>
  <footer class="footer">Wolarm Youth 2026 | PM Studio 2026</footer>
  <br><br>
</div>

<div id="updateModal" class="update-modal">
  <div class="update-box">
    <h3>🚀 Կայքի նոր տարբերակ</h3>
    <p>Կայքը թարմացվել է։ Խնդրում ենք թարմացնել էջը նոր ֆունկցիաների համար։</p>
    <button onclick="refreshSite()">Թարմացնել</button>
  </div>
</div>

<script>
fetch('/status.php')
  .then(res => res.json())
  .then(data => {
    if(data.maintenance){
      document.getElementById('maintenance').style.display = 'flex';
      document.getElementById('maintenance-text').innerText = data.message;
      document.body.style.overflow = 'hidden';
    }
  });
  
const SITE_VERSION_USERS = "2.2";

const tableBody = document.getElementById('songsTable');
const searchBox = document.getElementById('searchBox');
const songsCountEl = document.getElementById('songsCount');
const upcomingBox = document.getElementById('upcomingBox');
const upcomingList = document.getElementById('upcomingList');
const upBadge = document.getElementById('upBadge');
const closeUpcoming = document.getElementById('closeUpcoming');
const dragHandle = document.getElementById('dragHandle');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const upcomingMiniBtn = document.getElementById('upcomingMiniBtn');

let allSongs = [];
let favoriteIds = new Set();

document.addEventListener("DOMContentLoaded", () => {
  const wasClosed = localStorage.getItem("upcoming_closed") === "1";

  if (wasClosed) {
    upcomingBox.style.display = "none";
    upcomingMiniBtn.classList.add("show");
  } else {
    upcomingBox.style.display = "block";
  }
});

/* Theme toggle */
function setTheme(isDark){
  if(isDark) document.documentElement.classList.add('dark'); 
  else document.documentElement.classList.remove('dark');
  themeToggle.setAttribute('aria-pressed',isDark?'true':'false');
  themeIcon.textContent=isDark?'☀️':'🌙';
  try{localStorage.setItem('wolarm_isDark',''+(isDark?1:0));}catch(e){}
}
(function(){
  try{
    const v=localStorage.getItem('wolarm_isDark');
    setTheme(v==='1');
  }catch(e){setTheme(false);}
})();
themeToggle.addEventListener('click',()=>setTheme(!document.documentElement.classList.contains('dark')));

/* Render upcoming */
function renderUpcomingFloating(list){
  upcomingList.innerHTML='';
  if(!Array.isArray(list)||list.length===0){
    upcomingList.innerHTML='<li style="color:var(--muted)">Ոչինչ չի սպասվում</li>';
    upBadge.style.display='none';
    return;
  }
  list.forEach(item=>{
    const li=document.createElement('li');
    li.textContent=item.title||'Անվանումը բացակայում է';
    upcomingList.appendChild(li);
  });
  upBadge.textContent=String(list.length);
  upBadge.style.display='inline-block';
}

/* Animated close => show mini button */
closeUpcoming.addEventListener('click', () => {
  // Հիշել, որ օգտվողը փակել է
  localStorage.setItem("upcoming_closed", "1");

  upcomingBox.classList.add('hide');
  setTimeout(() => {
    upcomingBox.style.display = 'none';
    upcomingMiniBtn.classList.add('show');
  }, 250);
});

/* Mini button click => show full upcoming box 
upcomingMiniBtn.addEventListener('click', () => {
  // Հիշողությունը ջնջել — հիմա թող նորից երևա
  localStorage.removeItem("upcoming_closed");

  upcomingMiniBtn.classList.remove('show');
  upcomingBox.style.display = 'block';
  upcomingBox.classList.add('hide');

  setTimeout(() => {
    upcomingBox.classList.remove('hide');
  }, 50);
});*/


/* Draggable upcoming */
let dragging=false,startX=0,startY=0,initLeft=0,initTop=0;
function pointerDown(e){
  dragging=true;
  const rect=upcomingBox.getBoundingClientRect();
  initLeft=rect.left; initTop=rect.top;
  startX=(e.clientX!==undefined)?e.clientX:e.touches[0].clientX;
  startY=(e.clientY!==undefined)?e.clientY:e.touches[0].clientY;
  upcomingBox.style.transition='none'; e.preventDefault();
}
function pointerMove(e){
  if(!dragging) return;
  const clientX=(e.clientX!==undefined)?e.clientX:(e.touches&&e.touches[0].clientX);
  const clientY=(e.clientY!==undefined)?e.clientY:(e.touches&&e.touches[0].clientY);
  let newLeft=initLeft+(clientX-startX), newTop=initTop+(clientY-startY);
  newLeft=Math.max(8,Math.min(window.innerWidth-upcomingBox.offsetWidth-8,newLeft));
  newTop=Math.max(8,Math.min(window.innerHeight-upcomingBox.offsetHeight-8,newTop));
  upcomingBox.style.left=newLeft+'px'; upcomingBox.style.top=newTop+'px'; upcomingBox.style.right='auto';
}
function pointerUp(){dragging=false;}
dragHandle.addEventListener('mousedown',pointerDown);
window.addEventListener('mousemove',pointerMove);
window.addEventListener('mouseup',pointerUp);
dragHandle.addEventListener('touchstart',pointerDown,{passive:true});
window.addEventListener('touchmove',pointerMove,{passive:false});
window.addEventListener('touchend',pointerUp);

/* Escape html */
function escapeHtml(s){
  return String(s).replace(/[&<>"'`=\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60','=':'&#x3D;'}[c]));
}


function getDisplayTitle(title){
  if(!title) return '';

  const parts = title.split('/').map(p => p.trim());

  let mainAr = '';
  let arParens = [];

  for(const part of parts){
    // եթե սա փակագծով հատված է
    if(part.startsWith('(') && part.endsWith(')')){
      // եթե փակագծի մեջ հայերեն կա
      if (/[\u0530-\u058F]/.test(part)) {
        arParens.push(part);
      }
    } 
    // եթե սա հիմնական հատված է և հայերեն ունի
    else if(!mainAr && /[\u0530-\u058F]/.test(part)){
      mainAr = part;
    }
  }

  // եթե կա հայերեն հիմնական վերնագիր
  if(mainAr){
    return mainAr + (arParens.length ? ' ' + arParens.join(' ') : '');
  }

  // եթե հայերեն ընդհանրապես չկա
  return title;
}

/* Render songs */
function renderSongs(list){
  tableBody.innerHTML='';
  (list||[]).forEach(song=>{
    const id=String(song.id);
    const tr=document.createElement('tr');
    tr.onclick=()=>openSong(id);
    tr.innerHTML=`
      <td class="title-cell">
        <div class="title-text"
     data-text="${escapeHtml(getDisplayTitle(song.title||''))}">
  ${escapeHtml(getDisplayTitle(song.title||''))}
</div>
      </td>
      <td class="heart-cell">
        <button class="heart-btn ${favoriteIds.has(id)?'active':''}" aria-label="Հավանել" onclick="event.stopPropagation(); toggleFavorite('${id}',this)">
          ${favoriteIds.has(id)?'❤':'♡'}
        </button>
      </td>`;
    tableBody.appendChild(tr);
  });
  songsCountEl.textContent='Ընդհանուր: '+(list?list.length:0)+' երգ';
  
  const cards = document.querySelectorAll('.table-card');

cards.forEach((card, index) => {
  setTimeout(() => {
    card.classList.add('show');
  }, index * 70); // stagger animation (առաջին՝ 0 ms, երկրորդ՝ 70ms...)
});
}

/* Toggle favorite */
async function toggleFavorite(id,el){
  try{
    el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'),700);
    el.style.transform='scale(1.05)'; setTimeout(()=>el.style.transform='',160);
    const res=await fetch('favorites_users.php?action=toggle_favorite',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({song_id:id})
    });
    const data=await res.json();
    if(data&&data.favorite){favoriteIds.add(id); el.classList.add('active'); el.textContent='❤';} 
    else {favoriteIds.delete(id); el.classList.remove('active'); el.textContent='♡';}
  }catch(e){console.error(e);}
}

/* Open song */
function openSong(id){window.location.href='songview_users.html?id='+encodeURIComponent(id);}

/* Search */
searchBox.addEventListener('input',function(){
  const q=this.value.trim().toLowerCase();
  const filtered=allSongs.filter(s=>(s.title||'').toLowerCase().includes(q)||(s.tags||'').toLowerCase().includes(q));
  renderSongs(filtered);
});

/* Load all songs + upcoming */
async function loadAllSongs(){
  try{
    let upcoming=[]; 
    try{
      const r=await fetch('upcoming.php'); if(r.ok) upcoming=await r.json();
    }catch(e){ console.warn(e); }
    renderUpcomingFloating(upcoming);
    const [songsRes,favsRes]=await Promise.all([fetch('api.php'),fetch('favorites_users.php?action=get_favorites')]);
    allSongs=await songsRes.json();
    favoriteIds=new Set((await favsRes.json()||[]).map(x=>String(x.id)));
    renderSongs(allSongs);
  }catch(e){console.error(e);}
}
loadAllSongs();

/* Respect reduced motion */
(function(){
  try{ if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.documentElement.style.setProperty('scroll-behavior','auto'); 
  }catch(e){}
})();


// 🔄 Ստուգել կայքի update-ը
(function(){
  const savedVersion = localStorage.getItem("site_version_users");

  if (!savedVersion) {
    localStorage.setItem("site_version_users", SITE_VERSION);
    return;
  }

  if (savedVersion !== SITE_VERSION) {
    const modal = document.getElementById("updateModal");
    if (modal) modal.style.display = "flex";
  }
})();
function refreshSite(){
  localStorage.setItem("site_version_users", SITE_VERSION);

  // cache busting
  const url = new URL(window.location.href);
  url.searchParams.set('v', SITE_VERSION);

  window.location.href = url.toString();
}
</script>
</body>
</html>
