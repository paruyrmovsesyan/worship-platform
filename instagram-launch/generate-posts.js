const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = __dirname;
const out = path.join(root, 'posts');
fs.mkdirSync(out, { recursive: true });

const font = fs.readFileSync(path.join(root, '..', 'NotoSansArmenian-normal.js'), 'utf8');
const fontMatch = font.match(/base64,([A-Za-z0-9+/=]+)/);
const fontFace = fontMatch
  ? `@font-face{font-family:WorshipArm;src:url(data:font/ttf;base64,${fontMatch[1]}) format('truetype');}`
  : '';
const logo = fs.readFileSync(path.join(root, 'assets', 'profile-picture.png')).toString('base64');
const campaign = fs.readFileSync(path.join(root, 'assets', 'campaign-background.png')).toString('base64');

const posts = [
  {n:'01', kicker:'ԲՐԵՆԴԻ ՆԵՐԿԱՅԱՑՈՒՄ', title:['ԲԱՐԻ ԳԱԼՈՒՍՏ','WORSHIP PLATFORM'], body:'Քրիստոնեական երգեր, բառեր, ակորդներ և սեթլիստներ մեկ հարթակում', cta:'Բացահայտիր հարթակը', hero:true},
  {n:'02', kicker:'ԵՐԳԵՐԻ ԳՐԱԴԱՐԱՆ', title:['ԳՏԻՐ ԲԱՌԵՐՆ ՈՒ','ԱԿՈՐԴՆԵՐԸ'], body:'Որոնիր երգը կամ կատարողին և բացիր անհրաժեշտ տարբերակը մեկ վայրում', cta:'Բացիր երգերի գրադարանը', icon:'♫'},
  {n:'03', kicker:'ՏՈՆԱՅՆՈՒԹՅԱՆ ՓՈՓՈԽՈՒԹՅՈՒՆ', title:['ՓՈԽԻՐ','ՏՈՆԱՅՆՈՒԹՅՈՒՆԸ'], body:'Ընտրիր քեզ հարմար տոնայնությունը, իսկ ակորդները կվերափոխվեն ավտոմատ', cta:'Փորձիր մեկ հպումով', icon:'±'},
  {n:'04', kicker:'ՍԵԹԼԻՍՏՆԵՐ', title:['ՍՏԵՂԾԻՐ ՔՈ','ԵՐԳԱՑԱՆԿԸ'], body:'Դասավորիր հաջորդ ծառայության երգերը ճիշտ հերթականությամբ և պահիր մեկ տեղում', cta:'Ստեղծիր առաջին սեթլիստը', icon:'≡'},
  {n:'05', kicker:'ՊԱՀՊԱՆՎԱԾ ԵՐԳԵՐ ԵՎ PDF', title:['ՊԱՀՊԱՆԻՐ ԵՐԳԵՐԸ','ԱՐՏԱՀԱՆԻՐ PDF'], body:'Հավաքիր հաճախ օգտագործվող երգերը և պատրաստիր նյութերը փորձի կամ ծառայության համար', cta:'Քո երգերը միշտ քեզ հետ', icon:'♡'},
  {n:'06', kicker:'ԵՐԳԻ ՀԱՐՑՈՒՄ', title:['ՉԳՏԱՐ','ԱՆՀՐԱԺԵՇՏ ԵՐԳԸ'], body:'Ուղարկիր նոր երգի կամ երգի ուղղման հարցում հենց հարթակից', cta:'Օգնիր մեծացնել գրադարանը', icon:'+'},
  {n:'07', kicker:'ԹԻՄԱՅԻՆ ԱՇԽԱՏԱՆՔ', title:['ՊԱՏՐԱՍՏՎԵՔ','ՄԻԱՍԻՆ'], body:'Հավաքեք թիմի երգերը, նյութերն ու սեթլիստները մեկ հասանելի միջավայրում', cta:'Միացրու քո worship թիմը', icon:'◎'},
  {n:'08', kicker:'ՏԵՂԱԴՐՈՒՄ', title:['ՏԵՂԱԴՐԻՐ','ՈՐՊԵՍ ԾՐԱԳԻՐ'], body:'Օգտագործիր Worship Platform-ը կայքում, հեռախոսում կամ համակարգչում', cta:'Բացիր և ընտրիր Տեղադրել', icon:'↓'},
  {n:'09', kicker:'ՍԿՍԻՐ ԱՅՍՕՐ', title:['ԱՎԵԼԻ ՔԻՉ ՈՐՈՆՈՒՄ','ԱՎԵԼԻ ՇԱՏ ԵՐԿՐՊԱԳՈՒԹՅՈՒՆ'], body:'Գտիր երգերը, պատրաստիր սեթլիստը և կենտրոնացիր ծառայության վրա', cta:'worship.pmstudio.am', icon:''},
];

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function wrap(text, max=34) {
  const words=text.split(' '), lines=[]; let line='';
  for(const word of words){ const next=line?`${line} ${word}`:word; if(next.length>max&&line){lines.push(line);line=word;}else line=next; }
  if(line) lines.push(line); return lines;
}
function textLines(lines, x, y, size, gap, cls='title') {
  return lines.map((l,i)=>`<text x="${x}" y="${y+i*gap}" class="${cls}" font-size="${size}">${esc(l)}</text>`).join('');
}
function svg(p){
  const bodyLines=wrap(p.body, 43);
  const bodyY = p.title.length > 2 ? 612 : (p.title.length > 1 ? 540 : 470);
  const ctaWidth = Math.min(760, Math.max(420, p.cta.length * 18 + 72));
  const ctaCenter = 72 + ctaWidth / 2;
  const bg=p.hero
    ? `<image href="data:image/png;base64,${campaign}" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/><rect width="1080" height="1080" fill="url(#heroShade)"/>`
    : `<rect width="1080" height="1080" fill="#0b1020"/><circle cx="900" cy="140" r="420" fill="url(#glow)"/><circle cx="90" cy="1040" r="390" fill="url(#glow2)"/><path d="M-70 820 C240 620 420 1020 760 770 S1120 510 1190 720" fill="none" stroke="url(#line)" stroke-width="2" opacity=".45"/>`;
  const decorative=(p.hero || !p.icon)?'':`<rect x="714" y="210" width="246" height="246" rx="62" fill="rgba(255,255,255,.055)" stroke="rgba(255,255,255,.12)"/><text x="837" y="380" text-anchor="middle" class="symbol" font-size="150">${p.icon}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs><style>${fontFace} text{font-family:WorshipArm,'Noto Sans Armenian',Arial,sans-serif}.title{fill:#fff;font-weight:900;letter-spacing:-1px}.kicker{fill:#9fffd1;font-weight:800;letter-spacing:3px}.body{fill:#dce6ff;font-weight:500}.small{fill:#fff;font-weight:700}.symbol{fill:#fff;font-weight:300}</style>
    <linearGradient id="heroShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071025" stop-opacity=".95"/><stop offset=".58" stop-color="#071025" stop-opacity=".35"/><stop offset="1" stop-color="#071025" stop-opacity=".12"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#5138ff" stop-opacity=".9"/><stop offset="1" stop-color="#5138ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow2"><stop stop-color="#00e790" stop-opacity=".52"/><stop offset="1" stop-color="#00e790" stop-opacity="0"/></radialGradient>
    <linearGradient id="line"><stop stop-color="#6748ff"/><stop offset="1" stop-color="#00ef9c"/></linearGradient>
    <linearGradient id="button"><stop stop-color="#6d43ff"/><stop offset="1" stop-color="#00c98a"/></linearGradient>
  </defs>
  ${bg}${decorative}
  <image href="data:image/png;base64,${logo}" x="72" y="66" width="82" height="82"/>
  <text x="174" y="101" class="small" font-size="25">WORSHIP</text><text x="174" y="130" class="body" font-size="19">PLATFORM</text>
  <text x="72" y="254" class="kicker" font-size="19">${esc(p.kicker)}</text>
  ${textLines(p.title,72,350,58,72)}
  ${textLines(bodyLines,72, bodyY, 28,42,'body')}
  <rect x="72" y="858" width="${ctaWidth}" height="76" rx="38" fill="url(#button)"/>
  <text x="${ctaCenter}" y="907" text-anchor="middle" class="small" font-size="23">${esc(p.cta)}</text>
  <text x="${ctaCenter}" y="1005" text-anchor="middle" class="small" font-size="30" letter-spacing="0.4">worship.pmstudio.am</text><text x="1008" y="1005" text-anchor="end" class="body" font-size="18">${p.n} / 09</text>
  </svg>`;
}

(async()=>{
  for(const p of posts){
    await sharp(Buffer.from(svg(p))).png().toFile(path.join(out, `post-${p.n}.png`));
  }
  await sharp(path.join(root,'assets','profile-picture.png')).resize(1080,1080).png().toFile(path.join(out,'profile-picture-1080.png'));
  const thumbs = await Promise.all(posts.map(p => sharp(path.join(out, `post-${p.n}.png`)).resize(360,360).toBuffer()));
  await sharp({create:{width:1080,height:1080,channels:4,background:'#0b1020'}})
    .composite(thumbs.map((input,i)=>({input,left:(i%3)*360,top:Math.floor(i/3)*360})))
    .png().toFile(path.join(root,'grid-preview.png'));
  console.log(`Created ${posts.length} Instagram posts and profile picture in ${out}`);
})();
