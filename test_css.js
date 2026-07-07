const fs = require('fs');
let css = fs.readFileSync('/Users/paruyrmovsesyan/Desktop/CCTV/worship.pmstudio.am/5.0_active/worship.pmstudio.am/frontend/src/pages/Chat.css', 'utf8');
css = css.replace(/body\.chat-active[\s\S]*?}/, `body.chat-active, 
html.chat-active {
  overscroll-behavior-y: none !important;
}`);
css = css.replace(/#root {[\s\S]*?}/, ``);
css = css.replace(/\.chat-page-container {\n  position: fixed !important;[\s\S]*?}/, `.chat-page-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100dvh !important;
  overflow: hidden !important;
  overscroll-behavior-y: none !important;
}`);
console.log('done');
