import os
import re

file_path = "admin_updates.php"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the old Live Release Summary and Checklist (lines 2227-2297 approximately)
# It's bounded by <section class="panel full" id="releaseWorkspacePanel"... </section>
pattern_workspace = re.compile(r'(<section class="panel full" id="releaseWorkspacePanel".*?</section>)', re.DOTALL)
content = pattern_workspace.sub('', content)

# 2. Re-arrange the Grid items for App, Web, Quick Actions, Logic, and Package.
# We will extract the inner contents of App and Web to put them in a side-by-side grid.
app_panel_match = re.search(r'(<section class="panel"[^>]*data-admin-section="release all"[^>]*>\s*<h2>Ծրագիր / PWA</h2>.*?</section>)', content, re.DOTALL)
web_panel_match = re.search(r'(<section class="panel"[^>]*data-admin-section="release all"[^>]*>\s*<h2>Կայք / Web</h2>.*?</section>)', content, re.DOTALL)
quick_panel_match = re.search(r'(<section class="panel full"[^>]*data-admin-section="release maintenance all"[^>]*>\s*<h2>Արագ գործողություններ</h2>.*?</section>)', content, re.DOTALL)
logic_panel_match = re.search(r'(<section class="panel full"[^>]*data-admin-section="release all"[^>]*>\s*<h2>Թարմացման տրամաբանություն</h2>.*?</section>)', content, re.DOTALL)
package_panel_match = re.search(r'(<section class="panel full"[^>]*data-admin-section="release all"[^>]*>\s*<h2>Փաթեթ և տեղադրում</h2>.*?</section>)', content, re.DOTALL)

if not all([app_panel_match, web_panel_match, quick_panel_match, logic_panel_match, package_panel_match]):
    print("Error: Could not find one or more panels.")
    exit(1)

app_panel = app_panel_match.group(1)
web_panel = web_panel_match.group(1)
quick_panel = quick_panel_match.group(1)
logic_panel = logic_panel_match.group(1)
package_panel = package_panel_match.group(1)

# Remove them from the content
content = content.replace(app_panel, '')
content = content.replace(web_panel, '')
content = content.replace(quick_panel, '')
content = content.replace(logic_panel, '')
content = content.replace(package_panel, '')

# Also remove the submit button panel (releaseActionPanel)
action_panel_match = re.search(r'(<section class="panel full" id="releaseActionPanel".*?</section>)', content, re.DOTALL)
if action_panel_match:
    content = content.replace(action_panel_match.group(1), '')

# Now, we build the new grouped layout.
# We will insert it right after `<div class="grid">` (which is still there)
# Actually, the quick actions should be modified to be a sleek toolbar.
# Let's modify the quick actions panel HTML.
new_quick_panel = quick_panel.replace('class="panel full"', 'class="panel full" style="margin-bottom:24px;"')
new_app_panel = app_panel.replace('class="panel"', 'class="panel" style="margin:0;"')
new_web_panel = web_panel.replace('class="panel"', 'class="panel" style="margin:0;"')

# We'll put App and Web in a CSS grid
side_by_side = f"""
          <div class="grid" data-admin-section="release all" style="margin-bottom:24px; width:100%;">
            {new_app_panel}
            {new_web_panel}
          </div>
"""

# We'll make the Logic panel collapsible
new_logic_panel = """
          <section class="panel full" data-admin-section="release all" data-admin-permission="release" style="margin-bottom:24px; padding:16px 24px;">
            <details style="cursor:pointer;">
              <summary style="font-weight:600; outline:none; color:#64748b;">Թարմացման տրամաբանություն և ուղեցույց (Major.Minor.Patch)</summary>
              <p style="margin-top:12px; color:#64748b; font-size:14px; line-height:1.6;"><code>major.minor.patch</code> մոտեցումը պահպանում է թարմացման իմաստը։ Major-ը մեծ փոփոխություն է, Minor-ը նոր հնարավորություն կամ նկատելի թարմացում, Patch-ը փոքր ուղղում։ Թարմացման տեսակը տալիս է հասկանալի բացատրություն, իսկ կարճ նկարագրությունը երևում է update modal-ում։</p>
            </details>
          </section>
"""

new_package_panel = package_panel.replace('class="panel full"', 'class="panel full" style="margin-bottom:80px;"')

# Let's create the sticky footer!
sticky_footer = """
        <div data-admin-section="release all" style="position:fixed; bottom:0; left:260px; right:0; background:rgba(255,255,255,0.95); backdrop-filter:blur(8px); border-top:1px solid #e2e8f0; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; z-index:100; box-shadow:0 -4px 20px rgba(0,0,0,0.04);">
          <div style="display:flex; gap:24px; align-items:center;">
             <div class="release-check" id="releaseCheckVersions" data-state="done" style="display:flex; align-items:center; gap:8px;">
               <div class="release-check-badge" style="width:28px;height:28px;border-radius:14px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">1</div>
               <strong style="font-size:14px; color:#0f172a;">Տարբերակներ</strong>
             </div>
             <div class="release-check" id="releaseCheckMessages" data-state="done" style="display:flex; align-items:center; gap:8px;">
               <div class="release-check-badge" style="width:28px;height:28px;border-radius:14px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">2</div>
               <strong style="font-size:14px; color:#0f172a;">Տեքստեր</strong>
             </div>
             <div class="release-check" id="releaseCheckPackage" data-state="<?= !empty($config['server_package_file']) ? 'done' : 'warn' ?>" style="display:flex; align-items:center; gap:8px;">
               <div class="release-check-badge" style="width:28px;height:28px;border-radius:14px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">3</div>
               <strong style="font-size:14px; color:#0f172a;">Փաթեթ</strong>
             </div>
             <div class="release-check" id="releaseCheckMaintenance" data-state="<?= $isMaintenanceActive || $isScheduledActive ? 'warn' : 'done' ?>" style="display:flex; align-items:center; gap:8px;">
               <div class="release-check-badge" style="width:28px;height:28px;border-radius:14px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">4</div>
               <strong style="font-size:14px; color:#0f172a;">Աշխատանքներ</strong>
             </div>
             <div class="chips" style="margin:0 0 0 16px;">
               <div class="chip" id="releaseApplyModeChip" style="background:#e0e7ff; color:#4338ca; border:none; font-weight:600;">Առանց ֆայլի կցման</div>
               <div class="autosave-status" id="releaseAutosaveStatus" data-state="idle" style="display:none;"></div>
             </div>
          </div>
          <button class="btn" style="background:#f97316; color:#fff; font-weight:600; padding:12px 32px; border-radius:8px; border:none; box-shadow:0 4px 12px rgba(249,115,22,0.3); cursor:pointer; font-size:15px; transition:all 0.2s;" type="submit" name="form_action" value="apply_release" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(249,115,22,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(249,115,22,0.3)';">Կիրառել Թարմացումը</button>
        </div>
"""

# We need to insert these right after `<div class="grid">` inside the form.
grid_open_pattern = r'(<form id="releaseControlForm"[^>]*>.*?<div class="grid">)'
replacement_with_footer = r'\1\n' + new_quick_panel + side_by_side + new_logic_panel + new_package_panel + sticky_footer

content = re.sub(grid_open_pattern, replacement_with_footer, content, flags=re.DOTALL)

# Additionally, let's make sure the old CSS for `.release-check` isn't forcing it into a vertical list.
# The inline styles `display:flex; align-items:center; gap:8px;` override that.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Redesign applied successfully.")
