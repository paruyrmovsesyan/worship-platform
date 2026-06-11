import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the entire <div class="shell"> ... </div>
# up to the end of the HTML before JS scripts.

html_start = content.find('<div class="shell">')
# The end of the HTML is before <script> tags begin
html_end = content.find('<script>', html_start)

if html_start == -1 or html_end == -1:
    print("Could not find HTML boundaries")
    exit(1)

new_html = """
  <div class="aether-layout">
    <!-- Top Header -->
    <header class="aether-header">
      <div class="header-left">
      </div>
      <div class="header-right">
        <div class="header-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </div>
        <div class="header-icon-btn active-notification">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span class="badge">3</span>
        </div>
        <div class="header-profile">
          <img src="wolarm_developers.png" alt="Profile">
          <span>Profile ▾</span>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="aether-workspace">
      
      <!-- Left Column -->
      <div class="aether-main-col">
        
        <div class="section-head">
          <h2 class="section-title">Analytics Overview</h2>
          <div class="date-picker">📅 2026 - 08/28</div>
        </div>

        <div class="analytics-grid">
          <div class="analytic-card">
            <div class="analytic-info">
              <span class="analytic-label">Total Songs</span>
              <strong class="analytic-value" id="statTotalSongs">0</strong>
            </div>
            <div class="analytic-chart chart-purple">
              <svg viewBox="0 0 100 40"><path d="M0 30 Q 15 10, 30 20 T 60 10 T 100 20" fill="none" stroke="#a78bfa" stroke-width="3"/></svg>
            </div>
          </div>
          
          <div class="analytic-card">
            <div class="analytic-info">
              <span class="analytic-label">Translations</span>
              <strong class="analytic-value" id="statTranslations">0</strong>
            </div>
            <div class="analytic-chart chart-cyan">
              <svg viewBox="0 0 100 40"><path d="M0 20 Q 20 30, 40 10 T 80 20 T 100 5" fill="none" stroke="#2fd1c5" stroke-width="3"/></svg>
            </div>
          </div>

          <div class="analytic-card">
            <div class="analytic-info">
              <span class="analytic-label">Active Sessions</span>
              <strong class="analytic-value">47</strong>
            </div>
            <div class="analytic-chart chart-green">
              <div class="bars">
                <div class="bar" style="height: 40%"></div>
                <div class="bar" style="height: 60%"></div>
                <div class="bar" style="height: 30%"></div>
                <div class="bar" style="height: 80%"></div>
                <div class="bar" style="height: 50%"></div>
                <div class="bar" style="height: 90%"></div>
                <div class="bar" style="height: 70%"></div>
                <div class="bar" style="height: 40%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Songs Management -->
        <div class="section-head mt-4">
          <h2 class="section-title">Songs Management</h2>
          <button class="btn btn-primary neon-btn" id="newSongBtn">Add New Song</button>
        </div>

        <div class="management-panel" id="libraryPane">
          <div class="toolbar">
            <div class="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="search" placeholder="Search">
            </div>
            <div class="filters">
              <select id="sortBy" class="filter-select">
                <option value="newest">All columns</option>
                <option value="title_asc">Title A-Z</option>
                <option value="artist_asc">Artist</option>
              </select>
              <select id="lyricsFilter" class="filter-select">
                <option value="all">Filter</option>
                <option value="with">With Lyrics</option>
              </select>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 40px"><input type="checkbox"></th>
                  <th>Title ↑</th>
                  <th>Artist / Details</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="songsTable">
                <!-- JS will inject here -->
              </tbody>
            </table>
          </div>
          
          <div class="table-footer">
            <span class="text-muted">Show in 1 of 5</span>
            <div class="footer-actions">
              <button class="btn btn-secondary">Preview</button>
              <button class="btn btn-primary neon-btn" id="sidebarRefreshBtn">Refresh Table</button>
            </div>
          </div>
        </div>
        
        <!-- Editor Pane (Hidden by default) -->
        <div class="management-panel" id="editorPane" hidden>
           <div class="editor-header">
             <h3>Song Editor</h3>
             <button class="btn btn-secondary compact-btn" onclick="document.getElementById('libraryPane').hidden=false; document.getElementById('editorPane').hidden=true;">← Back to Library</button>
           </div>
           
           <div class="editor-grid-fields">
              <div class="field">
                <label>Title (AM)</label>
                <input id="title" type="text" placeholder="Mer Surb Astvats">
              </div>
              <div class="field">
                <label>Title (RU)</label>
                <input id="title_ru" type="text" placeholder="Наш святой Бог">
              </div>
              <div class="field">
                <label>Title (EN)</label>
                <input id="title_en" type="text" placeholder="Our Holy God">
              </div>
              <div class="field">
                <label>Artist</label>
                <input id="artist" type="text" placeholder="Artist Name">
              </div>
              <div class="field">
                <label>Key</label>
                <input id="key" type="text" placeholder="C, Am...">
              </div>
           </div>
           
           <div class="editor-body-fields">
             <div class="field-wide">
               <label>Chords</label>
               <textarea id="chords" rows="5"></textarea>
             </div>
             <div class="field-wide">
               <label>Lyrics</label>
               <textarea id="lyrics" rows="5"></textarea>
             </div>
           </div>
           
           <div class="editor-actions mt-4" style="display:flex; gap:10px; justify-content: flex-end;">
             <button id="clearEditorBtn" class="btn btn-secondary">Clear</button>
             <button id="deleteSongBtn" class="btn btn-danger" hidden>Delete</button>
             <button id="saveSongBtn" class="btn btn-primary neon-btn">Save Changes</button>
           </div>
        </div>
        <!-- End Editor -->

      </div>

      <!-- Right Column -->
      <div class="aether-side-col">
        
        <div class="status-card mb-4">
          <div class="section-title" style="margin-bottom: 16px;">System Status</div>
          <div class="status-item">
             <div class="status-dot purple"></div>
             <span>API</span>
             <div class="status-dot green ml-auto"></div>
          </div>
          <div class="status-item">
             <div class="status-dot cyan"></div>
             <span>Database</span>
             <div class="status-dot green ml-auto"></div>
          </div>
          <div class="status-item">
             <div class="status-dot orange"></div>
             <span>Server</span>
             <div class="status-dot green ml-auto"></div>
          </div>
        </div>

        <div class="activity-card">
          <div class="section-title" style="margin-bottom: 16px; display:flex; justify-content:space-between">
            Recent Activity <span>...</span>
          </div>
          
          <div class="activity-timeline">
            <div class="timeline-item">
               <div class="timeline-dot cyan"></div>
               <div class="timeline-content">
                 <strong>Song updated</strong>
                 <span>Updated 1 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot cyan"></div>
               <div class="timeline-content">
                 <strong>Song updated</strong>
                 <span>Updated 1 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot purple"></div>
               <div class="timeline-content">
                 <strong>Database synced</strong>
                 <span>Updated 3 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot purple"></div>
               <div class="timeline-content">
                 <strong>System backup</strong>
                 <span>Updated 7 days ago</span>
               </div>
            </div>
          </div>
          
          <div class="mt-4">
             <button class="btn btn-primary neon-btn" style="width: 100%;" onclick="window.location.href='admin_updates.php'">Admin Settings</button>
          </div>
        </div>
        
      </div>
    </div>
  </div>
"""

new_content = content[:html_start] + new_html + content[html_end:]

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced HTML in songs.php")
