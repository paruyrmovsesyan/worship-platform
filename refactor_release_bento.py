import re
import os

file_path = "admin_updates.php"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract the panels
quick_panel_match = re.search(r'(<section class="panel full" style="margin-bottom:24px;" data-admin-section="release maintenance all" data-admin-permission="release,maintenance">.*?<h2>Արագ գործողություններ</h2>.*?</section>)', content, re.DOTALL)
app_web_grid_match = re.search(r'(<div class="grid" data-admin-section="release all" style="margin-bottom:24px; width:100%;">\s*<section class="panel".*?<h2>Ծրագիր / PWA</h2>.*?</section>\s*<section class="panel".*?<h2>Կայք / Web</h2>.*?</section>\s*</div>)', content, re.DOTALL)
logic_panel_match = re.search(r'(<section class="panel full" data-admin-section="release all" data-admin-permission="release" style="margin-bottom:24px; padding:16px 24px;">\s*<details.*?</section>)', content, re.DOTALL)
package_panel_match = re.search(r'(<section class="panel full" style="margin-bottom:80px;" data-admin-section="release all" data-admin-permission="release">\s*<h2>Փաթեթ և տեղադրում</h2>.*?</section>)', content, re.DOTALL)
sticky_footer_match = re.search(r'(<div data-admin-section="release all" style="position:fixed; bottom:0; left:260px; right:0;.*?</button>\s*</div>)', content, re.DOTALL)
stats_match = re.search(r'(<div class="stats" data-admin-section="release maintenance all" data-admin-permission="release,maintenance">\s*<div class="stat">.*?</div>\s*</div>)', content, re.DOTALL)

if not all([quick_panel_match, app_web_grid_match, logic_panel_match, package_panel_match, sticky_footer_match, stats_match]):
    print("Error: Could not find all panels.")
    # Print which ones failed
    print("quick:", bool(quick_panel_match))
    print("grid:", bool(app_web_grid_match))
    print("logic:", bool(logic_panel_match))
    print("package:", bool(package_panel_match))
    print("footer:", bool(sticky_footer_match))
    print("stats:", bool(stats_match))
    exit(1)

quick_panel = quick_panel_match.group(1)
app_web_grid = app_web_grid_match.group(1)
logic_panel = logic_panel_match.group(1)
package_panel = package_panel_match.group(1)
sticky_footer = sticky_footer_match.group(1)
stats_panel = stats_match.group(1)

# Remove all of them from the content
content = content.replace(quick_panel, '')
content = content.replace(app_web_grid, '')
content = content.replace(logic_panel, '')
content = content.replace(package_panel, '')
content = content.replace(sticky_footer, '')

# We will leave stats_panel in the HTML but change its data-admin-section to "maintenance all" so it doesn't show in release
new_stats_panel = stats_panel.replace('data-admin-section="release maintenance all"', 'data-admin-section="maintenance all"')
content = content.replace(stats_panel, new_stats_panel)

# Remove any extra margin from package panel
new_package_panel = package_panel.replace('style="margin-bottom:80px;"', 'style="margin-bottom:0;"')

# Create the new Bento layout HTML
bento_layout = f"""
<style>
.deploy-bento-layout {{
  display: flex; gap: 32px; align-items: flex-start; margin-top: 16px; margin-bottom: 40px;
}}
.deploy-sidebar {{
  flex: 0 0 320px;
  position: sticky;
  top: 96px; /* below topbar */
  background: #1e293b;
  border-radius: 20px;
  padding: 24px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}}
.deploy-stepper {{
  display: flex; flex-direction: column; gap: 16px; margin-top: 12px;
}}
.deploy-step {{
  display: flex; align-items: center; gap: 12px; opacity: 0.5; transition: 0.2s;
}}
.deploy-step[data-state="done"] {{ opacity: 1; }}
.deploy-step[data-state="warn"] {{ opacity: 1; color: #facc15; }}
.deploy-step-badge {{
  width: 32px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;
}}
.deploy-step[data-state="done"] .deploy-step-badge {{ background: #10b981; color: #fff; }}
.deploy-step[data-state="warn"] .deploy-step-badge {{ background: #facc15; color: #854d0e; }}
.deploy-step strong {{ font-size: 15px; font-weight: 500; }}
.deploy-sidebar .btn-submit {{
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; border:none; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; text-align: center; margin-top: 8px;
  box-shadow: 0 4px 12px rgba(234,88,12,0.3); transition: 0.2s;
}}
.deploy-sidebar .btn-submit:hover {{ transform: translateY(-2px); box-shadow: 0 6px 16px rgba(234,88,12,0.4); }}

.deploy-main {{
  flex: 1; display: flex; flex-direction: column; gap: 24px; min-width: 0;
}}
.deploy-main .panel {{
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  border: 1px solid #f1f5f9;
  margin-bottom: 0 !important;
}}

@media(max-width: 1000px) {{
  .deploy-bento-layout {{ flex-direction: column; }}
  .deploy-sidebar {{ position: static; width: 100%; flex: auto; }}
}}
</style>

<div class="deploy-bento-layout" data-admin-section="release all" data-admin-permission="release">
  
  <div class="deploy-sidebar">
    <div style="display:flex; flex-direction:column; gap:4px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1);">
       <span style="font-size:12px; font-weight:600; letter-spacing:1px; color:#94a3b8; text-transform:uppercase;">Current Live</span>
       <div style="font-size:32px; font-weight:800; color:#fff; line-height:1;">v<?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?></div>
       <div style="font-size:13px; color:#cbd5e1; margin-top:4px;">Web: v<?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?></div>
       <div style="font-size:12px; color:#64748b; margin-top:8px;">Updated: <?= htmlspecialchars(wp_version_format_datetime_admin((string)$config['updated_at']) ?: '—', ENT_QUOTES) ?></div>
    </div>
    
    <div class="deploy-stepper">
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
    <button class="btn-submit" type="submit" name="form_action" value="apply_release">
       <span style="display:block; font-size:18px;">Կիրառել Թարմացումը</span>
       <span id="releaseApplyModeChip" style="display:block; font-size:12px; font-weight:500; opacity:0.9; margin-top:4px;">Առանց ֆայլի կցման</span>
    </button>
  </div>

  <div class="deploy-main">
    {quick_panel}
    {app_web_grid}
    {new_package_panel}
    {logic_panel}
  </div>

</div>
"""

# We need to insert `bento_layout` right after the form opening tag, or right after `<input type="hidden" name="csrf_token"...>`
insert_pattern = r'(<input type="hidden" name="csrf_token" value=".*?">)'
content = re.sub(insert_pattern, r'\1\n' + bento_layout, content, count=1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Bento Redesign applied successfully.")
