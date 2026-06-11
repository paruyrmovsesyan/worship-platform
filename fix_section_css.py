css_patch = """
/* ─── Section tabs styled as nav-items ─────────────────── */
button.section-tab.nav-item {
  width: calc(100% - 32px);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  border-radius: 12px;
  margin: 4px 16px;
  transition: background 0.2s, color 0.2s;
  text-align: left;
}
button.section-tab.nav-item:hover {
  background: rgba(67, 24, 255, 0.05);
  color: var(--text);
}
button.section-tab.nav-item.active {
  background: var(--primary);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(67, 24, 255, 0.3);
}
button.section-tab.nav-item.active svg {
  stroke: #ffffff;
}

/* Sidebar must flex column with scroll */
.app-sidebar {
  overflow-y: auto;
  overflow-x: hidden;
}
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding-bottom: 8px;
}
"""

for filename in ['admin_updates.php', 'songs.php']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    if '</style>' in content:
        content = content.replace('</style>', css_patch + '\n</style>', 1)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"CSS patch applied to {filename}")
