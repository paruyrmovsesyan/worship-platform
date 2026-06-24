with open('loader.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
skip = False
for i, line in enumerate(lines):
    # First chunk to skip: from #wpAppDock{position:fixed up to the line before #wpAppHomeHero
    if '"body.wp-main-app #wpAppDock{position:fixed;' in line:
        skip = True
        
        # Insert our new styles
        out_lines.append('          "body.wp-main-app #wpAppDock{position:fixed;bottom:max(24px,env(safe-area-inset-bottom,24px));left:50%;transform:translateX(-50%);width:min(400px,calc(100vw - 48px));height:64px;background:#1c1c1e;border-radius:999px;display:flex;justify-content:space-between;align-items:center;z-index:100010;padding:0 8px;box-shadow:0 20px 40px rgba(0,0,0,.5),inset 0 1px 3px rgba(255,255,255,.05);border:none;backdrop-filter:none;-webkit-backdrop-filter:none}" +\n')
        out_lines.append('          "body.wp-main-app #wpAppDockIndicator{display:none!important}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link{display:flex;flex-direction:row;align-items:center;justify-content:center;height:48px;padding:0 14px;color:#8e8e93;transition:all .35s cubic-bezier(.25,1,.5,1);border-radius:999px;text-decoration:none;background:transparent;gap:8px;overflow:hidden;cursor:pointer;font-family:Inter,system-ui,sans-serif;-webkit-tap-highlight-color:transparent}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link:hover{color:#d1d1d6;transform:none}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link.active,body.wp-main-app .wp-app-dock-link.is-preview{color:#ffffff;background:#3a3a3c;padding:0 20px;transform:none}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link svg{width:22px;height:22px;flex-shrink:0;transition:color .2s;stroke:currentColor;fill:none}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:none;filter:none}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link span.wp-app-dock-label-short{display:none!important}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link span.wp-app-dock-label-full{font-size:14px;font-weight:600;white-space:nowrap;opacity:0;max-width:0;transition:all .35s cubic-bezier(.25,1,.5,1);display:block!important}" +\n')
        out_lines.append('          "body.wp-main-app .wp-app-dock-link.active span.wp-app-dock-label-full,body.wp-main-app .wp-app-dock-link.is-preview span.wp-app-dock-label-full{opacity:1;max-width:100px;color:#ffffff;transform:none}" +\n')
        continue
        
    if skip and '"body.wp-main-app #wpAppHomeHero{display:grid' in line:
        skip = False
        # Don't skip this line, append it normally

    # Second chunk to skip: from #wpAppDock{width:min(374px to the last line of that block
    if '"body.wp-main-app #wpAppDock{width:min(374px;' in line:
        # Wait, the line actually has 'width:min(374px,'
        skip = True
        continue
        
    if skip and '"body.wp-main-app .wp-app-dock-link.is-pressing' in line:
        # Last line of the overriden dock styles block
        skip = False
        continue

    # The large media query at the end
    if skip and '"@media (max-width:720px)' in line:
        skip = False
        # wait, we don't want to skip this, we handled it separately. But wait, I didn't set skip=True for it.

    if not skip:
        out_lines.append(line)

# Let's clean up the large media query directly
content = "".join(out_lines)
# In the original file, line 583 is a huge media query that has #wpAppDock
import re
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

# And remove the trailing lines that start with "body.wp-main-app #wpAppDock{width:min(374px
content = re.sub(
    r'"body\.wp-main-app #wpAppDock\{width:min\(374px.*?\}".*?\n(?:\s*"body\.wp-main-app .*?\}".*?\n){19}',
    r'',
    content
)

with open('loader2.js', 'w', encoding='utf-8') as f:
    f.write(content)

