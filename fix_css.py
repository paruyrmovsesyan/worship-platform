import re

css_to_add = """
/* --- NEW STRUCTURAL CSS FIXES --- */
.app-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 40px;
  background: var(--bg);
}
.app-content {
  padding: 0 40px 40px 40px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.search-box input {
  padding: 12px 20px;
  padding-left: 44px;
  border-radius: 30px;
  border: none;
  background: #ffffff;
  width: 280px;
  font-family: inherit;
  font-size: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  outline: none;
}
.search-box {
  position: relative;
}
.search-box::before {
  content: '🔍';
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 14px;
}
.tabs-row {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 32px;
}
.tab {
  padding: 0 4px 16px;
  color: var(--muted);
  font-weight: 600;
  cursor: pointer;
  position: relative;
}
.tab.active {
  color: var(--primary);
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--primary);
  border-radius: 3px 3px 0 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  color: var(--muted);
  font-weight: 600;
  text-decoration: none;
  border-radius: 12px;
  margin: 4px 16px;
  transition: 0.2s;
  border: none;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  text-align: left;
}
.nav-item:hover {
  background: rgba(67, 24, 255, 0.05);
}
.nav-item.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 15px rgba(67, 24, 255, 0.3);
}
.section-switcher .section-tab {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  color: var(--muted);
  font-weight: 600;
  text-decoration: none;
  border-radius: 12px;
  margin: 4px 16px;
  transition: 0.2s;
  border: none;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  text-align: left;
  width: calc(100% - 32px);
}
.section-switcher .section-tab.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 15px rgba(67, 24, 255, 0.3);
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}
.stat {
  padding: 28px;
  border-radius: var(--radius-lg);
  background: #ffffff;
  border: none;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}
/* Override any legacy stats colors from nth-child */
.stat:nth-child(n) { background: #ffffff !important; }
"""

def inject_css(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Inject before </style>
    if '</style>' in content:
        content = content.replace('</style>', css_to_add + '\n</style>', 1)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected CSS into {filename}")
    else:
        print(f"Could not find </style> in {filename}")

inject_css('admin_updates.php')
inject_css('songs.php')

