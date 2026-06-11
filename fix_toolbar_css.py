import re

css_to_add = """
/* --- ADDITIONAL STRUCTURAL CSS FIXES --- */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  padding: 0;
  border: none;
}
.toolbar-left {
  display: flex;
  gap: 16px;
  align-items: center;
}
.lang-switcher {
  display: flex;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 20px;
}
.lang-btn {
  padding: 6px 16px;
  border-radius: 16px;
  color: var(--muted);
  font-weight: 700;
  font-size: 13px;
  text-decoration: none;
}
.lang-btn.active {
  background: var(--text);
  color: #fff;
}
.section-focus {
  background: #ffffff;
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  box-shadow: var(--shadow-sm);
}
.section-focus-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-focus-copy h2 { margin: 0; font-size: 24px; color: var(--text); }
.section-focus-copy p { margin: 0; color: var(--muted); }
.section-focus-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-end;
}
.chips {
  display: flex;
  gap: 8px;
}
.chip {
  background: #f1f5f9;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.table-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  padding: 16px 24px;
  color: var(--muted);
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid var(--line);
}
td {
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
  color: var(--text);
  font-weight: 600;
}
tbody tr:last-child td {
  border-bottom: none;
}
"""

def inject_css(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '</style>' in content:
        content = content.replace('</style>', css_to_add + '\n</style>', 1)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected additional CSS into {filename}")

inject_css('admin_updates.php')
inject_css('songs.php')
