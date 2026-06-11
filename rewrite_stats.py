import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_stat(match):
    inner = match.group(1)
    # inner looks like:
    # <strong>...</strong>
    # <span>...</span>
    
    strong_match = re.search(r'<strong>(.*?)</strong>', inner, re.DOTALL)
    span_match = re.search(r'<span>(.*?)</span>', inner, re.DOTALL)
    
    strong_val = strong_match.group(1) if strong_match else ""
    span_val = span_match.group(1) if span_match else ""
    
    # We will build the rich layout
    new_html = f"""
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">{span_val}</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;">{strong_val}</strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>"""
    return new_html

# Replace all <div class="stat"> ... </div>
# using regex that handles nested tags carefully, assuming <div class="stat"> doesn't contain divs inside originally
pattern = re.compile(r'<div class="stat">\s*(.*?)\s*</div>', re.DOTALL)

new_content = pattern.sub(replace_stat, content)

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Rewrote all stats blocks in admin_updates.php")
