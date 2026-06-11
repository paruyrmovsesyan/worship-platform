import re

file_path = "admin_updates.php"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract the section-switcher block
switcher_pattern = re.compile(r'(<\?php if \(\$hasAnyAdminSectionAccess\): \?>\s*<div class="section-switcher".*?<\?php endif; \?>)', re.DOTALL)
switcher_match = switcher_pattern.search(content)
if not switcher_match:
    print("Could not find section-switcher")
    exit(1)
switcher_html = switcher_match.group(1)
content = content.replace(switcher_html, '')

# 2. Extract the sectionFocusBar
focus_pattern = re.compile(r'(<section class="section-focus" id="sectionFocusBar".*?</section>)', re.DOTALL)
focus_match = focus_pattern.search(content)
focus_html = focus_match.group(1) if focus_match else ""
if focus_html:
    content = content.replace(focus_html, '')

# 3. Refactor panels inside the release section
# We only want to modify panels inside <form id="releaseControlForm">
quick_panel_match = re.search(r'(<section class="panel full"[^>]*data-admin-section="release maintenance all"[^>]*>\s*<h2>Արագ գործողություններ</h2>.*?</section>)', content, re.DOTALL)
app_panel_match = re.search(r'(<section class="panel"[^>]*>\s*<h2>Ծրագիր / PWA</h2>.*?</section>)', content, re.DOTALL)
web_panel_match = re.search(r'(<section class="panel"[^>]*>\s*<h2>Կայք / Web</h2>.*?</section>)', content, re.DOTALL)
logic_panel_match = re.search(r'(<section class="panel full"[^>]*>\s*<h2>Թարմացման տրամաբանություն</h2>.*?</section>)', content, re.DOTALL)
package_panel_match = re.search(r'(<section class="panel full"[^>]*>\s*<h2>Փաթեթ և տեղադրում</h2>.*?</section>)', content, re.DOTALL)
action_panel_match = re.search(r'(<section class="panel full" id="releaseActionPanel".*?</section>)', content, re.DOTALL)

if not all([quick_panel_match, app_panel_match, web_panel_match, logic_panel_match, package_panel_match, action_panel_match]):
    print("Could not find all release panels.")
    print("quick:", bool(quick_panel_match))
    print("app:", bool(app_panel_match))
    print("web:", bool(web_panel_match))
    print("logic:", bool(logic_panel_match))
    print("package:", bool(package_panel_match))
    print("action:", bool(action_panel_match))
    exit(1)

quick_panel = quick_panel_match.group(1)
app_panel = app_panel_match.group(1)
web_panel = web_panel_match.group(1)
logic_panel = logic_panel_match.group(1)
package_panel = package_panel_match.group(1)
action_panel = action_panel_match.group(1)

content = content.replace(quick_panel, '')
content = content.replace(app_panel, '')
content = content.replace(web_panel, '')
content = content.replace(logic_panel, '')
content = content.replace(package_panel, '')
content = content.replace(action_panel, '')

# Build new panels
new_quick_panel = quick_panel.replace('class="panel full"', 'class="panel full" style="margin-bottom:24px;"')
new_app_panel = app_panel.replace('class="panel"', 'class="panel" style="margin:0;"')
new_web_panel = web_panel.replace('class="panel"', 'class="panel" style="margin:0;"')
side_by_side = f"""
<div class="grid" data-admin-section="release all" style="margin-bottom:24px; width:100%;">
  {new_app_panel}
  {new_web_panel}
</div>
"""
new_logic_panel = """
<section class="panel full" data-admin-section="release all" data-admin-permission="release" style="margin-bottom:24px; padding:16px 24px;">
  <details style="cursor:pointer;">
    <summary style="font-weight:600; outline:none; color:#64748b;">Թարմացման տրամաբանություն և ուղեցույց (Major.Minor.Patch)</summary>
    <p style="margin-top:12px; color:#64748b; font-size:14px; line-height:1.6;"><code>major.minor.patch</code> մոտեցումը պահպանում է թարմացման իմաստը։ Major-ը մեծ փոփոխություն է, Minor-ը նոր հնարավորություն կամ նկատելի թարմացում, Patch-ը փոքր ուղղում։ Թարմացման տեսակը տալիս է հասկանալի բացատրություն, իսկ կարճ նկարագրությունը երևում է update modal-ում։</p>
  </details>
</section>
"""
new_package_panel = package_panel.replace('class="panel full"', 'class="panel full" style="margin-bottom:24px;"')

# Inject refactored panels back right after `<div class="stats"...></div>`
# In v11, the `stats` div ends with </div></div>
stats_pattern = r'(<div class="stats"[^>]*>.*?</div>\s*</div>)'
replacement_panels = r'\1\n' + new_quick_panel + side_by_side + new_package_panel + new_logic_panel
content = re.sub(stats_pattern, replacement_panels, content, count=1, flags=re.DOTALL)

