<?php
session_start();
if(!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true){
    header("Location: login_old.php");
    exit;
}
?>

<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/wolarmyouth.jpg" type="image/jpeg">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Worship Platform">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070910">
<script src="/pwa-init.js" defer></script>
<title>Wolarm Youth - Երգերի Բազա</title>
<style>
:root{
  --bg:#f6f7fb; --fg:#0f1222; --muted:#667085; --card:#ffffff;
  --primary:#0b69d6; --danger:#d64545; --ring:#d9e4ff;
}
*{box-sizing:border-box}
body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Arial;
     background:var(--bg); color:var(--fg); padding:24px; line-height:1.45}
.app{max-width:1000px;margin:0 auto;background:var(--card);padding:20px;border-radius:14px;
     box-shadow:0 10px 30px rgba(20,20,50,.06)}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
header h2{margin:0}
header small{color:var(--muted)}
header a{background:#d64545;color:#fff;text-decoration:none;padding:8px 14px;
  border-radius:8px;font-size:14px;}
header a:hover{background:#a83232;}
label{font-size:14px;color:var(--muted);display:block;margin-top:10px}
input[type="text"]{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #dde3ee;outline:none}
input[type="text"]:focus, textarea:focus{box-shadow:0 0 0 4px var(--ring)}
textarea{width:100%;height:160px;resize:vertical;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         padding:10px 12px;border-radius:10px;border:1px solid #dde3ee}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
.row .spacer{flex:1}
button{padding:9px 12px;border:0;border-radius:10px;background:var(--primary);color:white;cursor:pointer}
button.secondary{background:#eef2ff;color:#21315b}
button.danger{background:red;}
.preview{white-space:pre-wrap;background:#fbfcff;border:1px dashed #e6e9f5;border-radius:12px;padding:12px;margin-top:12px}
.chord{font-weight:700;color:#0b3c78}
table{width:100%;border-collapse:collapse;margin-top:12px}
th, td{padding:10px;border-bottom:1px solid #eef0f6;text-align:left;font-size:14px}
th{color:#6b7280;font-weight:600}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#C5F3BE;color:#21315b;font-size:12px}
.hint{color:#6b7280;font-size:12px}
.controls{display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap}
input[type="range"]{flex:1}
/* Key buttons grid */
.key-buttons {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}
.key-buttons button {
  padding: 8px;
  border: 1px solid #ccc;
  background: white;
  color: black;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.key-buttons button.active {
  background: #2196f3;
  color: white;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
}
.small-note{font-size:12px;color:var(--muted);margin-top:6px}
</style>
</head>
<body>
<div class="app">
  <header style="justify-content: flex-end;">
    <a href="logout.php" >Ելք</a>
  </header>
  <header>
    <div>
      <h2>Երգերի բազա </h2>
      <small>Պահպանեք, փնտրեք, տրանսպոզ արեք և արտահանեք երգերը</small>
    </div>
    <div class="pill">v2.1 BETA</div>
  </header>

  <section aria-label="editor">
    <label>Երգի անունը</label>
    <input id="title" type="text" placeholder="Օր. Մեր սուրբ Աստված">
    <label>Կատարողը</label>
    <input id="artist" type="text" placeholder="Օր. Խմբի անուն">
    <label>Սկզբնական տոնայնություն (օր. C, G, F#m)</label>
    <input id="key" type="text" placeholder="Օր. C">
    <label>Տեգեր (բաժանեք `,`-ով)</label>
    <input id="tags" type="text" placeholder="օր. worship, fast, armenian">

    <label>Երգի բառերը և chords (ուղիղ, առանց [])</label>
    <textarea id="lyrics" placeholder="C Օրինակ տող
G Երկրորդ տող
Am F Եվ այլն"></textarea>

    <div class="controls" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1">
          <label style="margin-bottom:6px;display:block">Ընտրիր նպատակային տոնայնությունը</label>
          <div id="keysGrid" class="key-buttons" role="tablist" aria-label="Տոնայնություններ"></div>
        </div>
      </div>
      <div style="min-width:160px">
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:6px" title="Օգտագործել bemol-ներ (Db, Eb...)">
          <input id="useFlats" type="checkbox"> Use flats
        </label>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button id="saveSong" style="background: #2196f3;">Պահպանել</button>
          <button id="clearForm" class="secondary">Մաքրել</button>
          <button id="downloadTxt" class="secondary">TXT</button>
          <button id="exportPdf" class="secondary">PDF</button>
        </div>
      </div>
    </div>

    <label>Նախադիտում</label>
    <div id="preview" class="preview" aria-live="polite"></div>
  </section>

  <hr>

  <section aria-label="list">
    <h3 style="margin:10px 0 6px">Երգերի ցանկ</h3>
    <input id="search" type="text" placeholder="Որոնել անունով, կատարողով, բառերով կամ տեգերով…">
    <table aria-label="songs table">
      <thead>
        <tr><th>Անուն</th><th>Տոնայն.</th><th>Գործ.</th></tr>
      </thead>
      <tbody id="songsTable"></tbody>
    </table>
  </section>

  <hr>
</div>

<footer>
  <p style="text-align: center; font-size: 11px"><b>Wolarm Youth 2025 | PM Studio 2025</b></p>
</footer>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
// ----------------- ES5 VARIABLES -----------------
var SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function noteIndex(note){
  if(!note) return -1;
  var m = (''+note).trim().match(/^([A-Ga-g])([#b♭]?)/);
  if(!m) return -1;
  var root = (m[1].toUpperCase() + (m[2]||'')).replace(/♭/g,'b');
  for(var i=0;i<SHARPS.length;i++){ if(SHARPS[i]===root) return i; }
  for(var i=0;i<FLATS.length;i++){ if(FLATS[i]===root) return i; }
  if(root==='E#') return SHARPS.indexOf('F');
  if(root==='B#') return SHARPS.indexOf('C');
  if(root==='Fb') return SHARPS.indexOf('E');
  if(root==='Cb') return SHARPS.indexOf('B');
  return -1;
}

function transposeRoot(root, semi, useFlats){
  var i = noteIndex(root);
  if(i<0) return root;
  var autoFlats = (''+root).indexOf('b')>=0 && (''+root).indexOf('#')===-1;
  var useFlat = useFlats || autoFlats;
  var idx = (i + semi + 12) % 12;
  return useFlat ? FLATS[idx] : SHARPS[idx];
}

function escapeHtml(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderWithChords(text, semi, useFlats){
  text = text||'';
  semi = semi||0;
  useFlats = useFlats||false;
  var chordRegex = /(^|[\s\(\[])([A-G](?:#|b)?)([mM0-9majdimaugaddsus]*)?(?:\/([A-G](?:#|b)?))?(?=[\s\)\]\,]|$)/g;
  var lines = text.split('\n');
  var result = [];
  for(var li=0; li<lines.length; li++){
    var line = lines[li];
    line = line.replace(chordRegex,function(match,prefix,root,type,bass){
      var newRoot = transposeRoot(root, semi, useFlats);
      var out = prefix + '<span class="chord">' + newRoot + (type||'');
      if(bass){ out += '/' + transposeRoot(bass, semi, useFlats); }
      out += '</span>';
      return out;
    });
    result.push(line);
  }
  return result.join('\n');
}

// DOM REFERENCES
var titleI=document.getElementById('title'),
    artistI=document.getElementById('artist'),
    keyI=document.getElementById('key'),
    tagsI=document.getElementById('tags'),
    lyricsI=document.getElementById('lyrics'),
    useFlatsI=document.getElementById('useFlats'),
    preview=document.getElementById('preview'),
    keysGrid=document.getElementById('keysGrid'),
    saveBtn=document.getElementById('saveSong'),
    clearBtn=document.getElementById('clearForm'),
    downloadTxtBtn=document.getElementById('downloadTxt'),
    exportPdfBtn=document.getElementById('exportPdf'),
    searchI=document.getElementById('search'),
    tableBody=document.getElementById('songsTable');

var selectedTargetKey = '';

// BUILD KEY BUTTONS
var KEY_OPTIONS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
for(var i=0;i<KEY_OPTIONS.length;i++){
  (function(k){
    var btn = document.createElement('button');
    btn.type='button';
    btn.innerHTML = k;
    btn.dataset.key = k;
    btn.onclick = function(){
      var btns = keysGrid.getElementsByTagName('button');
      for(var j=0;j<btns.length;j++){ btns[j].className=''; }
      this.className='active';
      selectedTargetKey = k;
      renderPreview();
    };
    keysGrid.appendChild(btn);
  })(KEY_OPTIONS[i]);
}

// LIVE PREVIEW
function computeSemiForLive(originalKey,targetKey){
  if(!originalKey || !targetKey) return 0;
  var from = noteIndex(originalKey);
  var to = noteIndex(targetKey);
  if(from<0 || to<0) return 0;
  return (to - from + 12)%12;
}

function renderPreview(){
  var originalKey = keyI.value.trim();
  var targetKey = selectedTargetKey;
  var semi = 0;
  if(originalKey && targetKey){ semi = computeSemiForLive(originalKey,targetKey); }
  preview.innerHTML = renderWithChords(lyricsI.value, semi, useFlatsI.checked);
}

keyI.oninput = renderPreview;
lyricsI.oninput = renderPreview;
useFlatsI.onchange = renderPreview;
renderPreview();

// ---------------- TXT EXPORT ----------------
downloadTxtBtn.onclick = function(){
  var blob = new Blob([lyricsI.value||''], {type:'text/plain;charset=utf-8'});
  if(window.navigator.msSaveOrOpenBlob){ window.navigator.msSaveOrOpenBlob(blob, (titleI.value||'song')+'.txt'); }
  else {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download = (titleI.value||'song')+'.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
};

// ---------------- PDF EXPORT ----------------
exportPdfBtn.onclick = function(){
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('jsPDF չի բեռնվել'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var y=20;
  doc.setFontSize(14);
  doc.text(titleI.value || 'Untitled', 10, y); y+=8;
  if(artistI.value){ doc.setFontSize(12); doc.text('Կատարող: '+artistI.value, 10, y); y+=8; }
  if(keyI.value){ doc.text('Տոնայնություն: '+keyI.value, 10, y); y+=8; }
  var semi = (keyI.value && selectedTargetKey) ? computeSemiForLive(keyI.value.trim(),selectedTargetKey) : 0;
  var lines = (lyricsI.value||'').split('\n');
  doc.setFontSize(12);
  for(var li=0; li<lines.length; li++){
    var line = lines[li];
    line = line.replace(/\b([A-G][#b]?)(m|maj|min|dim|aug|sus2|sus4|7|9|11|13)?(\/[A-G][#b]?)?\b/g,
      function(match,root,type,bass){
        var newRoot = transposeRoot(root, semi, useFlatsI.checked);
        var out = newRoot + (type||'');
        if(bass){ out += '/' + transposeRoot(bass.slice(1), semi, useFlatsI.checked); }
        return '('+out+')';
      });
    var chunks = doc.splitTextToSize(line, 180);
    for(var ci=0; ci<chunks.length; ci++){
      if(y>280){ doc.addPage(); y=20; }
      doc.text(chunks[ci],10,y); y+=7;
    }
  }
  doc.save((titleI.value||'song')+'.pdf');
};

// ---------------- CLEAR FORM ----------------
clearBtn.onclick = function(){ clearForm(); };
function clearForm(){
  titleI.value=''; artistI.value=''; keyI.value=''; tagsI.value=''; lyricsI.value='';
  selectedTargetKey = '';
  var btns = keysGrid.getElementsByTagName('button');
  for(var i=0;i<btns.length;i++){ btns[i].className=''; }
  useFlatsI.checked = false;
  renderPreview();
}

// ---------------- SEARCH / LOAD / DELETE ----------------
function xhrGet(url,callback){
  var xhr = new XMLHttpRequest();
  xhr.open('GET',url,true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState===4 && xhr.status===200){
      callback(JSON.parse(xhr.responseText||'[]'));
    }
  };
  xhr.send();
}

function xhrPost(url,data,callback){
  var xhr = new XMLHttpRequest();
  xhr.open('POST',url,true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.onreadystatechange=function(){
    if(xhr.readyState===4){ callback(JSON.parse(xhr.responseText||'{}')); }
  };
  xhr.send(JSON.stringify(data));
}

function xhrPut(url,data,callback){
  var xhr = new XMLHttpRequest();
  xhr.open('PUT',url,true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.onreadystatechange=function(){
    if(xhr.readyState===4){ callback(JSON.parse(xhr.responseText||'{}')); }
  };
  xhr.send(JSON.stringify(data));
}

function xhrDelete(url,callback){
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE',url,true);
  xhr.onreadystatechange=function(){
    if(xhr.readyState===4){ if(callback) callback(); }
  };
  xhr.send();
}

// ---------------- SAVE SONG ----------------
saveBtn.onclick = function(){
  var song = {
    title:titleI.value.trim(),
    artist:artistI.value.trim(),
    key:keyI.value.trim(),
    tags:tagsI.value.trim(),
    lyrics:lyricsI.value
  };
  xhrPost('api.php',song,function(r){
    alert('Պահպանված է!');
    clearForm();
    fetchSongs();
  });
};

// ---------------- FETCH SONGS ----------------
function fetchSongs(filter){
  filter = filter||'';
  var url = filter ? 'api.php?q='+encodeURIComponent(filter) : 'api.php';
  xhrGet(url,function(songs){ renderTable(songs); });
}

// ---------------- RENDER TABLE ----------------
function renderTable(songs){
  tableBody.innerHTML='';
  for(var i=0;i<songs.length;i++){
    var s = songs[i];
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>'+escapeHtml(s.title||'')+'</td>'+
                   '<td>'+escapeHtml(s.song_key||'')+'</td>'+
                   '<td>'+
                   '<button class="secondary" onclick="loadSong('+s.id+')">Բեռնել</button>'+
                   '<button class="secondary" onclick="editSong('+s.id+')">Խմբագրել</button>'+
                   '<button class="danger" onclick="deleteSong('+s.id+')">Ջնջել</button>'+
                   '<button class="secondary" onclick="openSongInNewTab('+s.id+')">Դիտել</button>'+
                   '</td>';
    tableBody.appendChild(tr);
  }
}

// ---------------- OTHER FUNCTIONS ----------------
function loadSong(id){
  xhrGet('api.php?id='+id,function(s){
    titleI.value = s.title;
    artistI.value = s.artist;
    keyI.value = s.song_key;
    tagsI.value = s.tags;
    lyricsI.value = s.lyrics;
    selectedTargetKey='';
    var btns = keysGrid.getElementsByTagName('button');
    for(var i=0;i<btns.length;i++){ btns[i].className=''; }
    renderPreview();
    window.scrollTo(0,0);
  });
}

function deleteSong(id){
  if(!confirm('Իսկապե՞ս ջնջել այս երգը։')) return;
  xhrDelete('api.php?id='+id,function(){ fetchSongs(); });
}

function openSongInNewTab(id){
  window.open('song_view.html?id='+id,'_blank');
}

// ---------------- INIT ----------------
fetchSongs();
</script>
</body>
</html>
