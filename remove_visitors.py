import re

with open('frontend/src/App.jsx', 'r') as f:
    content = f.read()

# 1. Sidebar link
content = re.sub(r"^\s*\{ name: 'Visitors', icon: <UserPlus size=\{20\} />, path: '/visitors', permission: 'visitors\.read' \},\n", "", content, flags=re.MULTILINE)

# 2. Dashboard Stats
content = content.replace("const [stats, setStats] = useState({ volunteers: 0, visitors: 0, items: 0 });", "const [stats, setStats] = useState({ volunteers: 0, items: 0 });")
content = content.replace("      axios.get(`${API}/visitors`),\n", "")
content = content.replace("]).then(([volReq, visReq, itReq]) => {", "]).then(([volReq, itReq]) => {")
content = content.replace("        visitors: visReq.data.length,\n", "")

# 3. Dashboard Add Visitor Button
dashboard_btn_pattern = r'^\s*<button className="action-card" onClick=\{\(\) => navigate\(\'/visitors\'\)\}>\n\s*<UserPlus size=\{48\}.*?>\n\s*<h3.*?>Add a new Visitor</h3>\n\s*<p.*?>.*?</p>\n\s*</button>\n'
content = re.sub(dashboard_btn_pattern, "", content, flags=re.MULTILINE)

# 4. Dashboard Total Visitors Stat
dashboard_stat_pattern = r'^\s*<div className="stat-card">\n\s*<div className="stat-card-title">TOTAL VISITORS</div>\n\s*<div className="stat-card-value">\{stats\.visitors\}</div>\n\s*</div>\n'
content = re.sub(dashboard_stat_pattern, "", content, flags=re.MULTILINE)

# 5. Visitors Component
component_pattern = r'^function Visitors\(\{ currentUser \}\) \{.*?\n\}\n'
content = re.sub(component_pattern, "", content, flags=re.MULTILINE|re.DOTALL)

# 6. Reports state
content = content.replace("  const [visitors, setVisitors] = useState([]);\n", "")
content = content.replace("    axios.get(`${API}/visitors`).then(res => setVisitors(res.data));\n", "")
content = content.replace("  const filteredVisitors = visitors.filter(v => isWithinRange(v.visitDate));\n", "")
content = content.replace("  const firstPlacements = filteredVisitors.filter(v => v.isfirstPlacement).length;\n", "")

# 7. Reports First Placement Stat
reports_stat_pattern = r'^\s*<div className="stat-card" style=\{\{borderColor: \'#ec4899\', borderLeftWidth: \'4px\'\}\}>\n\s*<div className="stat-card-title">FIRST PLACEMENT VISITORS</div>\n\s*<div className="stat-card-value" style=\{\{color: \'#ec4899\', fontSize: \'2rem\'\}\}>\{firstPlacements\}</div>\n\s*</div>\n'
content = re.sub(reports_stat_pattern, "", content, flags=re.MULTILINE)

# 8. Route
route_pattern = r'^\s*<Route path="/visitors" element=\{\n\s*<ProtectedRoute permission="visitors\.read">\n\s*<Visitors currentUser=\{user\} />\n\s*</ProtectedRoute>\n\s*\} />\n'
content = re.sub(route_pattern, "", content, flags=re.MULTILINE)

with open('frontend/src/App.jsx', 'w') as f:
    f.write(content)
