import logging
from typing import Dict, Any
from services.llm import ask_llm
from tools.website_builder.utils import (
    save_website,
    create_website_zip,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# DETERMINISTIC FALLBACK — College Event & Attendance Management System
# Renders cleanly in a sandboxed iframe with real demo data and interactive JS.
# ─────────────────────────────────────────────────────────────────────────────

_COLLEGE_EVENT_HTML = '''<div id="app-root">

  <!-- Offline Fallback Banner -->
  <div class="offline-banner">
    <span class="banner-badge">PROVIDER: deterministic_fallback</span>
    <span class="banner-text">Gemini unavailable — generated using deterministic offline template.</span>
  </div>

  <!-- Sidebar Navigation -->
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">SE</div>
        <div class="brand-info">
          <div class="brand-name">SmartEvent</div>
          <div class="brand-sub">College Platform</div>
        </div>
      </div>

      <div class="role-selector">
        <label class="role-label">Active Role</label>
        <div class="role-tabs">
          <button class="role-btn active" onclick="switchRole('student')" id="role-student">Student</button>
          <button class="role-btn" onclick="switchRole('organizer')" id="role-organizer">Organizer</button>
          <button class="role-btn" onclick="switchRole('admin')" id="role-admin">Admin</button>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">MAIN</div>
        <a class="nav-item active" onclick="showSection('dashboard')" href="#">
          <span class="nav-icon">⊞</span> Dashboard
        </a>
        <a class="nav-item" onclick="showSection('events')" href="#">
          <span class="nav-icon">◈</span> Events
        </a>
        <a class="nav-item" onclick="showSection('attendance')" href="#">
          <span class="nav-icon">✓</span> Attendance
        </a>
        <a class="nav-item" onclick="showSection('participants')" href="#">
          <span class="nav-icon">◉</span> Participants
        </a>
        <div class="nav-section-label">ANALYTICS</div>
        <a class="nav-item" onclick="showSection('analytics')" href="#">
          <span class="nav-icon">▣</span> Analytics
        </a>
        <a class="nav-item" onclick="showSection('reports')" href="#">
          <span class="nav-icon">≡</span> Reports
        </a>
      </nav>

      <div class="sidebar-user">
        <div class="user-avatar">AS</div>
        <div class="user-info">
          <div class="user-name" id="user-display-name">Asha Sharma</div>
          <div class="user-role" id="user-display-role">Student · CS-3A</div>
        </div>
        <div class="notification-dot" title="3 notifications">3</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-btn" onclick="toggleSidebar()">☰</button>
          <div class="page-title" id="page-title">Dashboard</div>
        </div>
        <div class="topbar-right">
          <div class="search-box">
            <input type="text" placeholder="Search events..." class="search-input" oninput="filterEvents(this.value)" />
          </div>
          <button class="notif-btn" onclick="toggleNotifications()">
            🔔 <span class="notif-count">3</span>
          </button>
          <div class="topbar-avatar" id="topbar-avatar">AS</div>
        </div>
      </header>

      <!-- Notification Panel -->
      <div class="notif-panel" id="notif-panel" style="display:none">
        <div class="notif-header">Notifications <button onclick="toggleNotifications()" class="notif-close">×</button></div>
        <div class="notif-item unread">📅 Tech Symposium registration opens in 2 days</div>
        <div class="notif-item unread">✅ Attendance marked for Hackathon 2026</div>
        <div class="notif-item">📊 Your attendance report is ready</div>
      </div>

      <!-- ===== DASHBOARD SECTION ===== -->
      <section id="section-dashboard" class="content-section active">
        <div class="stats-row">
          <div class="stat-card primary">
            <div class="stat-icon">◈</div>
            <div class="stat-body">
              <div class="stat-value" id="stat-events">12</div>
              <div class="stat-label">Total Events</div>
            </div>
            <div class="stat-trend up">+3 this month</div>
          </div>
          <div class="stat-card success">
            <div class="stat-icon">✓</div>
            <div class="stat-body">
              <div class="stat-value" id="stat-attendance">87%</div>
              <div class="stat-label">Avg Attendance</div>
            </div>
            <div class="stat-trend up">+5% vs last sem</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon">◉</div>
            <div class="stat-body">
              <div class="stat-value">342</div>
              <div class="stat-label">Registered Students</div>
            </div>
            <div class="stat-trend up">94% capacity</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon">!</div>
            <div class="stat-body">
              <div class="stat-value">4</div>
              <div class="stat-label">Upcoming Deadlines</div>
            </div>
            <div class="stat-trend down">Next: 2 days</div>
          </div>
        </div>

        <!-- Upcoming Events Cards -->
        <div class="section-header">
          <h2 class="section-title">Upcoming Events</h2>
          <button class="btn btn-sm btn-outline" onclick="showSection('events')">View All</button>
        </div>
        <div class="events-grid" id="events-grid">
          <div class="event-card featured" data-event="hackathon">
            <div class="event-badge tech">TECH</div>
            <div class="event-capacity-bar">
              <div class="capacity-fill" style="width:78%"></div>
            </div>
            <div class="event-cap-label">78/100 seats filled</div>
            <h3 class="event-title">National Hackathon 2026</h3>
            <p class="event-desc">48-hour coding marathon with industry mentors. Build AI-powered solutions.</p>
            <div class="event-meta">
              <span class="event-date">📅 Oct 20–21, 2026</span>
              <span class="event-venue">📍 Main Auditorium</span>
            </div>
            <div class="event-footer">
              <span class="event-prize">🏆 ₹50,000 Prize Pool</span>
              <button class="btn btn-primary btn-sm" onclick="registerEvent(this, 'hackathon')">Register</button>
            </div>
          </div>

          <div class="event-card" data-event="symposium">
            <div class="event-badge cultural">CULTURAL</div>
            <div class="event-capacity-bar">
              <div class="capacity-fill" style="width:45%"></div>
            </div>
            <div class="event-cap-label">90/200 seats filled</div>
            <h3 class="event-title">Tech Symposium 2026</h3>
            <p class="event-desc">Annual tech fest with paper presentations, workshops and guest lectures.</p>
            <div class="event-meta">
              <span class="event-date">📅 Nov 5–7, 2026</span>
              <span class="event-venue">📍 Conference Hall B</span>
            </div>
            <div class="event-footer">
              <span class="event-prize">📜 Certificates + Internship</span>
              <button class="btn btn-outline btn-sm" onclick="registerEvent(this, 'symposium')">Register</button>
            </div>
          </div>

          <div class="event-card" data-event="workshop">
            <div class="event-badge workshop">WORKSHOP</div>
            <div class="event-capacity-bar">
              <div class="capacity-fill" style="width:92%"></div>
            </div>
            <div class="event-cap-label">46/50 seats — Almost Full!</div>
            <h3 class="event-title">AI & ML Bootcamp</h3>
            <p class="event-desc">Hands-on neural network and LLM integration workshop with live coding.</p>
            <div class="event-meta">
              <span class="event-date">📅 Oct 28, 2026</span>
              <span class="event-venue">📍 Lab 204, IT Block</span>
            </div>
            <div class="event-footer">
              <span class="event-prize">🎯 Industry Certificate</span>
              <button class="btn btn-warning btn-sm" onclick="registerEvent(this, 'workshop')">Register Now</button>
            </div>
          </div>
        </div>

        <!-- Attendance Chart -->
        <div class="section-header" style="margin-top:24px">
          <h2 class="section-title">Attendance Overview</h2>
        </div>
        <div class="chart-card">
          <div class="chart-legend">
            <span class="legend-dot present"></span> Present
            <span class="legend-dot absent"></span> Absent
          </div>
          <div class="bar-chart" id="bar-chart">
            <div class="bar-group">
              <div class="bar-wrap"><div class="bar-fill present-bar" style="height:85%"><span class="bar-val">85%</span></div></div>
              <div class="bar-label">Hackathon</div>
            </div>
            <div class="bar-group">
              <div class="bar-wrap"><div class="bar-fill present-bar" style="height:92%"><span class="bar-val">92%</span></div></div>
              <div class="bar-label">Workshop</div>
            </div>
            <div class="bar-group">
              <div class="bar-wrap"><div class="bar-fill present-bar" style="height:73%"><span class="bar-val">73%</span></div></div>
              <div class="bar-label">Symposium</div>
            </div>
            <div class="bar-group">
              <div class="bar-wrap"><div class="bar-fill present-bar" style="height:96%"><span class="bar-val">96%</span></div></div>
              <div class="bar-label">Sports Day</div>
            </div>
            <div class="bar-group">
              <div class="bar-wrap"><div class="bar-fill present-bar" style="height:68%"><span class="bar-val">68%</span></div></div>
              <div class="bar-label">Cultural</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== ATTENDANCE SECTION ===== -->
      <section id="section-attendance" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Attendance Records</h2>
          <div class="attendance-summary">
            <span class="att-pill present-pill">Present: 87%</span>
            <span class="att-pill absent-pill">Absent: 13%</span>
          </div>
        </div>
        <div class="donut-row">
          <div class="donut-card">
            <svg viewBox="0 0 100 100" class="donut-svg">
              <circle class="donut-bg" cx="50" cy="50" r="38" />
              <circle class="donut-seg present-seg" cx="50" cy="50" r="38"
                stroke-dasharray="207 36" stroke-dashoffset="-9" />
              <text x="50" y="54" class="donut-label">87%</text>
            </svg>
            <div class="donut-title">Overall Attendance</div>
          </div>
          <div class="donut-card">
            <svg viewBox="0 0 100 100" class="donut-svg">
              <circle class="donut-bg" cx="50" cy="50" r="38" />
              <circle class="donut-seg success-seg" cx="50" cy="50" r="38"
                stroke-dasharray="230 13" stroke-dashoffset="-9" />
              <text x="50" y="54" class="donut-label">96%</text>
            </svg>
            <div class="donut-title">Technical Events</div>
          </div>
          <div class="donut-card">
            <svg viewBox="0 0 100 100" class="donut-svg">
              <circle class="donut-bg" cx="50" cy="50" r="38" />
              <circle class="donut-seg warning-seg" cx="50" cy="50" r="38"
                stroke-dasharray="171 72" stroke-dashoffset="-9" />
              <text x="50" y="54" class="donut-label">71%</text>
            </svg>
            <div class="donut-title">Cultural Events</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Event</th><th>Date</th><th>Status</th><th>Marked By</th><th>Action</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>National Hackathon 2026</td><td>Oct 15, 2026</td>
                <td><span class="badge badge-success">Present</span></td>
                <td>Auto-QR</td>
                <td><button class="btn-link">View</button></td>
              </tr>
              <tr>
                <td>AI Workshop</td><td>Oct 10, 2026</td>
                <td><span class="badge badge-success">Present</span></td>
                <td>Prof. Kumar</td>
                <td><button class="btn-link">View</button></td>
              </tr>
              <tr>
                <td>Cultural Night</td><td>Oct 5, 2026</td>
                <td><span class="badge badge-danger">Absent</span></td>
                <td>—</td>
                <td><button class="btn-link">Apply LOD</button></td>
              </tr>
              <tr>
                <td>Tech Symposium</td><td>Sep 28, 2026</td>
                <td><span class="badge badge-success">Present</span></td>
                <td>Auto-QR</td>
                <td><button class="btn-link">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===== PARTICIPANTS SECTION ===== -->
      <section id="section-participants" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Participant Directory</h2>
          <button class="btn btn-primary btn-sm">Export CSV</button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Roll No</th><th>Branch</th><th>Events</th><th>Attendance</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Asha Sharma</td><td>2026CS001</td><td>CSE</td><td>4</td><td><div class="mini-bar"><div class="mini-fill" style="width:87%"></div></div><span>87%</span></td><td><span class="badge badge-success">Active</span></td></tr>
              <tr><td>2</td><td>Rohan Mehta</td><td>2026CS002</td><td>CSE</td><td>3</td><td><div class="mini-bar"><div class="mini-fill" style="width:92%"></div></div><span>92%</span></td><td><span class="badge badge-success">Active</span></td></tr>
              <tr><td>3</td><td>Priya Nair</td><td>2026EC010</td><td>ECE</td><td>5</td><td><div class="mini-bar"><div class="mini-fill" style="width:76%"></div></div><span>76%</span></td><td><span class="badge badge-warning">Watch</span></td></tr>
              <tr><td>4</td><td>Aditya Patel</td><td>2026ME015</td><td>MECH</td><td>2</td><td><div class="mini-bar"><div class="mini-fill" style="width:55%"></div></div><span>55%</span></td><td><span class="badge badge-danger">At Risk</span></td></tr>
              <tr><td>5</td><td>Kavya Reddy</td><td>2026CS025</td><td>CSE</td><td>6</td><td><div class="mini-bar"><div class="mini-fill" style="width:98%"></div></div><span>98%</span></td><td><span class="badge badge-success">Active</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===== EVENTS SECTION ===== -->
      <section id="section-events" class="content-section">
        <div class="section-header">
          <h2 class="section-title">All Events</h2>
          <div class="filter-row">
            <button class="filter-btn active" onclick="filterByType('all', this)">All</button>
            <button class="filter-btn" onclick="filterByType('tech', this)">Tech</button>
            <button class="filter-btn" onclick="filterByType('cultural', this)">Cultural</button>
            <button class="filter-btn" onclick="filterByType('workshop', this)">Workshop</button>
          </div>
        </div>
        <div class="events-list" id="events-list">
          <div class="event-list-item" data-type="tech">
            <div class="event-badge tech">TECH</div>
            <div class="event-list-body">
              <div class="event-list-title">National Hackathon 2026</div>
              <div class="event-list-meta">Oct 20–21 · Main Auditorium · 78/100 seats</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="registerEvent(this, 'h2')">Register</button>
          </div>
          <div class="event-list-item" data-type="cultural">
            <div class="event-badge cultural">CULTURAL</div>
            <div class="event-list-body">
              <div class="event-list-title">Annual Cultural Night</div>
              <div class="event-list-meta">Oct 25 · Open Amphitheatre · 120/300 seats</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="registerEvent(this, 'c1')">Register</button>
          </div>
          <div class="event-list-item" data-type="workshop">
            <div class="event-badge workshop">WORKSHOP</div>
            <div class="event-list-body">
              <div class="event-list-title">AI & ML Bootcamp</div>
              <div class="event-list-meta">Oct 28 · Lab 204, IT Block · 46/50 seats</div>
            </div>
            <button class="btn btn-warning btn-sm" onclick="registerEvent(this, 'w1')">Register Now</button>
          </div>
          <div class="event-list-item" data-type="tech">
            <div class="event-badge tech">TECH</div>
            <div class="event-list-body">
              <div class="event-list-title">Tech Symposium 2026</div>
              <div class="event-list-meta">Nov 5–7 · Conference Hall B · 90/200 seats</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="registerEvent(this, 's1')">Register</button>
          </div>
        </div>
      </section>

      <!-- ===== ANALYTICS SECTION ===== -->
      <section id="section-analytics" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Analytics Dashboard</h2>
        </div>
        <div class="analytics-grid">
          <div class="analytics-card">
            <h3>Event-wise Attendance</h3>
            <div class="horiz-chart">
              <div class="horiz-row">
                <span class="horiz-label">Hackathon 2026</span>
                <div class="horiz-bar-wrap"><div class="horiz-bar" style="width:85%"><span>85%</span></div></div>
              </div>
              <div class="horiz-row">
                <span class="horiz-label">AI Workshop</span>
                <div class="horiz-bar-wrap"><div class="horiz-bar success" style="width:92%"><span>92%</span></div></div>
              </div>
              <div class="horiz-row">
                <span class="horiz-label">Symposium</span>
                <div class="horiz-bar-wrap"><div class="horiz-bar warning" style="width:73%"><span>73%</span></div></div>
              </div>
              <div class="horiz-row">
                <span class="horiz-label">Sports Day</span>
                <div class="horiz-bar-wrap"><div class="horiz-bar success" style="width:96%"><span>96%</span></div></div>
              </div>
              <div class="horiz-row">
                <span class="horiz-label">Cultural Night</span>
                <div class="horiz-bar-wrap"><div class="horiz-bar danger" style="width:68%"><span>68%</span></div></div>
              </div>
            </div>
          </div>
          <div class="analytics-card">
            <h3>Present vs Absent</h3>
            <div class="pie-visual">
              <div class="pie-ring" style="--present:87">
                <div class="pie-inner">
                  <div class="pie-main">87%</div>
                  <div class="pie-sub">Present</div>
                </div>
              </div>
              <div class="pie-legend">
                <div class="pie-leg-item"><span class="pie-dot p"></span>Present: 298</div>
                <div class="pie-leg-item"><span class="pie-dot a"></span>Absent: 44</div>
                <div class="pie-leg-item"><span class="pie-dot e"></span>Excused: 8</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== REPORTS SECTION ===== -->
      <section id="section-reports" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Reports</h2>
        </div>
        <div class="reports-grid">
          <div class="report-card" onclick="downloadReport('Monthly Attendance Report')">
            <div class="report-icon">📊</div>
            <div class="report-title">Monthly Attendance</div>
            <div class="report-meta">Oct 2026 · PDF</div>
          </div>
          <div class="report-card" onclick="downloadReport('Event-wise Summary')">
            <div class="report-icon">📋</div>
            <div class="report-title">Event-wise Summary</div>
            <div class="report-meta">All Events · Excel</div>
          </div>
          <div class="report-card" onclick="downloadReport('At-Risk Students Report')">
            <div class="report-icon">⚠️</div>
            <div class="report-title">At-Risk Students</div>
            <div class="report-meta">Below 75% · PDF</div>
          </div>
        </div>
        <div id="report-toast" class="report-toast" style="display:none"></div>
      </section>

    </main>
  </div>
</div>'''

_COLLEGE_EVENT_JS = '''var currentRole = 'student';
var roles = {
  student: { name: 'Asha Sharma', role: 'Student · CS-3A', initials: 'AS' },
  organizer: { name: 'Dr. Pradeep Kumar', role: 'Event Organizer', initials: 'PK' },
  admin: { name: 'Prof. R. Sharma', role: 'Administrator', initials: 'RS' }
};

function switchRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('active'); });
  var roleBtn = document.getElementById('role-' + role);
  if (roleBtn) roleBtn.classList.add('active');
  var u = roles[role];
  if (u) {
    var nameEl = document.getElementById('user-display-name');
    var roleEl = document.getElementById('user-display-role');
    var avatarEl = document.getElementById('topbar-avatar');
    if (nameEl) nameEl.textContent = u.name;
    if (roleEl) roleEl.textContent = u.role;
    if (avatarEl) avatarEl.textContent = u.initials;
    showToast('Switched to ' + role + ' view: ' + u.name);
  }
}

function showSection(name) {
  document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  var titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
}

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('collapsed');
}

function toggleNotifications() {
  var p = document.getElementById('notif-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function registerEvent(btn, eventId) {
  btn.textContent = '✓ Registered';
  btn.className = 'btn btn-success btn-sm';
  btn.disabled = true;
  showToast('Successfully registered for event!');
}

function filterByType(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.event-list-item').forEach(function(item) {
    item.style.display = (type === 'all' || item.dataset.type === type) ? 'flex' : 'none';
  });
}

function filterEvents(val) {
  document.querySelectorAll('[data-event]').forEach(function(card) {
    card.style.display = card.innerText.toLowerCase().includes(val.toLowerCase()) ? 'block' : 'none';
  });
}

function downloadReport(name) {
  var toast = document.getElementById('report-toast');
  if (toast) {
    toast.textContent = '⬇ Downloading: ' + name;
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 3000);
  }
}

function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'global-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    setTimeout(function() { t.remove(); }, 400);
  }, 2500);
}'''

_COLLEGE_EVENT_CSS = '''* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #07090f;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Offline Banner ── */
.offline-banner {
  background: rgba(245,158,11,0.1);
  border-bottom: 1px solid rgba(245,158,11,0.3);
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 11px;
  font-family: monospace;
  z-index: 100;
}
.banner-badge { background:#f59e0b;color:#000;font-weight:700;padding:2px 8px;border-radius:4px;font-size:10px; }
.banner-text { color:#fcd34d; }

/* ── Layout ── */
.layout { display:flex;height:calc(100vh - 33px);overflow:hidden; }

/* ── Sidebar ── */
.sidebar {
  width:240px;
  background:#0d1117;
  border-right:1px solid #1e2535;
  display:flex;
  flex-direction:column;
  flex-shrink:0;
  transition:width 0.25s;
  overflow:hidden;
}
.sidebar.collapsed { width:0; }

.sidebar-brand {
  padding:20px 16px;
  display:flex;
  align-items:center;
  gap:10px;
  border-bottom:1px solid #1e2535;
}
.brand-icon {
  width:36px;height:36px;border-radius:10px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:13px;flex-shrink:0;
}
.brand-name { font-weight:700;font-size:15px;color:#fff; }
.brand-sub { font-size:10px;color:#64748b; }

.role-selector { padding:12px 16px;border-bottom:1px solid #1e2535; }
.role-label { font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px;display:block; }
.role-tabs { display:flex;gap:4px; }
.role-btn {
  flex:1;padding:5px 6px;border:1px solid #1e2535;background:#111827;
  color:#94a3b8;font-size:11px;border-radius:6px;cursor:pointer;transition:all .2s;
}
.role-btn.active { background:#6366f1;border-color:#6366f1;color:#fff;font-weight:600; }
.role-btn:hover:not(.active) { border-color:#4b5563;color:#e2e8f0; }

.sidebar-nav { flex:1;padding:12px 8px;overflow-y:auto; }
.nav-section-label { font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#374151;padding:8px 8px 4px;font-weight:600; }
.nav-item {
  display:flex;align-items:center;gap:10px;padding:8px 10px;
  border-radius:8px;color:#64748b;text-decoration:none;cursor:pointer;
  transition:all .15s;font-size:13px;margin-bottom:2px;
}
.nav-item:hover { background:#111827;color:#e2e8f0; }
.nav-item.active { background:#1e2535;color:#818cf8;font-weight:600; }
.nav-icon { font-size:14px;width:20px;text-align:center; }

.sidebar-user {
  padding:14px 16px;border-top:1px solid #1e2535;
  display:flex;align-items:center;gap:10px;
}
.user-avatar {
  width:34px;height:34px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#a855f7);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;flex-shrink:0;
}
.user-name { font-size:12px;font-weight:600;color:#f1f5f9; }
.user-role { font-size:10px;color:#64748b; }
.notification-dot {
  margin-left:auto;background:#ef4444;color:#fff;
  font-size:10px;font-weight:700;width:18px;height:18px;
  border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;
}

/* ── Main Content ── */
.main-content { flex:1;display:flex;flex-direction:column;overflow:hidden; }

/* ── Topbar ── */
.topbar {
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 20px;background:#0d1117;border-bottom:1px solid #1e2535;flex-shrink:0;
}
.topbar-left { display:flex;align-items:center;gap:12px; }
.menu-btn { background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px; }
.page-title { font-size:16px;font-weight:600;color:#f1f5f9;text-transform:capitalize; }
.topbar-right { display:flex;align-items:center;gap:12px; }
.search-input {
  background:#111827;border:1px solid #1e2535;border-radius:8px;
  padding:6px 12px;color:#e2e8f0;font-size:12px;width:200px;outline:none;
}
.search-input:focus { border-color:#6366f1; }
.notif-btn {
  background:#111827;border:1px solid #1e2535;border-radius:8px;
  padding:6px 10px;color:#94a3b8;cursor:pointer;font-size:13px;position:relative;
}
.notif-count {
  background:#ef4444;color:#fff;font-size:10px;font-weight:700;
  width:16px;height:16px;border-radius:50%;display:inline-flex;
  align-items:center;justify-content:center;margin-left:4px;
}
.topbar-avatar {
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#a855f7);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;cursor:pointer;
}

/* ── Notification Panel ── */
.notif-panel {
  position:absolute;top:60px;right:20px;width:300px;
  background:#0d1117;border:1px solid #1e2535;border-radius:12px;
  box-shadow:0 20px 60px rgba(0,0,0,.5);z-index:50;
}
.notif-header {
  padding:12px 16px;border-bottom:1px solid #1e2535;
  font-weight:600;font-size:13px;display:flex;justify-content:space-between;
}
.notif-close { background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px; }
.notif-item { padding:12px 16px;border-bottom:1px solid #1e2535;font-size:12px;color:#94a3b8; }
.notif-item.unread { color:#e2e8f0;background:rgba(99,102,241,.05); }

/* ── Content Sections ── */
.content-section { display:none;padding:20px;overflow-y:auto;flex:1; }
.content-section.active { display:block; }

/* ── Stats Row ── */
.stats-row { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px; }
.stat-card {
  background:#0d1117;border:1px solid #1e2535;border-radius:14px;
  padding:18px;display:flex;align-items:center;gap:14px;position:relative;overflow:hidden;
}
.stat-card::before {
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
}
.stat-card.primary::before { background:linear-gradient(90deg,#6366f1,#818cf8); }
.stat-card.success::before { background:linear-gradient(90deg,#10b981,#34d399); }
.stat-card.warning::before { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.stat-card.danger::before { background:linear-gradient(90deg,#ef4444,#f87171); }
.stat-icon { font-size:22px;opacity:.7; }
.stat-value { font-size:26px;font-weight:800;color:#fff; }
.stat-label { font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:2px; }
.stat-trend { margin-left:auto;font-size:10px;padding:3px 8px;border-radius:99px; }
.stat-trend.up { background:rgba(16,185,129,.15);color:#34d399; }
.stat-trend.down { background:rgba(239,68,68,.15);color:#f87171; }

/* ── Section Header ── */
.section-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
.section-title { font-size:16px;font-weight:700;color:#f1f5f9; }

/* ── Event Cards ── */
.events-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:24px; }
.event-card {
  background:#0d1117;border:1px solid #1e2535;border-radius:16px;
  padding:20px;transition:all .2s;
}
.event-card:hover { border-color:#374151;transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4); }
.event-card.featured { border-color:rgba(99,102,241,.35);background:linear-gradient(180deg,rgba(99,102,241,.06),#0d1117); }
.event-badge {
  display:inline-block;font-size:10px;font-weight:700;padding:3px 10px;
  border-radius:99px;margin-bottom:10px;letter-spacing:.05em;
}
.event-badge.tech { background:rgba(99,102,241,.2);color:#818cf8;border:1px solid rgba(99,102,241,.3); }
.event-badge.cultural { background:rgba(245,158,11,.2);color:#fbbf24;border:1px solid rgba(245,158,11,.3); }
.event-badge.workshop { background:rgba(16,185,129,.2);color:#34d399;border:1px solid rgba(16,185,129,.3); }

.event-capacity-bar { height:4px;background:#1e2535;border-radius:99px;margin-bottom:4px; }
.capacity-fill { height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:99px; }
.event-cap-label { font-size:10px;color:#64748b;margin-bottom:10px; }

.event-title { font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:6px; }
.event-desc { font-size:12px;color:#64748b;line-height:1.55;margin-bottom:12px; }
.event-meta { display:flex;flex-direction:column;gap:4px;margin-bottom:14px; }
.event-date, .event-venue { font-size:11px;color:#94a3b8; }
.event-footer { display:flex;align-items:center;justify-content:space-between; }
.event-prize { font-size:11px;color:#a5b4fc; }

/* ── Event List ── */
.events-list { display:flex;flex-direction:column;gap:10px; }
.event-list-item {
  display:flex;align-items:center;gap:14px;background:#0d1117;
  border:1px solid #1e2535;border-radius:12px;padding:14px 18px;
}
.event-list-body { flex:1; }
.event-list-title { font-size:14px;font-weight:600;color:#f1f5f9; }
.event-list-meta { font-size:11px;color:#64748b;margin-top:3px; }
.filter-row { display:flex;gap:6px; }
.filter-btn {
  padding:4px 12px;border-radius:99px;border:1px solid #1e2535;
  background:transparent;color:#64748b;font-size:11px;cursor:pointer;transition:all .15s;
}
.filter-btn.active { background:#6366f1;border-color:#6366f1;color:#fff; }

/* ── Buttons ── */
.btn {
  padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;
  cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:6px;
}
.btn-sm { padding:5px 12px;font-size:12px; }
.btn-primary { background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 3px 12px rgba(99,102,241,.35); }
.btn-primary:hover { opacity:.9;transform:translateY(-1px); }
.btn-outline { background:transparent;border:1px solid #374151;color:#94a3b8; }
.btn-outline:hover { border-color:#6366f1;color:#818cf8; }
.btn-warning { background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:700; }
.btn-success { background:linear-gradient(135deg,#10b981,#059669);color:#fff; }

/* ── Table ── */
.table-wrapper { overflow-x:auto;border-radius:12px;border:1px solid #1e2535; }
.data-table { width:100%;border-collapse:collapse; }
.data-table th {
  padding:12px 16px;text-align:left;font-size:11px;
  text-transform:uppercase;letter-spacing:.06em;
  color:#64748b;background:#0d1117;border-bottom:1px solid #1e2535;
}
.data-table td { padding:12px 16px;border-bottom:1px solid #111827;font-size:12px;color:#94a3b8; }
.data-table tr:last-child td { border-bottom:none; }
.data-table tr:hover td { background:rgba(255,255,255,.02); }

.badge {
  display:inline-block;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:700;
}
.badge-success { background:rgba(16,185,129,.15);color:#34d399; }
.badge-danger { background:rgba(239,68,68,.15);color:#f87171; }
.badge-warning { background:rgba(245,158,11,.15);color:#fbbf24; }
.btn-link { background:none;border:none;color:#6366f1;cursor:pointer;font-size:12px; }
.mini-bar { display:inline-block;width:60px;height:4px;background:#1e2535;border-radius:99px;vertical-align:middle;margin-right:6px; }
.mini-fill { height:100%;background:#6366f1;border-radius:99px; }

/* ── Attendance Donut ── */
.donut-row { display:flex;gap:20px;margin-bottom:24px; }
.donut-card { flex:1;background:#0d1117;border:1px solid #1e2535;border-radius:14px;padding:20px;text-align:center; }
.donut-svg { width:120px;height:120px; }
.donut-bg { fill:none;stroke:#1e2535;stroke-width:16; }
.donut-seg { fill:none;stroke-width:16;stroke-linecap:round;transition:stroke-dasharray .8s; }
.present-seg { stroke:#6366f1; }
.success-seg { stroke:#10b981; }
.warning-seg { stroke:#f59e0b; }
.donut-label { font-size:16px;font-weight:800;fill:#f1f5f9;text-anchor:middle;dominant-baseline:middle; }
.donut-title { font-size:12px;color:#64748b;margin-top:10px; }
.att-pill { font-size:11px;font-weight:600;padding:4px 12px;border-radius:99px; }
.present-pill { background:rgba(99,102,241,.15);color:#818cf8; }
.absent-pill { background:rgba(239,68,68,.15);color:#f87171; }
.attendance-summary { display:flex;gap:8px; }

/* ── Bar Chart ── */
.chart-card { background:#0d1117;border:1px solid #1e2535;border-radius:14px;padding:20px; }
.chart-legend { display:flex;gap:14px;margin-bottom:16px;font-size:11px;color:#64748b; }
.legend-dot { display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px; }
.legend-dot.present { background:#6366f1; }
.legend-dot.absent { background:#ef4444; }
.bar-chart { display:flex;align-items:flex-end;gap:16px;height:140px; }
.bar-group { display:flex;flex-direction:column;align-items:center;flex:1; }
.bar-wrap { flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center; }
.bar-fill {
  width:40px;background:linear-gradient(180deg,#818cf8,#6366f1);
  border-radius:6px 6px 0 0;position:relative;display:flex;align-items:flex-start;justify-content:center;
  transition:height .8s;
}
.bar-val { color:#fff;font-size:10px;font-weight:700;margin-top:4px; }
.bar-label { font-size:10px;color:#64748b;margin-top:6px;text-align:center; }

/* ── Analytics ── */
.analytics-grid { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
.analytics-card { background:#0d1117;border:1px solid #1e2535;border-radius:14px;padding:20px; }
.analytics-card h3 { font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:16px; }
.horiz-chart { display:flex;flex-direction:column;gap:10px; }
.horiz-row { display:flex;align-items:center;gap:10px; }
.horiz-label { width:110px;font-size:11px;color:#64748b;flex-shrink:0; }
.horiz-bar-wrap { flex:1;height:20px;background:#111827;border-radius:4px;overflow:hidden; }
.horiz-bar {
  height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);
  border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;
  font-size:10px;font-weight:700;color:#fff;transition:width .8s;
}
.horiz-bar.success { background:linear-gradient(90deg,#10b981,#34d399); }
.horiz-bar.warning { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.horiz-bar.danger { background:linear-gradient(90deg,#ef4444,#f87171); }

/* ── Pie Visual ── */
.pie-visual { display:flex;align-items:center;gap:20px; }
.pie-ring {
  width:110px;height:110px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(#6366f1 calc(var(--present)*1%),#1e2535 0);
  display:flex;align-items:center;justify-content:center;
}
.pie-inner { width:75px;height:75px;border-radius:50%;background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center; }
.pie-main { font-size:18px;font-weight:800;color:#818cf8; }
.pie-sub { font-size:10px;color:#64748b; }
.pie-legend { display:flex;flex-direction:column;gap:8px; }
.pie-leg-item { font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px; }
.pie-dot { width:8px;height:8px;border-radius:50%; }
.pie-dot.p { background:#6366f1; }
.pie-dot.a { background:#ef4444; }
.pie-dot.e { background:#f59e0b; }

/* ── Reports ── */
.reports-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px; }
.report-card {
  background:#0d1117;border:1px solid #1e2535;border-radius:14px;
  padding:24px 16px;text-align:center;cursor:pointer;transition:all .2s;
}
.report-card:hover { border-color:#6366f1;transform:translateY(-2px); }
.report-icon { font-size:32px;margin-bottom:10px; }
.report-title { font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:4px; }
.report-meta { font-size:10px;color:#64748b; }
.report-toast {
  margin-top:16px;background:#10b981;color:#fff;font-weight:600;
  padding:10px 16px;border-radius:10px;font-size:12px;
}

/* ── Toast ── */
.global-toast {
  position:fixed;bottom:20px;right:20px;background:#6366f1;color:#fff;
  font-size:12px;font-weight:600;padding:10px 18px;border-radius:10px;
  box-shadow:0 8px 24px rgba(99,102,241,.4);z-index:1000;
  opacity:1;transition:opacity .4s;
}

/* ── Responsive ── */
@media(max-width:768px){
  .sidebar{display:none;}
  .analytics-grid{grid-template-columns:1fr;}
  .donut-row{flex-wrap:wrap;}
  .events-grid{grid-template-columns:1fr;}
  .stats-row{grid-template-columns:1fr 1fr;}
}'''


def generate_website_offline_fallback(
    prompt: str,
    framework: str,
    template: str,
) -> Dict[str, str]:
    """
    Generates a deterministic, renderable modern HTML/CSS/JS website.
    For college/event/attendance-related prompts, returns the full Smart College
    Event & Attendance Management System demo. Otherwise returns a generic modern
    landing page. Always honest about provider.
    """
    low_prompt = prompt.lower()

    # College / Event / Attendance / Management System detection
    is_college = any(k in low_prompt for k in [
        "college", "event", "attendance", "student", "organizer",
        "administrator", "management system", "campus", "academic"
    ])

    if is_college:
        readme = """# Smart College Event & Attendance Management System
Generated via deterministic offline studio template.

## Features
- Student, Organizer, Administrator role dashboards
- Real-time attendance percentage & event capacity
- Participant tracking table & interactive registration
- Exportable CSV reports and event analytics
"""
        return {
            "app": _COLLEGE_EVENT_HTML.strip(),
            "css": _COLLEGE_EVENT_CSS.strip(),
            "js": _COLLEGE_EVENT_JS.strip(),
            "files": {
                "index.html": _COLLEGE_EVENT_HTML.strip(),
                "styles.css": _COLLEGE_EVENT_CSS.strip(),
                "script.js": _COLLEGE_EVENT_JS.strip(),
                "README.md": readme,
            },
        }

    # Analytics / Dashboard variant
    if any(k in low_prompt for k in ["dashboard", "analytics", "metrics", "telemetry"]):
        hero_tag = "Analytics Dashboard"
        hero_title = "Telemetry & Performance Overview"
        hero_sub = "Real-time metrics, node latency, and automated ingestion health."
        card_1_title = "System Throughput"
        card_1_val = "1.42 M req/s"
        card_2_title = "P99 Response Time"
        card_2_val = "14.2 ms"
        card_3_title = "Cluster Availability"
        card_3_val = "99.98%"
    elif any(k in low_prompt for k in ["portfolio", "resume", "developer"]):
        hero_tag = "Engineer Profile"
        hero_title = "Full-Stack AI & Systems Engineer"
        hero_sub = "Designing requirement-driven multi-artifact systems and resilient cloud architectures."
        card_1_title = "Production Services"
        card_1_val = "38+"
        card_2_title = "Verified Pipeline Runs"
        card_2_val = "1,240"
        card_3_title = "Test Coverage"
        card_3_val = "99.4%"
    elif any(k in low_prompt for k in ["store", "ecommerce", "shop", "product"]):
        hero_tag = "Product Marketplace"
        hero_title = "Enterprise Cloud Hardware & Tools"
        hero_sub = "High-performance compute instances and developer tooling delivered instantly."
        card_1_title = "Hardware SKUs"
        card_1_val = "250+"
        card_2_title = "Delivery Speed"
        card_2_val = "< 2 mins"
        card_3_title = "Customer Rating"
        card_3_val = "4.95 / 5"
    else:
        hero_tag = "Cloud Platform"
        hero_title = "Modern Engineering Architecture"
        hero_sub = prompt[:120] if len(prompt) > 20 else "High-reliability web solution built with modern design principles."
        card_1_title = "Core Capabilities"
        card_1_val = "Active"
        card_2_title = "API Contract"
        card_2_val = "Validated"
        card_3_title = "Host Status"
        card_3_val = "Healthy"

    app_html = f'''<div id="root">
  <div class="offline-banner">
    <span class="banner-badge">PROVIDER: deterministic_fallback</span>
    <span class="banner-text">Gemini unavailable — generated using deterministic offline template.</span>
  </div>

  <header class="navbar">
    <div class="brand">
      <div class="logo-box">AI</div>
      <span class="brand-text">Workspace Site</span>
    </div>
    <nav class="nav-links">
      <a href="#features">Overview</a>
      <a href="#metrics">Metrics</a>
      <a href="#contact">Contact</a>
    </nav>
    <button class="btn btn-outline" onclick="triggerAction('Get Started')">Launch Demo</button>
  </header>

  <main>
    <section class="hero-section">
      <div class="hero-badge">{hero_tag}</div>
      <h1 class="hero-title">{hero_title}</h1>
      <p class="hero-subtitle">{hero_sub}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="incrementCounter()">Interactive Counter: <span id="counter">0</span></button>
        <button class="btn btn-secondary" onclick="triggerAction('Documentation')">View Docs</button>
      </div>
    </section>

    <section id="metrics" class="cards-grid">
      <div class="metric-card">
        <div class="card-title">{card_1_title}</div>
        <div class="card-value">{card_1_val}</div>
        <div class="card-desc">Monitored continuously across nodes</div>
      </div>
      <div class="metric-card highlight">
        <div class="card-title">{card_2_title}</div>
        <div class="card-value">{card_2_val}</div>
        <div class="card-desc">Validated with deterministic static tests</div>
      </div>
      <div class="metric-card">
        <div class="card-title">{card_3_title}</div>
        <div class="card-value">{card_3_val}</div>
        <div class="card-desc">Zero-downtime resilient runtime</div>
      </div>
    </section>

    <section id="features" class="feature-box">
      <h2>Architecture & Features</h2>
      <p>This layout is compiled deterministically with pure CSS variables, responsive typography, and reactive DOM handlers.</p>
      <div id="action-feed" class="action-feed">Ready for interaction. Click the buttons above to test live event handlers.</div>
    </section>
  </main>

  <footer class="footer">
    <div>AI Engineering Workspace &bull; Deterministic Web Compiler</div>
    <div class="footer-meta">Framework: {framework} &bull; Template: {template}</div>
  </footer>
</div>'''

    css_styles = '''* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: #0b0f19;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.offline-banner {
  background: rgba(245, 158, 11, 0.12);
  border-bottom: 1px solid rgba(245, 158, 11, 0.35);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.banner-badge {
  background: #f59e0b;
  color: #000;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.banner-text { color: #fcd34d; }

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 32px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand { display: flex; align-items: center; gap: 10px; }
.logo-box {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 800;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 14px;
}
.brand-text { font-weight: 700; font-size: 16px; color: #fff; }
.nav-links { display: flex; gap: 24px; }
.nav-links a { color: #94a3b8; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }

main { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }

.hero-section { text-align: center; padding: 40px 0 60px; }
.hero-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 4px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.hero-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin-bottom: 18px;
  background: linear-gradient(to right, #ffffff, #cbd5e1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-subtitle { font-size: 17px; color: #94a3b8; max-width: 650px; margin: 0 auto 32px; }
.hero-actions { display: flex; gap: 14px; justify-content: center; }

.btn {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
.btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
.btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
.btn-secondary:hover { background: #334155; }
.btn-outline { background: transparent; color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); }
.btn-outline:hover { background: rgba(99, 102, 241, 0.1); }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
.metric-card {
  background: #111827;
  border: 1px solid #1f2937;
  padding: 24px;
  border-radius: 14px;
  transition: transform 0.2s, border-color 0.2s;
}
.metric-card:hover { transform: translateY(-2px); border-color: #374151; }
.metric-card.highlight { border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(180deg, rgba(99, 102, 241, 0.08), #111827); }
.card-title { font-size: 13px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 8px; }
.card-value { font-size: 32px; font-weight: 800; color: #fff; margin-bottom: 6px; }
.card-desc { font-size: 13px; color: #64748b; }

.feature-box { background: #111827; border: 1px solid #1f2937; padding: 32px; border-radius: 14px; text-align: center; }
.feature-box h2 { font-size: 22px; margin-bottom: 12px; }
.feature-box p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
.action-feed { background: #030712; border: 1px solid #1f2937; padding: 14px; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 12px; color: #38bdf8; }

.footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; text-align: center; font-size: 13px; color: #64748b; display: flex; flex-direction: column; gap: 6px; }'''

    generic_js = '''let count = 0;
function incrementCounter() {
  count++;
  var counterEl = document.getElementById('counter');
  if (counterEl) counterEl.innerText = count;
  logAction('Counter incremented to ' + count);
}
function triggerAction(name) {
  logAction('User triggered action: ' + name);
}
function logAction(msg) {
  var feed = document.getElementById('action-feed');
  if (feed) {
    feed.innerText = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  }
}'''

    readme = f"""# {hero_title}
Generated via deterministic offline studio template.

## Overview
{hero_sub}

## Architecture
- Framework: {framework}
- Template: {template}
"""
    return {
        "app": app_html.strip(),
        "css": css_styles.strip(),
        "js": generic_js.strip(),
        "files": {
            "index.html": app_html.strip(),
            "styles.css": css_styles.strip(),
            "script.js": generic_js.strip(),
            "README.md": readme,
        },
    }


def generate_website_with_meta(
    prompt: str,
    framework: str,
    template: str,
) -> Dict[str, Any]:
    full_prompt = f"""You are an expert {framework} web developer. Generate a professional, beautiful, fully functional website with realistic demo data.

IMPORTANT RULES:
1. Return ONLY THREE SECTIONS in this EXACT format:

===HTML===
(Complete HTML markup — full page with all content. Include realistic data, tables, cards, and interactive elements.)

===CSS===
(Complete CSS stylesheet — modern dark design, smooth animations, responsive)

===JS===
(All JavaScript — interactive features, DOM manipulation, data rendering)

2. No explanations outside the sections.
3. No markdown code fences.
4. Generate fully responsive, production-quality code.
5. Include realistic demo data (not placeholder "Lorem ipsum").
6. For management systems: include sidebar navigation, role-based views, data tables, analytics charts, and statistics.
7. For dashboards: include charts (CSS/JS bars), KPI cards, and live data simulation.
8. Make it look like a REAL application, not a generic landing page.

Framework: {framework}
Template: {template}

Website Requirements:
{prompt}
"""
    try:
        response = ask_llm(full_prompt, timeout=55.0)
        # Strip any accidental markdown fences
        response = (
            response
            .replace("```html", "").replace("```css", "")
            .replace("```javascript", "").replace("```js", "")
            .replace("```", "")
        )

        # Try three-section parse (HTML/CSS/JS)
        if "===HTML===" in response and "===CSS===" in response:
            # Split on ===JS=== if present
            if "===JS===" in response:
                html_part, rest = response.split("===CSS===", 1)
                css_part, js_part = rest.split("===JS===", 1)
            else:
                html_part, rest = response.split("===CSS===", 1)
                css_part = rest
                js_part = ""

            html_code = html_part.replace("===HTML===", "").strip()
            css_code = css_part.strip()
            js_code = js_part.strip()

            readme_text = f"# Website Project\nGenerated with Gemini AI.\n\nPrompt: {prompt[:80]}"
            return {
                "app": html_code,
                "css": css_code,
                "js": js_code,
                "files": {
                    "index.html": html_code,
                    "styles.css": css_code,
                    "script.js": js_code,
                    "README.md": readme_text,
                },
                "provider": "gemini",
                "fallback_used": False,
                "message": None,
            }

        # Legacy two-section parse (APP/CSS)
        if "===APP===" in response and "===CSS===" in response:
            parts = response.split("===CSS===", 1)
            app_code = parts[0].replace("===APP===", "").strip()
            css_code = parts[1].strip()
            return {
                "app": app_code,
                "css": css_code,
                "js": "",
                "files": {
                    "index.html": app_code,
                    "styles.css": css_code,
                    "script.js": "",
                    "README.md": f"# Website Project\nGenerated with Gemini AI.",
                },
                "provider": "gemini",
                "fallback_used": False,
                "message": None,
            }

        # No sections found — treat entire response as HTML
        return {
            "app": response.strip(),
            "css": "",
            "js": "",
            "files": {
                "index.html": response.strip(),
                "styles.css": "",
                "script.js": "",
                "README.md": f"# Website Project\nGenerated with Gemini AI.",
            },
            "provider": "gemini",
            "fallback_used": False,
            "message": None,
        }

    except Exception as exc:
        logger.warning(
            "Gemini generation failed or timed out for website builder (%s). Activating deterministic offline fallback.",
            exc,
        )
        fallback = generate_website_offline_fallback(prompt, framework, template)
        return {
            "app": fallback["app"],
            "css": fallback["css"],
            "js": fallback.get("js", ""),
            "files": fallback.get("files") or {
                "index.html": fallback["app"],
                "styles.css": fallback["css"],
                "script.js": fallback.get("js", ""),
                "README.md": "# Smart College Event & Attendance Management System\nGenerated via deterministic offline template.",
            },
            "provider": "deterministic_fallback",
            "fallback_used": True,
            "message": "Gemini unavailable or timed out. Website generated using the deterministic fallback.",
        }


def modify_website_with_ai(
    modification_prompt: str,
    current_html: str,
    current_css: str,
    current_js: str,
    framework: str,
) -> Dict[str, Any]:
    """
    AI-powered website modification: takes the existing code and a natural-language
    modification prompt and returns updated HTML/CSS/JS while preserving the existing structure.
    """
    full_prompt = f"""You are an expert {framework} web developer performing a targeted modification on an existing website.

EXISTING WEBSITE CODE:
--- HTML ---
{current_html[:4000]}

--- CSS ---
{current_css[:2000]}

--- JS ---
{current_js[:1000]}

MODIFICATION REQUESTED:
{modification_prompt}

RULES:
1. Return ONLY the updated code in THREE SECTIONS:

===HTML===
(Updated complete HTML — preserve all existing sections, only modify/add as requested)

===CSS===
(Updated CSS — add new styles, preserve all existing styles)

===JS===
(Updated JavaScript — add new functionality, preserve existing functions)

2. Do NOT remove existing features unless explicitly asked.
3. Preserve existing navigation, data, and layout structure.
4. Only ADD or MODIFY what the user specifically requested.
5. No explanations. No markdown fences. Only the three sections.
"""
    try:
        response = ask_llm(full_prompt, timeout=55.0)
        response = (
            response
            .replace("```html", "").replace("```css", "")
            .replace("```javascript", "").replace("```js", "")
            .replace("```", "")
        )

        if "===HTML===" in response and "===CSS===" in response:
            if "===JS===" in response:
                html_part, rest = response.split("===CSS===", 1)
                css_part, js_part = rest.split("===JS===", 1)
            else:
                html_part, rest = response.split("===CSS===", 1)
                css_part = rest
                js_part = current_js  # Preserve existing JS if not modified

            html_code = html_part.replace("===HTML===", "").strip()
            css_code = css_part.strip()
            js_code = js_part.strip()

            return {
                "app": html_code,
                "css": css_code,
                "js": js_code,
                "files": {
                    "index.html": html_code,
                    "styles.css": css_code,
                    "script.js": js_code,
                    "README.md": "# Website Project\nModified with Gemini AI.",
                },
                "provider": "gemini",
                "fallback_used": False,
                "message": "Website modified successfully with AI.",
            }

        # If no sections, treat response as a modification description and return unchanged
        return {
            "app": current_html,
            "css": current_css,
            "js": current_js,
            "files": {
                "index.html": current_html,
                "styles.css": current_css,
                "script.js": current_js,
                "README.md": "# Website Project\nOriginal code preserved.",
            },
            "provider": "gemini",
            "fallback_used": False,
            "message": "AI response did not include structured code. Original code preserved.",
        }

    except Exception as exc:
        logger.warning("Gemini modification failed or timed out: %s. Performing deterministic fallback modification.", exc)
        mod_lower = modification_prompt.lower()
        new_html = current_html
        new_css = current_css
        new_js = current_js

        # Handle attendance analytics requested in faculty demonstration
        if any(k in mod_lower for k in ["attendance", "analytics", "percentage", "present", "absent", "chart"]):
            if "attendance-analytics-section" not in new_html and "section-analytics" not in new_html:
                analytics_section = '''
      <!-- AI Added: Attendance Analytics Section -->
      <section id="attendance-analytics-section" class="content-section active" style="margin-top:20px;padding:20px;background:#0d1117;border:1px solid #1e2535;border-radius:14px;">
        <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:16px;color:#f1f5f9;font-weight:700;">📊 Live Attendance Analytics & Breakdown</h2>
          <span style="font-size:11px;background:#6366f1;color:#fff;padding:2px 10px;border-radius:99px;font-weight:600;">Event-wise Breakdown</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;margin-bottom:20px;">
          <div style="background:#111827;padding:16px;border-radius:12px;border-left:4px solid #10b981;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#10b981;">87%</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Present Rate (298/342)</div>
          </div>
          <div style="background:#111827;padding:16px;border-radius:12px;border-left:4px solid #ef4444;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#ef4444;">13%</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Absent Rate (44/342)</div>
          </div>
          <div style="background:#111827;padding:16px;border-radius:12px;border-left:4px solid #f59e0b;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#fbbf24;">94.2%</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Target Compliance</div>
          </div>
        </div>
        <div style="background:#111827;padding:18px;border-radius:12px;border:1px solid #1e2535;">
          <h3 style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:14px;">Event-wise Attendance Distribution</h3>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="width:140px;color:#94a3b8;">Hackathon 2026</span>
              <div style="flex:1;height:16px;background:#1e2535;border-radius:8px;overflow:hidden;"><div style="width:85%;height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);"></div></div>
              <span style="width:40px;text-align:right;color:#f1f5f9;font-weight:700;">85%</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="width:140px;color:#94a3b8;">AI & ML Bootcamp</span>
              <div style="flex:1;height:16px;background:#1e2535;border-radius:8px;overflow:hidden;"><div style="width:92%;height:100%;background:linear-gradient(90deg,#10b981,#34d399);"></div></div>
              <span style="width:40px;text-align:right;color:#f1f5f9;font-weight:700;">92%</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="width:140px;color:#94a3b8;">Tech Symposium</span>
              <div style="flex:1;height:16px;background:#1e2535;border-radius:8px;overflow:hidden;"><div style="width:73%;height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>
              <span style="width:40px;text-align:right;color:#f1f5f9;font-weight:700;">73%</span>
            </div>
          </div>
        </div>
      </section>
'''
                if "</main>" in new_html:
                    new_html = new_html.replace("</main>", f"{analytics_section}\n    </main>")
                else:
                    new_html += analytics_section
                msg = "Gemini unavailable or timed out. Modification applied using deterministic heuristics: Added attendance analytics section."
            else:
                msg = "Gemini unavailable or timed out. Attendance analytics section is already active."
        else:
            msg = "Gemini unavailable or timed out. Original code preserved."

        return {
            "app": new_html,
            "css": new_css,
            "js": new_js,
            "files": {
                "index.html": new_html,
                "styles.css": new_css,
                "script.js": new_js,
                "README.md": "# Website Project\nModified with deterministic heuristics.",
            },
            "provider": "deterministic_fallback",
            "fallback_used": True,
            "message": msg,
        }


def generate_website(
    prompt: str,
    framework: str,
    template: str,
) -> Dict[str, str]:
    res = generate_website_with_meta(prompt, framework, template)
    return {"app": res["app"], "css": res["css"], "js": res.get("js", "")}


def save_generated_website(
    project_name: str,
    framework: str,
    app: str,
    css: str,
    js: str = "",
):
    folder = save_website(
        project_name,
        framework,
        app,
        css,
        js,
    )
    return {
        "message": "Website saved successfully.",
        "folder": str(folder),
    }


def download_generated_website(
    project_name: str,
):
    zip_file = create_website_zip(project_name)
    return zip_file