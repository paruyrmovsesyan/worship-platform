import re

with open('loader.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace main #wpAppDock CSS blocks
content = re.sub(
    r'"body\.wp-main-app #wpAppDock\{.*?" \+',
    r'"body.wp-main-app #wpAppDock{position:fixed;bottom:max(24px,env(safe-area-inset-bottom,24px));left:50%;transform:translateX(-50%);width:min(400px,calc(100vw - 48px));height:64px;background:#1c1c1e;border-radius:999px;display:flex;justify-content:space-between;align-items:center;z-index:100010;padding:0 8px;box-shadow:0 20px 40px rgba(0,0,0,.5),inset 0 1px 3px rgba(255,255,255,.05);border:none;backdrop-filter:none;-webkit-backdrop-filter:none}" +',
    content, count=1
)

content = re.sub(
    r'"body\.wp-main-app #wpAppDock::before\{.*?" \+\n\s*"body\.wp-main-app #wpAppDock::after\{.*?" \+',
    r'',
    content, count=1
)

content = re.sub(
    r'"body\.wp-main-app #wpAppDockIndicator\{.*?" \+\n\s*"body\.wp-main-app #wpAppDockIndicator::before\{.*?" \+\n\s*"body\.wp-main-app #wpAppDockIndicator::after\{.*?" \+\n\s*"body\.wp-main-app #wpAppDockIndicator\.ready\{.*?" \+',
    r'"body.wp-main-app #wpAppDockIndicator{display:none!important}" +',
    content, count=1
)

content = re.sub(
    r'"body\.wp-main-app #wpAppDock\.dragging.*?\}".*?\n\s*"body\.wp-main-app #wpAppDock\.dragging #wpAppDockIndicator.*?\}".*?\n\s*"body\.wp-main-app\.wp-app-transitioning #wpAppDock\{.*?\}".*?\n\s*"body\.wp-main-app\.wp-app-transitioning #wpAppDockIndicator.*?\}".*?\n',
    r'',
    content, count=1
)

# Now for the .wp-app-dock-link block
dock_link_replacement = (
    '"body.wp-main-app .wp-app-dock-link{display:flex;flex-direction:row;align-items:center;justify-content:center;height:48px;padding:0 14px;color:#8e8e93;transition:all .35s cubic-bezier(.25,1,.5,1);border-radius:999px;text-decoration:none;background:transparent;gap:8px;overflow:hidden;cursor:pointer;font-family:Inter,system-ui,sans-serif;-webkit-tap-highlight-color:transparent}" +\n'
    '          "body.wp-main-app .wp-app-dock-link:hover{color:#d1d1d6;transform:none}" +\n'
    '          "body.wp-main-app .wp-app-dock-link.active,body.wp-main-app .wp-app-dock-link.is-preview{color:#ffffff;background:#3a3a3c;padding:0 20px;transform:none}" +\n'
    '          "body.wp-main-app .wp-app-dock-link svg{width:22px;height:22px;flex-shrink:0;transition:color .2s;stroke:currentColor;fill:none}" +\n'
    '          "body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:none;filter:none}" +\n'
    '          "body.wp-main-app .wp-app-dock-link span.wp-app-dock-label-short{display:none!important}" +\n'
    '          "body.wp-main-app .wp-app-dock-link span.wp-app-dock-label-full{font-size:14px;font-weight:600;white-space:nowrap;opacity:0;max-width:0;transition:all .35s cubic-bezier(.25,1,.5,1);display:block!important}" +\n'
    '          "body.wp-main-app .wp-app-dock-link.active span.wp-app-dock-label-full,body.wp-main-app .wp-app-dock-link.is-preview span.wp-app-dock-label-full{opacity:1;max-width:100px;color:#ffffff;transform:none}" +\n'
    '          "body.wp-main-app.wp-app-transitioning .wp-app-dock-link{opacity:.9}" +\n'
)
content = re.sub(
    r'"body\.wp-main-app \.wp-app-dock-link\{.*?\}".*?\n(?:\s*"body\.wp-main-app .*?\}".*?\n){13}',
    dock_link_replacement,
    content, count=1
)

# And delete the second block of overriden CSS (lines 585-605)
content = re.sub(
    r'"body\.wp-main-app #wpAppDock\{width:min\(374px.*?\}".*?\n(?:\s*"body\.wp-main-app .*?\}".*?\n){20}',
    r'',
    content, count=1
)

# And remove dock overrides inside the large media queries
content = re.sub(r'body\.wp-main-app #wpAppDock\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app #wpAppDock::before\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app #wpAppDock::after\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app #wpAppDockIndicator\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app #wpAppDockIndicator::after\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-label-full\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-label-short\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link span\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link svg\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link:hover\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link\.active,body\.wp-main-app \.wp-app-dock-link\.is-preview\{.*?\}', '', content)
content = re.sub(r'body\.wp-main-app \.wp-app-dock-link\.active svg,body\.wp-main-app \.wp-app-dock-link\.is-preview svg\{.*?\}', '', content)

with open('loader2.js', 'w', encoding='utf-8') as f:
    f.write(content)

