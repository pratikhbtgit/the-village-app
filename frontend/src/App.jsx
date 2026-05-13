import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UserPlus, Package, Archive, Clock, Home, LogOut, CheckSquare, X, Edit, Trash2, BarChart, Menu, Shield } from 'lucide-react';
import { format } from 'date-fns';

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001/api' 
    : '/api';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('village_user') || 'null');
  } catch {
    return null;
  }
};

const hasPermission = (user, permission) => {
  return !!user?.permissions?.includes(permission);
};

const hasAnyPermission = (user, permissions = []) => {
  return permissions.some((permission) => hasPermission(user, permission));
};

// Globally inject JWT Token into all outgoing requests
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('village_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Globally catch 401 Unauthorized API responses to log user out
axios.interceptors.response.use(response => response, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('village_token');
    localStorage.removeItem('village_user');
    window.location.reload();
  }
  return Promise.reject(error);
});

function ProtectedRoute({ children, permission }) {
  const token = localStorage.getItem('village_token');
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: '520px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: '1.5rem',
          position: 'relative'
        }}
      >
        <button
          className="btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            padding: '0.2rem'
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { name: 'Volunteers', icon: <Users size={20} />, path: '/volunteers', permission: 'volunteers.read' },
    { name: 'Sign In / Out', icon: <Clock size={20} />, path: '/timeclock', permission: 'volunteerHours.read' },
    { name: 'Visitors', icon: <UserPlus size={20} />, path: '/visitors', permission: 'visitors.read' },
    { name: 'Inventory', icon: <Package size={20} />, path: '/items', permission: 'items.read' },
    { name: 'Check Out Packages', icon: <CheckSquare size={20} />, path: '/checkout', permission: 'checkouts.read' },
    { name: 'Reports', icon: <BarChart size={20} />, path: '/reports', permission: 'reports.read' },
    { name: 'User Management', icon: <Shield size={20} />, path: '/users', permission: 'users.read' },
  ];

  const visibleItems = navItems.filter(item =>
    !item.permission || hasPermission(user, item.permission)
  );

  return (
    <div className="sidebar" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="sidebar-header">
        <h1>THE VILLAGE</h1>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {visibleItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
        <button onClick={onLogout} className="nav-link" style={{width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--accent-danger)'}}>
          <LogOut size={20} /> Logout
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ volunteers: 0, visitors: 0, items: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/volunteers`),
      axios.get(`${API}/visitors`),
      axios.get(`${API}/items`)
    ]).then(([volReq, visReq, itReq]) => {
      setStats({
        volunteers: volReq.data.length,
        visitors: visReq.data.length,
        items: itReq.data.reduce((acc, curr) => acc + (curr.Quantity || 0), 0)
      });
    });
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title" style={{fontSize: '2.5rem', marginBottom: '1rem'}}>Welcome to The Village</h2>
      </div>
      
      <p style={{fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem'}}>What would you like to do today?</p>

      <div className="stat-grid" style={{marginBottom: '3rem'}}>
        <button className="action-card" onClick={() => navigate('/timeclock')}>
          <Clock size={48} color="var(--accent-primary)" style={{marginBottom: '1rem'}}/>
          <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>Sign In / Out</h3>
          <p style={{color: 'var(--text-secondary)'}}>Log your volunteer hours here.</p>
        </button>
        
        <button className="action-card" style={{borderColor: 'var(--accent-success)'}} onClick={() => navigate('/checkout')}>
          <CheckSquare size={48} color="var(--accent-success)" style={{marginBottom: '1rem'}}/>
          <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>Check Out Packages</h3>
          <p style={{color: 'var(--text-secondary)'}}>Hand out items to a visitor.</p>
        </button>
        
        <button className="action-card" onClick={() => navigate('/visitors')}>
          <UserPlus size={48} color="var(--accent-primary)" style={{marginBottom: '1rem'}}/>
          <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>Add a new Visitor</h3>
          <p style={{color: 'var(--text-secondary)'}}>Log information for a new foster parent/child.</p>
        </button>

        <button className="action-card" onClick={() => navigate('/volunteers')}>
          <Users size={48} color="var(--accent-warning)" style={{marginBottom: '1rem'}}/>
          <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>Add a Volunteer</h3>
          <p style={{color: 'var(--text-secondary)'}}>Register a new volunteer into the system.</p>
        </button>
      </div>

      <h3 style={{fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem'}}>Current Stats</h3>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-title">TOTAL VOLUNTEERS</div>
          <div className="stat-card-value">{stats.volunteers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">TOTAL VISITORS</div>
          <div className="stat-card-value">{stats.visitors}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">ITEMS IN INVENTORY</div>
          <div className="stat-card-value">{stats.items}</div>
        </div>
      </div>
    </div>
  );
}

function Volunteers({ currentUser }) {
  const [vols, setVols] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ firstname: '', lastname: '', phone: '', email: '', Qrcode: '' });

  const fetchVols = () => { axios.get(`${API}/volunteers`).then(res => setVols(res.data)) };
  useEffect(() => { fetchVols(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ firstname: '', lastname: '', phone: '', email: '', Qrcode: '' });
    setIsModalOpen(true);
  };

  const openEdit = (vol) => {
    setEditingId(vol.ID);
    setFormData(vol);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editingId ? axios.put(`${API}/volunteers/${editingId}`, formData) : axios.post(`${API}/volunteers`, formData);
    req.then(() => {
      setIsModalOpen(false);
      fetchVols();
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this volunteer?")) {
      axios.delete(`${API}/volunteers/${id}`).then(() => fetchVols()).catch(err => alert(err.response?.data?.error || err.message));
    }
  };

  const filteredVols = vols.filter(v => 
    (v.firstname + ' ' + v.lastname).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageVolunteers =
  hasPermission(currentUser, 'volunteers.update') ||
  hasPermission(currentUser, 'volunteers.delete');

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Volunteers</h2>
        <div style={{display: 'flex', gap: '1rem'}}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search volunteers..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{width: '250px'}}
          />
          {hasPermission(currentUser, 'volunteers.create') && (
            <button className="btn btn-primary" onClick={openAdd}><UserPlus size={18}/> Add Volunteer</button>
          )}
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              {canManageVolunteers && (
                <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredVols.map(v => (
              <tr key={v.ID}>
                <td>{v.firstname} {v.lastname}</td>
                <td>{v.phone}</td>
                <td>{v.email}</td>

                {canManageVolunteers && (
                  <td style={{ textAlign: 'center', width: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {hasPermission(currentUser, 'volunteers.update') && (
                        <button
                          className="btn"
                          style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.1)' }}
                          onClick={() => openEdit(v)}
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {hasPermission(currentUser, 'volunteers.delete') && (
                        <button
                          className="btn"
                          style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)' }}
                          onClick={() => handleDelete(v.ID)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Volunteer" : "Add Volunteer"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>First Name</label><input className="input" required value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} /></div>
          <div className="form-group"><label>Last Name</label><input className="input" required value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} /></div>
          <div className="form-group"><label>Phone</label><input className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
          <div className="form-group"><label>Email</label><input className="input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
          <div className="form-group"><label>QR Code</label><input className="input" value={formData.Qrcode} onChange={e => setFormData({...formData, Qrcode: e.target.value})} /></div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>{editingId ? "Update Volunteer" : "Save Volunteer"}</button>
        </form>
      </Modal>
    </div>
  );
}

function TimeClock({ currentUser }) {
  const [vols, setVols] = useState([]);
  const [hours, setHours] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get(`${API}/volunteers`).then(res => setVols(res.data));
    fetchHours();
  }, []);

  const fetchHours = () => axios.get(`${API}/volunteerHours`).then(res => setHours(res.data));

  const checkin = (id) => axios.post(`${API}/volunteerHours/checkin`, { volunterID: id }).then(fetchHours);
  const checkout = (id) => axios.post(`${API}/volunteerHours/checkout`, { volunterID: id }).then(fetchHours);

  const checkedInUsers = hours.filter(h => !h.TimeOut).map(h => h.volunterID);
  const isAdmin = currentUser?.role === 'admin';

  const visibleVols = vols.filter(v => {
  const matchesSearch = `${v.firstname} ${v.lastname}`.toLowerCase().includes(searchTerm.toLowerCase());
  if (!isAdmin) return matchesSearch && v.ID == currentUser?.volunteer_id;  
  return matchesSearch;
});

 const canActOnVolunteer = (volID) => {
  if (isAdmin) return true;
  return volID == currentUser?.volunteer_id;  
};

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Volunteer Sign In / Out</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>

        {/* Left Column — Active Roster */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Active Roster</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Quick Check-in / Check-out</p>
          {isAdmin && (
            <input
              type="text"
              className="input"
              placeholder="Search roster..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '0.5rem', flex: 1 }}>
            {visibleVols.map(v => {
              const isCheckedIn = checkedInUsers.includes(v.ID);
              const canAct = canActOnVolunteer(v.ID);
              return (
                <div key={v.ID} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: isCheckedIn ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)',
                  border: isCheckedIn ? '1px solid var(--accent-success)' : '1px solid var(--border-light)',
                  padding: '1rem', borderRadius: '10px', width: '100%'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{v.firstname} {v.lastname}</div>
                  {canAct ? (
                    isCheckedIn
                      ? <button onClick={() => checkout(v.ID)} className="btn btn-danger" style={{ minWidth: '120px', justifyContent: 'center', padding: '0.6rem' }}>Check Out</button>
                      : <button onClick={() => checkin(v.ID)} className="btn btn-success" style={{ minWidth: '120px', justifyContent: 'center', padding: '0.6rem' }}>Check In</button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {isCheckedIn ? '✓ Checked In' : 'Not checked in'}
                    </span>
                  )}
                </div>
              );
            })}
            {visibleVols.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                {isAdmin ? 'No volunteers found in roster.' : 'Your volunteer profile is not linked to this account. Ask an admin to link your account.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Recent Activity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Recent Log Activity</h3>
          <div className="table-container" style={{ margin: 0, flex: 1, overflowY: 'auto' }}>
            <table style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
                <tr><th>Volunteer</th><th>Check In</th><th>Check Out</th></tr>
              </thead>
              <tbody>
                {hours.length > 0 ? hours
                  .filter(h => isAdmin || h.volunterID == currentUser?.volunteer_id)
                  .map(h => (
                    <tr key={h.ID}>
                      <td style={{ fontWeight: 500 }}>{h.firstname} {h.lastname}</td>
                      <td>{h.TimeIn ? format(new Date(h.TimeIn), 'MMM d, yyyy h:mm a') : '-'}</td>
                      <td style={{ color: !h.TimeOut ? 'var(--accent-success)' : 'inherit', fontWeight: !h.TimeOut ? 600 : 'normal' }}>
                        {h.TimeOut ? format(new Date(h.TimeOut), 'MMM d, yyyy h:mm a') : 'Currently Active'}
                      </td>
                    </tr>
                  )) : (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No check-in history available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function Inventory({ currentUser }) {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ItemName: '', Category: '', Size: '', Condition: '', Amount: '0', Quantity: '1' });

  const fetchItems = () => { axios.get(`${API}/items`).then(res => setItems(res.data)) };
  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ItemName: '', Category: '', Size: '', Condition: '', Amount: '0', Quantity: '1' });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.itemID);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editingId ? axios.put(`${API}/items/${editingId}`, formData) : axios.post(`${API}/items`, formData);
    req.then(() => {
      setIsModalOpen(false);
      fetchItems();
    });
  };

  const handleUpdateQuantity = (id, newQuantity) => {
    if (newQuantity < 0) return;
    axios.put(`${API}/items/${id}`, { Quantity: newQuantity }).then(() => fetchItems());
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this item permanently?")) {
      axios.delete(`${API}/items/${id}`).then(() => fetchItems()).catch(err => alert(err.response?.data?.error || err.message));
    }
  };

  const filteredItems = items.filter(i => 
    (i.ItemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.Category || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Inventory</h2>
        <div style={{display: 'flex', gap: '1rem'}}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search items..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{width: '250px'}}
          />
          {hasPermission(currentUser, 'items.create') && (
            <button className="btn btn-primary" onClick={openAdd}><Package size={18}/> Add Item</button>
          )}
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Item Name</th><th>Category ID</th><th>Size</th><th>Condition</th><th>Quantity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredItems.map(i => (
              <tr key={i.itemID}>
                <td>{i.ItemName}</td>
                <td>{i.Category}</td>
                <td>{i.Size}</td>
                <td>{i.Condition}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {hasPermission(currentUser, 'items.update') && (
                      <button className="btn" style={{padding: '0.2rem 0.5rem'}} onClick={() => handleUpdateQuantity(i.itemID, i.Quantity - 1)}>-</button>
                    )}
                    <span style={{ fontWeight: i.Quantity <= 5 ? 'bold' : 'normal', color: i.Quantity <= 5 ? 'var(--accent-danger)' : 'inherit' }}>
                      {i.Quantity}
                    </span>
                    {hasPermission(currentUser, 'items.update') && (
                      <button className="btn" style={{padding: '0.2rem 0.5rem'}} onClick={() => handleUpdateQuantity(i.itemID, i.Quantity + 1)}>+</button>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    {hasPermission(currentUser, 'items.update') && (
                      <button className="btn" style={{padding: '0.4rem', background: 'rgba(255,255,255,0.1)'}} onClick={() => openEdit(i)}><Edit size={16} /></button>
                    )}
                    {hasPermission(currentUser, 'items.delete') && (
                      <button className="btn" style={{padding: '0.4rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)'}} onClick={() => handleDelete(i.itemID)}><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Item" : "Add Inventory Item"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Item Name</label><input className="input" required value={formData.ItemName} onChange={e => setFormData({...formData, ItemName: e.target.value})} /></div>
          <div className="form-group"><label>Category ID</label><input className="input" value={formData.Category} onChange={e => setFormData({...formData, Category: e.target.value})} /></div>
          <div className="form-group"><label>Size</label><input className="input" value={formData.Size} onChange={e => setFormData({...formData, Size: e.target.value})} /></div>
          <div className="form-group"><label>Condition</label><input className="input" value={formData.Condition} onChange={e => setFormData({...formData, Condition: e.target.value})} /></div>
          <div className="form-group"><label>Quantity</label><input className="input" type="number" required value={formData.Quantity} onChange={e => setFormData({...formData, Quantity: e.target.value})} /></div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>{editingId ? "Update Item" : "Save Item"}</button>
        </form>
      </Modal>
    </div>
  );
}


function Visitors({ currentUser }) {
  const [visitors, setVisitors] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ VName: '', Childfirstname: '', isfirstPlacement: false, RPMName: '', Region: '' });

  const fetchVisitors = () => { axios.get(`${API}/visitors`).then(res => setVisitors(res.data)) };
  useEffect(() => { fetchVisitors(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ VName: '', Childfirstname: '', isfirstPlacement: false, RPMName: '', Region: '' });
    setIsModalOpen(true);
  };

  const openEdit = (vis) => {
    setEditingId(vis.VisitorID);
    setFormData({ ...vis, isfirstPlacement: vis.isfirstPlacement === 1 });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editingId ? axios.put(`${API}/visitors/${editingId}`, formData) : axios.post(`${API}/visitors`, formData);
    req.then(() => { setIsModalOpen(false); fetchVisitors(); });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this visitor permanently?")) {
      axios.delete(`${API}/visitors/${id}`).then(() => fetchVisitors()).catch(err => alert(err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Visitors</h2>
        {hasPermission(currentUser, 'visitors.create') && (
          <button className="btn btn-primary" onClick={openAdd}><UserPlus size={18}/> Add Visitor</button>
        )}
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Visitor Name</th><th>Child's Name</th><th>First Placement?</th><th>Date Added</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visitors.map(v => (
              <tr key={v.VisitorID}>
                <td>{v.VName}</td>
                <td>{v.Childfirstname}</td>
                <td>{v.isfirstPlacement ? "Yes" : "No"}</td>
                <td>{v.visitDate ? format(new Date(v.visitDate), 'PP') : 'N/A'}</td>
                <td>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    {hasPermission(currentUser, 'visitors.update') && (
                      <button className="btn" style={{padding: '0.4rem', background: 'rgba(255,255,255,0.1)'}} onClick={() => openEdit(v)}><Edit size={16} /></button>
                    )}
                    {hasPermission(currentUser, 'visitors.delete') && (
                      <button className="btn" style={{padding: '0.4rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)'}} onClick={() => handleDelete(v.VisitorID)}><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Visitor" : "Add Visitor"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Visitor Name</label><input className="input" required value={formData.VName} onChange={e => setFormData({...formData, VName: e.target.value})} /></div>
          <div className="form-group"><label>Child's First Name</label><input className="input" value={formData.Childfirstname} onChange={e => setFormData({...formData, Childfirstname: e.target.value})} /></div>
          <div className="form-group" style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
            <input type="checkbox" checked={formData.isfirstPlacement} onChange={e => setFormData({...formData, isfirstPlacement: e.target.checked})} style={{width: 'auto'}}/>
            <label style={{marginBottom: 0}}>Is this their first placement?</label>
          </div>
          <div className="form-group"><label>RPM Name (Placement Agency)</label><input className="input" value={formData.RPMName} onChange={e => setFormData({...formData, RPMName: e.target.value})} /></div>
          <div className="form-group"><label>Region</label><input className="input" value={formData.Region} onChange={e => setFormData({...formData, Region: e.target.value})} /></div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>{editingId ? "Update Visitor" : "Save Visitor"}</button>
        </form>
      </Modal>
    </div>
  );
}

function CheckOut({ currentUser }) {
  const [checkouts, setCheckouts] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ VisitorID: '', ItemID: '', Quantity: '1' });
  const [error, setError] = useState(null);

  const fetchAll = () => { 
    axios.get(`${API}/checkouts`).then(res => setCheckouts(res.data));
    axios.get(`${API}/visitors`).then(res => setVisitors(res.data));
    axios.get(`${API}/items`).then(res => setItems(res.data));
  };
  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setFormData({ 
      VisitorID: visitors.length > 0 ? visitors[0].VisitorID : '', 
      ItemID: items.length > 0 ? items[0].itemID : '', 
      Quantity: '1' 
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.VisitorID || !formData.ItemID) return setError("Select a visitor and item.");
    axios.post(`${API}/checkouts`, formData).then(() => { 
      setIsModalOpen(false); 
      fetchAll(); 
    }).catch(err => setError(err.response?.data?.error || err.message));
  };

  const handleDelete = (id) => {
    if (window.confirm("Return this checkout? It will be deleted and the item quantity restored.")) {
      axios.delete(`${API}/checkouts/${id}`).then(() => fetchAll()).catch(err => alert(err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Check Out Packages Log</h2>
        {hasPermission(currentUser, 'checkouts.create') && (
          <button className="btn btn-primary" onClick={openAdd}><CheckSquare size={18}/> New Check Out</button>
        )}
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Date</th><th>Visitor / Child</th><th>Item Dispensed</th><th>Amount</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {checkouts.map(c => (
              <tr key={c.checkoutID}>
                <td>{c.CheckoutDate ? format(new Date(c.CheckoutDate), 'PP p') : 'N/A'}</td>
                <td>{c.VisitorName} ({c.Childfirstname})</td>
                <td>{c.ItemName}</td>
                <td>{c.Quanlity}</td>
                <td>
                  {hasPermission(currentUser, 'checkouts.delete') && (
                    <button className="btn btn-danger" style={{padding: '0.4rem'}} onClick={() => handleDelete(c.checkoutID)}>Return Stock</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={"Dispense Item to Visitor"}>
        {error && <div style={{background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Visitor</label>
            <select className="input" value={formData.VisitorID} onChange={e => setFormData({...formData, VisitorID: e.target.value})}>
              <option value="">-- Choose Visitor --</option>
              {visitors.map(v => <option key={v.VisitorID} value={v.VisitorID}>{v.VName} (Child: {v.Childfirstname})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Select Item to Dispense</label>
            <select className="input" value={formData.ItemID} onChange={e => setFormData({...formData, ItemID: e.target.value})}>
              <option value="">-- Choose Item ({items.length} loaded) --</option>
              {items.filter(i => i.Quantity > 0).map(i => <option key={i.itemID} value={i.itemID}>{i.ItemName} (Stock: {i.Quantity})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Quantity Issued</label>
            <input className="input" type="number" required value={formData.Quantity} onChange={e => setFormData({...formData, Quantity: e.target.value})} />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>Confirm Check Out</button>
        </form>
      </Modal>
    </div>
  );
}


function Reports({ currentUser }) {
  const [items, setItems] = useState([]);
  const [hours, setHours] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    axios.get(`${API}/items`).then(res => setItems(res.data));
    axios.get(`${API}/volunteerHours`).then(res => setHours(res.data));
    axios.get(`${API}/checkouts`).then(res => setCheckouts(res.data));
    axios.get(`${API}/visitors`).then(res => setVisitors(res.data));
  }, []);

  const isWithinRange = (dateString) => {
    if (dateRange === 'all' || !dateString) return true;
    const date = new Date(dateString);
    if (dateRange === 'custom') {
      const start = customStart ? new Date(customStart) : new Date(0);
      const end = customEnd ? new Date(customEnd) : new Date('2100-01-01');
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (dateRange === '1d') return diffMs <= 24 * 60 * 60 * 1000;
    if (dateRange === '7d') return diffMs <= 7 * 24 * 60 * 60 * 1000;
    if (dateRange === '30d') return diffMs <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  const filteredHours = hours.filter(h => isWithinRange(h.TimeIn));
  const filteredCheckouts = checkouts.filter(c => isWithinRange(c.CheckoutDate));
  const filteredVisitors = visitors.filter(v => isWithinRange(v.visitDate));
  const lowStock = items.filter(i => i.Quantity <= 5);

  const totalHours = filteredHours.reduce((acc, h) => {
    if (h.TimeIn && h.TimeOut) {
      const start = new Date(h.TimeIn);
      const end = new Date(h.TimeOut);
      return acc + ((end - start) / 3600000);
    }
    return acc;
  }, 0);

  const volunteerStats = {};
  filteredHours.forEach(h => {
    if (h.TimeIn && h.TimeOut) {
      const hrs = ((new Date(h.TimeOut) - new Date(h.TimeIn)) / 3600000);
      const name = `${h.firstname} ${h.lastname}`;
      if (!volunteerStats[name]) volunteerStats[name] = 0;
      volunteerStats[name] += hrs;
    }
  });

  const topVolunteers = Object.entries(volunteerStats)
    .map(([name, hrs]) => ({ name, hrs }))
    .sort((a, b) => b.hrs - a.hrs);

  const totalItemsDispensed = filteredCheckouts.reduce((acc, c) => acc + (c.Quanlity || 0), 0);
  const firstPlacements = filteredVisitors.filter(v => v.isfirstPlacement).length;

  const dispensedStats = {};
  filteredCheckouts.forEach(c => {
    const name = c.ItemName || 'Unknown Item';
    if (!dispensedStats[name]) dispensedStats[name] = 0;
    dispensedStats[name] += (c.Quanlity || 0);
  });

  const topDispensed = Object.entries(dispensedStats)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const formatHoursToHHMM = (decimalHours) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="page-title">Reports & Comprehensive Analytics</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span>to</span>
              <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          )}
          <select 
            className="input" 
            style={{ width: '200px', fontWeight: 'bold' }} 
            value={dateRange} 
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range...</option>
          </select>
        </div>
      </div>

      {/* Top Value Cards */}
      <div className="stat-grid" style={{marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
        <div className="stat-card" style={{borderColor: 'var(--accent-warning)', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">LOW STOCK ITEMS (&le; 5)</div>
          <div className="stat-card-value" style={{color: 'var(--accent-warning)', fontSize: '2rem'}}>{lowStock.length}</div>
        </div>
        <div className="stat-card" style={{borderColor: 'var(--accent-primary)', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">TOTAL HOURS LOGGED</div>
          <div className="stat-card-value" style={{color: 'var(--accent-primary)', fontSize: '2rem'}}>{formatHoursToHHMM(totalHours)}</div>
        </div>
        <div className="stat-card" style={{borderColor: '#8b5cf6', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">TOTAL ITEMS DISPENSED</div>
          <div className="stat-card-value" style={{color: '#8b5cf6', fontSize: '2rem'}}>{totalItemsDispensed}</div>
        </div>
        <div className="stat-card" style={{borderColor: '#ec4899', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">FIRST PLACEMENT VISITORS</div>
          <div className="stat-card-value" style={{color: '#ec4899', fontSize: '2rem'}}>{firstPlacements}</div>
        </div>
      </div>

      {/* Detailed Analysis Tables */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem'}}>
        <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '1rem', color: 'var(--accent-danger)'}}>Critical Inventory (Low Stock)</h3>
          <div className="table-container" style={{flex: 1, maxHeight: '300px', overflowY: 'auto'}}>
            {lowStock.length > 0 ? (
              <table>
                <thead style={{position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)'}}>
                  <tr><th>Item Name</th><th>Category</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {lowStock.map(i => (
                    <tr key={i.itemID}>
                      <td>{i.ItemName}</td>
                      <td>{i.Category}</td>
                      <td style={{fontWeight: 'bold', color: 'var(--accent-danger)'}}>{i.Quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center'}}>All items are sufficiently stocked!</div>
            )}
          </div>
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '1rem', color: '#8b5cf6'}}>Most Distributed Items (Top 5)</h3>
          <div className="table-container" style={{flex: 1, maxHeight: '300px', overflowY: 'auto'}}>
            {topDispensed.length > 0 ? (
              <table>
                <thead style={{position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)'}}>
                  <tr><th>Item Name</th><th>Total Quantity Dispensed</th></tr>
                </thead>
                <tbody>
                  {topDispensed.map(i => (
                    <tr key={i.name}>
                      <td>{i.name}</td>
                      <td style={{fontWeight: 'bold', color: '#8b5cf6'}}>{i.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center'}}>No items have been dispensed yet.</div>
            )}
          </div>
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '1rem', color: 'var(--accent-primary)'}}>Volunteer Leaderboard</h3>
          <div className="table-container" style={{flex: 1, maxHeight: '300px', overflowY: 'auto'}}>
            {topVolunteers.length > 0 ? (
              <table>
                <thead style={{position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)'}}>
                  <tr><th>Volunteer Name</th><th>Hours Contributed</th></tr>
                </thead>
                <tbody>
                  {topVolunteers.map(v => (
                    <tr key={v.name}>
                      <td>{v.name}</td>
                      <td style={{fontWeight: 'bold', color: 'var(--accent-primary)'}}>{formatHoursToHHMM(v.hrs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center'}}>No volunteer hours have been logged yet.</div>
            )}
          </div>
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '1rem', color: '#10b981'}}>Recent Check Out History</h3>
          <div className="table-container" style={{flex: 1, maxHeight: '300px', overflowY: 'auto'}}>
            {filteredCheckouts.length > 0 ? (
              <table>
                <thead style={{position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)'}}>
                  <tr><th>Date</th><th>Visitor</th><th>Item</th><th>Qty</th></tr>
                </thead>
                <tbody>
                  {filteredCheckouts.slice(0, 5).map(c => (
                    <tr key={c.checkoutID}>
                      <td>{c.CheckoutDate ? format(new Date(c.CheckoutDate), 'MMM d, h:mm a') : 'N/A'}</td>
                      <td>{c.VisitorName}</td>
                      <td>{c.ItemName}</td>
                      <td>{c.Quanlity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center'}}>No checkouts recorded in this time range.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    username: '',
    password: '',
    role: 'volunteer',
    volunteer_id: ''
  });

  const fetchUsers = () =>
    axios
      .get(`${API}/users`)
      .then(res => setUsers(res.data))
      .catch(() => alert('Error fetching users'));

  useEffect(() => {
    fetchUsers();
    axios
      .get(`${API}/roles`)
      .then(res => setRoles(res.data))
      .catch(err => console.error('Roles fetch failed:', err));

    axios
      .get(`${API}/volunteers`)
      .then(res => setVolunteers(res.data))
      .catch(err => console.error('Volunteers fetch failed:', err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      volunteer_id: formData.volunteer_id === '' ? null : Number(formData.volunteer_id)
    };

    if (formData.id) {
      axios
        .put(`${API}/users/${formData.id}`, payload)
        .then(() => {
          fetchUsers();
          setIsModalOpen(false);
        })
        .catch(err => alert(err.response?.data?.error || 'Error updating user'));
    } else {
      axios
        .post(`${API}/register`, payload)
        .then(() => {
          fetchUsers();
          setIsModalOpen(false);
        })
        .catch(err => alert(err.response?.data?.error || 'Error creating user'));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to completely remove this user account?')) {
      axios
        .delete(`${API}/users/${id}`)
        .then(fetchUsers)
        .catch(err => alert(err.response?.data?.error || 'Error deleting user'));
    }
  };

  const openEditModal = (user) => {
    setFormData({
      id: user.id,
      username: user.username,
      password: '',
      role: user.role,
      volunteer_id: user.volunteer_id || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({
      id: null,
      username: '',
      password: '',
      role: 'volunteer',
      volunteer_id: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">User Management</h2>
        {hasPermission(currentUser, 'users.create') && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <UserPlus size={20} /> Add User Account
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Assigned Role</th>
              <th>Volunteer Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const linkedVol = volunteers.find(v => v.ID === u.volunteer_id);
              return (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor:
                          u.role === 'admin'
                            ? 'rgba(14,165,233,0.1)'
                            : 'rgba(16,185,129,0.1)',
                        color:
                          u.role === 'admin'
                            ? 'var(--accent-primary)'
                            : 'var(--accent-success)'
                      }}
                    >
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td
                    style={{
                      color: linkedVol ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontStyle: linkedVol ? 'normal' : 'italic'
                    }}
                  >
                    {linkedVol ? `${linkedVol.firstname} ${linkedVol.lastname}` : 'Not linked'}
                  </td>
                  <td>
                    {hasPermission(currentUser, 'users.update') && (
                      <button
                        className="btn"
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          padding: '0.5rem'
                        }}
                        onClick={() => openEditModal(u)}
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    {hasPermission(currentUser, 'users.delete') && (
                      <button
                        className="btn"
                        style={{
                          background: 'transparent',
                          color: 'var(--accent-danger)',
                          padding: '0.5rem'
                        }}
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Edit User Access' : 'Add New User Account'}
      >
        <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                className="input"
                required
                disabled={!!formData.id}
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
              />
            </div>

            <div className="form-group">
              <label>{formData.id ? 'Reset Password (leave blank to keep current)' : 'Password'}</label>
              <input
                className="input"
                type="password"
                required={!formData.id}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Volunteer</label>
              <select
                className="input"
                style={{ display: 'block', width: '100%', minHeight: '44px', opacity: 1 }}
                value={formData.volunteer_id || ''}
                onChange={e => setFormData({ ...formData, volunteer_id: e.target.value })}
              >
                <option value="">-- No Volunteer Linked --</option>
                {volunteers.map(v => (
                  <option key={v.ID} value={v.ID}>
                    {v.firstname} {v.lastname}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>System Role</label>
              <select
                className="input"
                required
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                {roles.length > 0
                  ? roles.map(r => (
                      <option key={r.id} value={r.name}>
                        {r.name.replace('_', ' ').toUpperCase()}
                      </option>
                    ))
                  : (
                    <>
                      <option value="volunteer">VOLUNTEER</option>
                      <option value="admin">ADMIN</option>
                      <option value="inventory_manager">INVENTORY MANAGER</option>
                      <option value="reports_viewer">REPORTS VIEWER</option>
                    </>
                  )}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {formData.id ? 'Save Changes' : 'Create Account'}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}


function AuthManager({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [cred, setCred] = useState({ username: '', password: '', confirmPassword: '', token: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleAction = (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (mode === 'login') {
      axios.post(`${API}/login`, { username: cred.username, password: cred.password })
        .then(res => {
          if (res.data.token) {
            localStorage.setItem('village_token', res.data.token);
            localStorage.setItem('village_user', JSON.stringify(res.data.user));
            onLogin(res.data.token, res.data.user);
          }
        })
        .catch(err => setMsg({ type: 'error', text: err.response?.data?.error || "Invalid Username or Password" }));
    } else if (mode === 'forgot') {
      axios.post(`${API}/forgot-password`, { username: cred.username })
        .then(res => {
          setMsg({ type: 'success', text: `Token generated: ${res.data.token} (Save this!)` });
          setMode('reset');
        })
        .catch(err => setMsg({ type: 'error', text: err.response?.data?.error || "Failed to generate token" }));
    } else if (mode === 'reset') {
      if (cred.password !== cred.confirmPassword) return setMsg({ type: 'error', text: "Passwords do not match" });
      axios.post(`${API}/reset-password`, { username: cred.username, token: cred.token, newPassword: cred.password })
        .then(() => {
          setMsg({ type: 'success', text: "Password reset successful. Please login." });
          setMode('login');
          setCred({ ...cred, password: '', confirmPassword: '', token: '' });
        })
        .catch(err => setMsg({ type: 'error', text: err.response?.data?.error || "Failed to reset password" }));
    }
  };

  return (
    <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)'}}>
      <div className="card" style={{width: '400px', textAlign: 'center'}}>
        <h1 style={{color: 'var(--accent-primary)', marginBottom: '2rem'}}>THE VILLAGE</h1>
        {msg.text && (
          <div style={{color: msg.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)', marginBottom: '1rem'}}>
            {msg.text}
          </div>
        )}
        <form onSubmit={handleAction} style={{textAlign: 'left'}}>
          <div className="form-group">
            <label>Username</label>
            <input className="input" required value={cred.username} onChange={e => setCred({...cred, username: e.target.value})} />
          </div>

          {mode === 'reset' && (
            <div className="form-group">
              <label>Reset Token</label>
              <input className="input" required value={cred.token} onChange={e => setCred({...cred, token: e.target.value})} />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="form-group">
              <label>{mode === 'reset' ? 'New Password' : 'Password'}</label>
              <input className="input" required type="password" value={cred.password} onChange={e => setCred({...cred, password: e.target.value})} />
            </div>
          )}

          {mode === 'reset' && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input className="input" required type="password" value={cred.confirmPassword} onChange={e => setCred({...cred, confirmPassword: e.target.value})} />
            </div>
          )}

          <button className="btn btn-primary" style={{width: '100%', justifyContent: 'center', marginTop: '1rem'}}>
            {mode === 'login' ? 'Secure Login' : mode === 'forgot' ? 'Get Reset Token' : 'Reset Password'}
          </button>
        </form>

        <div style={{marginTop: '1.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          {mode === 'login' && (
            <button type="button" className="btn" style={{background: 'none', color: 'var(--text-secondary)', padding: 0}} onClick={() => { setMode('forgot'); setMsg({type:'',text:''}); }}>
              Forgot Password?
            </button>
          )}
          {mode !== 'login' && (
            <button type="button" className="btn" style={{background: 'none', color: 'var(--text-secondary)', padding: 0}} onClick={() => { setMode('login'); setMsg({type:'',text:''}); }}>
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('village_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('village_user') || 'null');
    } catch {
      return null;
    }
  });

  const handleLogin = (token, userData) => {
    localStorage.setItem('village_token', token);
    if (userData) {
      localStorage.setItem('village_user', JSON.stringify(userData));
      setUser(userData);
    }
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('village_token');
    localStorage.removeItem('village_user');
    setAuthToken(null);
    setUser(null);
  };

  if (!authToken) {
    return <AuthManager onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="main-content">
          <div className="header">
            <span style={{color: "var(--text-secondary)", fontSize: "0.875rem"}}>
              Logged in as: <strong style={{color: 'var(--accent-primary)'}}>{user?.username || 'User'}</strong>
              <span style={{marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.7}}>({user?.role})</span>
            </span>
          </div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/volunteers" element={
              <ProtectedRoute permission="volunteers.read">
                <Volunteers currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/timeclock" element={
              <ProtectedRoute permission="volunteerHours.read">
                <TimeClock currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/items" element={
              <ProtectedRoute permission="items.read">
                <Inventory currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/visitors" element={
              <ProtectedRoute permission="visitors.read">
                <Visitors currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute permission="checkouts.read">
                <CheckOut currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute permission="reports.read">
                <Reports currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute permission="users.read">
                <UserManagement currentUser={user} />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;