# Stepper and Deploy HTML for the sidebar
stepper_deploy_html = f"""
<div data-admin-section="release all" style="display:flex; flex-direction:column; gap:24px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.1);">
  <div style="display:flex; flex-direction:column; gap:16px;">
     <div class="deploy-step" id="releaseCheckVersions" data-state="done">
       <div class="deploy-step-badge">1</div>
       <strong>Տարբերակներ</strong>
     </div>
     <div class="deploy-step" id="releaseCheckMessages" data-state="done">
       <div class="deploy-step-badge">2</div>
       <strong>Տեքստեր</strong>
     </div>
     <div class="deploy-step" id="releaseCheckPackage" data-state="<?= !empty($config['server_package_file']) ? 'done' : 'warn' ?>">
       <div class="deploy-step-badge">3</div>
       <strong>Փաթեթ</strong>
     </div>
     <div class="deploy-step" id="releaseCheckMaintenance" data-state="<?= $isMaintenanceActive || $isScheduledActive ? 'warn' : 'done' ?>">
       <div class="deploy-step-badge">4</div>
       <strong>Աշխատանքներ</strong>
     </div>
  </div>
  <div class="autosave-status" id="releaseAutosaveStatus" data-state="idle" style="display:none; color:#cbd5e1; font-size:13px; text-align:center;"></div>
  
  <div style="text-align:center;">
    <span id="releaseApplyModeChip" style="display:block; font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; margin-bottom:8px;">Առանց ֆայլի կցման</span>
    <button class="btn-submit" type="submit" form="releaseControlForm" name="form_action" value="apply_release" style="width:100%;">
       <span style="display:block; font-size:16px;">Կիրառել Թարմացումը</span>
    </button>
  </div>
</div>
"""

global_bento_style = """
<style>
.global-bento-container {
  display: flex; gap: 32px; align-items: flex-start; margin-top: 24px; max-width: 1400px; padding: 0 24px;
}
.global-bento-sidebar {
  flex: 0 0 300px; position: sticky; top: 96px;
  background: #1e293b; border-radius: 20px; padding: 24px;
  display: flex; flex-direction: column; gap: 24px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.global-bento-sidebar::-webkit-scrollbar { width: 6px; }
.global-bento-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }

.global-bento-sidebar .section-switcher {
  display: flex; flex-direction: column; gap: 8px;
  background: transparent; border: none; padding: 0; box-shadow: none;
}
.global-bento-sidebar .section-tab {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 12px 16px; border-radius: 12px;
  background: transparent; border: none; color: #94a3b8; text-align: left;
  transition: all 0.2s; cursor: pointer; width: 100%;
}
.global-bento-sidebar .section-tab:hover {
  background: rgba(255,255,255,0.05); color: #fff;
}
.global-bento-sidebar .section-tab.active {
  background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; box-shadow: 0 4px 12px rgba(234,88,12,0.3);
}
.global-bento-sidebar .section-tab span { font-weight: 600; font-size: 15px; margin-bottom: 4px; display:flex; align-items:center; gap:8px; }
.global-bento-sidebar .section-tab small { display: none; }
.global-bento-sidebar .section-tab.active small { display: block; color: rgba(255,255,255,0.8); font-size: 12px; line-height: 1.4; }

.deploy-step { display: flex; align-items: center; gap: 12px; opacity: 0.5; transition: 0.2s; color: #fff; }
.deploy-step[data-state="done"] { opacity: 1; }
.deploy-step[data-state="warn"] { opacity: 1; color: #facc15; }
.deploy-step-badge { width: 32px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; color: #fff; }
.deploy-step[data-state="done"] .deploy-step-badge { background: #10b981; color: #fff; }
.deploy-step[data-state="warn"] .deploy-step-badge { background: #facc15; color: #854d0e; }
.deploy-step strong { font-size: 15px; font-weight: 500; }
.btn-submit {
  background: #10b981; color: #fff; border:none; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; text-align: center;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: 0.2s;
}
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16,185,129,0.4); }

.global-bento-main {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px;
}
.global-bento-main .panel {
  box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; margin-bottom: 0 !important;
}
@media(max-width: 1000px) {
  .global-bento-container { flex-direction: column; padding: 0 16px; }
  .global-bento-sidebar { position: static; width: 100%; flex: auto; max-height: none; }
}

/* Remove margin from adminLayout so it fits nicely inside global-bento-main */
#adminLayout { margin: 0; padding: 0; }
</style>
"""

sidebar_html = f"""
  <div class="global-bento-sidebar">
    <div style="padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1);">
      <h2 style="color:#fff; margin:0 0 4px; font-size:20px;">Կառավարում</h2>
      <p style="color:#94a3b8; font-size:13px; margin:0;">Համակարգի կենտրոնական վահանակ</p>
    </div>
    
    {switcher_html}
    {stepper_deploy_html}
  </div>
"""

# Insert the layout wrapper right after the banner
# Also include focus_html in main area
banner_pattern = r'(<div\s*class="banner.*?</div\s*>)'
wrapper_start = f"{global_bento_style}\n<div class=\"global-bento-container\">\n{sidebar_html}\n<div class=\"global-bento-main\">\n{focus_html}\n"
content = re.sub(banner_pattern, r'\1\n' + wrapper_start, content, count=1, flags=re.DOTALL)

# Close the wrapper right before `<script>` tag
content = content.replace('  <script>', '</div></div>\n  <script>')

# Save
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Global Bento applied successfully.")
