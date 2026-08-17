import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UserPlus, Package, Archive, Clock, Home, LogOut, X, Edit, Trash2, BarChart, Menu, Shield, FileText, Printer, Plus, Search, Eye, Barcode } from 'lucide-react';
import { format } from 'date-fns';
import villageLogo from './assets/village-logo.svg';
import skusMapping from './assets/skus.json';
import CreatableSelect from 'react-select/creatable';

const uniqueSkuItems = Array.from(new Set(Object.values(skusMapping))).sort();
const selectOptions = uniqueSkuItems.map(item => ({ value: item, label: item }));

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
  if (user?.role === 'admin') return true;
  if (user?.role === 'volunteer' && permission?.startsWith('requests.')) return true;
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

// ─── SKU Reference Data (from The-Village-SKU-s-Rev1.xlsx) ───────────────────

const SKU_DEPARTMENTS = [
  { code: '01', label: 'Clothes' },
  { code: '02', label: 'Babies' },
  { code: '03', label: 'Winter' },
  { code: '04', label: 'School Supplies' },
  { code: '05', label: 'Bedding' },
  { code: '06', label: 'Independent Living' },
  { code: '07', label: 'Toiletries' },
  { code: '08', label: 'Beauty' },
  { code: '09', label: 'Tech' },
  { code: '10', label: 'Accessories' },
  { code: '11', label: 'Crafts' },
  { code: '12', label: 'Toys' },
  { code: '13', label: 'Bikes' },
  { code: '14', label: 'Travel' },
  { code: '15', label: 'Furniture' },
  { code: '16', label: 'Shopping Bags' },
  { code: '17', label: 'Footwear' },
  { code: '18', label: 'Giving Machine' },
  { code: '19', label: 'Birthdays' },
];

const SKU_ITEMS_BY_DEPT = {
  '01': [
    { code: '01', label: 'Pants' },
    { code: '02', label: 'Shirt' },
    { code: '03', label: 'Dress' },
    { code: '04', label: 'Shorts' },
    { code: '05', label: 'Hoodie' },
    { code: '06', label: 'Formal Dress' },
    { code: '07', label: 'Formal Mens Suit' },
    { code: '08', label: 'Socks' },
    { code: '09', label: 'Underwear' },
    { code: '10', label: 'Pajamas' },
    { code: '11', label: 'Bagged Outfit' },
    { code: '12', label: 'Belt' },
    { code: '13', label: 'Bras' },
    { code: '14', label: 'Tie' },
    { code: '15', label: 'Baseball Cap' },
    { code: '16', label: 'Onesies' },
    { code: '17', label: 'Hat' },
    { code: '18', label: 'Sweats' },
    { code: '19', label: 'Swimsuit' },
  ],
  '02': [
    { code: '01', label: 'Diapers' },
    { code: '02', label: 'Pull Ups' },
    { code: '03', label: 'Wipes' },
    { code: '04', label: 'Bibs' },
    { code: '05', label: 'Burpers' },
    { code: '06', label: 'Diaper Bag' },
    { code: '07', label: 'Crib' },
    { code: '08', label: 'Crib Mattress' },
    { code: '09', label: 'Car Seat' },
    { code: '10', label: 'Stroller' },
    { code: '11', label: 'Bouncer' },
    { code: '12', label: 'Walker' },
    { code: '13', label: 'Potty Chair' },
    { code: '14', label: 'Baby Bath' },
    { code: '15', label: 'Baby Shampoo' },
    { code: '16', label: 'Baby Soap' },
    { code: '17', label: 'Bum Cream' },
    { code: '18', label: 'Baby Carrier' },
    { code: '19', label: 'Car Seat Cover' },
    { code: '20', label: 'Swaddlers' },
    { code: '21', label: 'Highchair' },
    { code: '22', label: 'Misc. Baby Items' },
    { code: '23', label: 'Toddler Mattress' },
    { code: '24', label: 'Toddler Bed' },
    { code: '25', label: 'Crib Sheets' },
    { code: '27', label: 'Bottles' },
  ],
  '03': [
    { code: '01', label: 'Coats' },
    { code: '02', label: 'Winter Hat' },
    { code: '03', label: 'Gloves' },
    { code: '04', label: 'Snow Pants' },
  ],
  '04': [
    { code: '01', label: 'Book Bag' },
    { code: '02', label: 'School Supplies' },
    { code: '03', label: 'Packed Book Bag' },
  ],
  '05': [
    { code: '01', label: 'Pillow' },
    { code: '02', label: 'Blanket/Quilt' },
    { code: '03', label: 'Weighted Blanket' },
    { code: '04', label: 'Twin Sheets' },
  ],
  '06': [
    { code: '01', label: 'Independent Living Kit' },
    { code: '02', label: 'Laundry Soap' },
    { code: '03', label: 'Food Box' },
    { code: '04', label: 'Toilet Paper' },
    { code: '05', label: 'Gift Card' },
    { code: '06', label: 'Hot Plate' },
    { code: '07', label: 'Slow Cooker' },
  ],
  '07': [
    { code: '01', label: 'Shampoo' },
    { code: '02', label: 'Conditioner' },
    { code: '03', label: 'Toothpaste' },
    { code: '04', label: 'Toothbrush' },
    { code: '05', label: 'Floss' },
    { code: '06', label: 'Body Wash' },
    { code: '07', label: 'Deodorant' },
    { code: '08', label: 'Shaving Cream' },
    { code: '09', label: 'Razors' },
    { code: '10', label: 'Feminine Products' },
    { code: '11', label: 'Lotion' },
    { code: '12', label: 'Misc. Hygiene Items' },
    { code: '13', label: 'Hair Brush' },
    { code: '14', label: 'Hair Accessories' },
  ],
  '08': [
    { code: '01', label: 'Makeup' },
    { code: '02', label: 'Jewelry' },
  ],
  '09': [
    { code: '01', label: 'Headphones' },
    { code: '02', label: 'MP3 Player' },
    { code: '03', label: 'Speaker' },
  ],
  '10': [
    { code: '01', label: 'Purse' },
    { code: '02', label: 'Wallet' },
  ],
  '11': [
    { code: '01', label: 'Crocheting Kit' },
    { code: '02', label: 'Art Supply' },
    { code: '03', label: 'Craft Items' },
    { code: '04', label: 'Sunglasses' },
    { code: '05', label: 'Life Jacket' },
  ],
  '12': [
    { code: '01', label: 'Books' },
    { code: '02', label: 'Toys' },
    { code: '03', label: 'Stuffies' },
    { code: '04', label: 'Fidget/Sensory Items' },
  ],
  '13': [
    { code: '01', label: 'Helmet' },
    { code: '02', label: 'Bicycle' },
    { code: '03', label: 'Bike Lock' },
    { code: '04', label: 'Misc. Bike Gear' },
  ],
  '14': [
    { code: '01', label: 'Suitcase' },
    { code: '02', label: 'Duffle Bag' },
  ],
  '15': [
    { code: '01', label: 'Dressers' },
    { code: '02', label: 'Misc. Furniture' },
    { code: '03', label: 'Twin Bed' },
    { code: '04', label: 'Bunk Beds' },
  ],
  '16': [
    { code: '01', label: 'Shopping Bags (All)' },
  ],
  '17': [
    { code: '01', label: 'Shoes (Kids 01-07)' },
    { code: '08', label: 'Shoes (Teen/Adult 08-15)' },
    { code: '02', label: 'Winter Boots (Kids 01-07)' },
    { code: '09', label: 'Winter Boots (Teen/Adult 08-15)' },
  ],
  '18': [
    { code: '01', label: 'GM Bike' },
    { code: '02', label: 'GM Suitcase' },
    { code: '03', label: 'GM Pajamas' },
    { code: '04', label: 'GM Underwear Bundle' },
    { code: '05', label: 'GM Pots & Pans' },
  ],
  '19': [
    { code: '01', label: 'Birthday Room' },
  ],
};

const SKU_SIZES = [
  { code: '024M', label: '0-24 Months' },
  { code: '025T', label: '2T-5T' },
  { code: '046X', label: '4-6x' },
  { code: '00', label: 'XS' },
  { code: '01', label: 'SM' },
  { code: '02', label: 'MED' },
  { code: '03', label: 'LG' },
  { code: '04', label: 'XL' },
  { code: '05', label: 'XXL' },
  { code: 'ALL', label: 'All Sizes' },
  { code: 'N/A', label: 'N/A (No Size)' },
];

function buildSKU(deptCode, itemCode, sizeCode) {
  if (!deptCode || !itemCode) return '';
  return `${deptCode}-${itemCode}-${sizeCode || 'N/A'}`;
}

// ─── Shared Components ────────────────────────────────────────────────────────

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

function Modal({ isOpen, onClose, title, children, width = '560px' }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem'
      }}
    >
      <div
        style={{
          width: width,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '2rem',
          position: 'relative'
        }}
      >
        <button
          className="btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '9999px',
            padding: '0.35rem',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ marginBottom: '1.75rem', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>{title}</h3>
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
    { name: 'Inventory', icon: <Package size={20} />, path: '/items', permission: 'items.read' },
    { name: 'Request Forms', icon: <FileText size={20} />, path: '/requests', permission: 'requests.read' },
    { name: 'Reports', icon: <BarChart size={20} />, path: '/reports', permission: 'reports.read' },
    { name: 'User Management', icon: <Shield size={20} />, path: '/users', permission: 'users.read' },
  ];

  const visibleItems = navItems.filter(item =>
    !item.permission || hasPermission(user, item.permission)
  );

  return (
    <div className="sidebar" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="sidebar-header" style={{padding: '10px', justifyContent: 'center', position: 'relative'}}>
          <img src={villageLogo} alt="The Village" style={{width: '100%', height: 'auto', display: 'block'}} />
          <button className="mobile-menu-btn" style={{position: 'absolute', top: '10px', right: '10px'}} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
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
  const [stats, setStats] = useState({ volunteers: 0, items: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/volunteers`),
      axios.get(`${API}/items`)
    ]).then(([volReq, itReq]) => {
      setStats({
        volunteers: volReq.data.length,
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

        <button className="action-card" onClick={() => navigate('/requests')}>
          <FileText size={48} color="var(--accent-primary)" style={{marginBottom: '1rem'}}/>
          <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>Foster Request Forms</h3>
          <p style={{color: 'var(--text-secondary)'}}>Intake and manage foster family item requests.</p>
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

// ─── Inventory (updated: SKU system + Kit Items) ──────────────────────────────

function Inventory({ currentUser }) {
  const EMPTY_FORM = {
    ItemName: '',
    SKU: '',
    deptCode: '',
    itemCode: '',
    sizeCode: 'N/A',
    Category: '',
    Size: '',
    Condition: '',
    Amount: '0',
    Quantity: '1',
    isKit: false,
    KitContents: '',
  };

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchItems = () => { axios.get(`${API}/items`).then(res => setItems(res.data)) };
  useEffect(() => { fetchItems(); }, []);

  // When dept/item/size dropdowns change, sync Category, Size, SKU, and ItemName
  const handleDeptChange = (deptCode) => {
    const dept = SKU_DEPARTMENTS.find(d => d.code === deptCode);
    setFormData(prev => ({
      ...prev,
      deptCode,
      itemCode: '',
      SKU: '',
      Category: deptCode,
      ItemName: '',
    }));
  };

  const handleItemChange = (itemCode) => {
    const { deptCode, sizeCode } = formData;
    const itemDef = (SKU_ITEMS_BY_DEPT[deptCode] || []).find(i => i.code === itemCode);
    const sku = buildSKU(deptCode, itemCode, sizeCode);
    setFormData(prev => ({
      ...prev,
      itemCode,
      SKU: sku,
      ItemName: itemDef ? itemDef.label : prev.ItemName,
    }));
  };

  const handleSizeChange = (sizeCode) => {
    const sizeDef = SKU_SIZES.find(s => s.code === sizeCode);
    const sku = buildSKU(formData.deptCode, formData.itemCode, sizeCode);
    setFormData(prev => ({
      ...prev,
      sizeCode,
      Size: sizeDef ? sizeDef.label : sizeCode,
      SKU: sku,
    }));
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.itemID);
    // Parse deptCode/itemCode/sizeCode back from stored SKU if possible
    const parts = (item.SKU || '').split('-');
    setFormData({
      ...EMPTY_FORM,
      ...item,
      deptCode: parts[0] || '',
      itemCode: parts[1] || '',
      sizeCode: parts[2] || 'N/A',
      isKit: item.isKit === 1 || item.isKit === true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ItemName: formData.ItemName,
      SKU: formData.SKU,
      Category: formData.Category,
      Size: formData.Size,
      Condition: formData.Condition,
      Amount: formData.Amount,
      Quantity: formData.Quantity,
      isKit: formData.isKit ? 1 : 0,
      KitContents: formData.isKit ? formData.KitContents : '',
    };
    const req = editingId
      ? axios.put(`${API}/items/${editingId}`, payload)
      : axios.post(`${API}/items`, payload);
    req.then(() => { setIsModalOpen(false); fetchItems(); })
       .catch(err => alert(err.response?.data?.error || err.message));
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

  const currentDeptItems = SKU_ITEMS_BY_DEPT[formData.deptCode] || [];

  const filteredItems = items.filter(i =>
    (i.ItemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.Category || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.SKU || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Inventory</h2>
        <div style={{display: 'flex', gap: '1rem'}}>
          <input
            type="text"
            className="input"
            placeholder="Search by name, category, or SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{width: '280px'}}
          />
          {hasPermission(currentUser, 'items.create') && (
            <button className="btn btn-primary" onClick={openAdd}><Package size={18}/> Add Item</button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>SKU</th>
              <th>Department</th>
              <th>Size</th>
              <th>Condition</th>
              <th>Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(i => (
              <tr key={i.itemID}>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {i.isKit ? (
                      <span style={{
                        background: 'rgba(139,92,246,0.15)',
                        color: '#8b5cf6',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}>KIT</span>
                    ) : null}
                    {i.ItemName}
                  </div>
                  {i.isKit && i.KitContents ? (
                    <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>
                      {i.KitContents}
                    </div>
                  ) : null}
                </td>
                <td>
                  <code style={{
                    background: 'var(--bg-secondary)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                  }}>{i.SKU || '—'}</code>
                </td>
                <td>{SKU_DEPARTMENTS.find(d => d.code === (i.Category || '').toString().padStart(2,'0'))?.label || i.Category}</td>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Item' : 'Add Inventory Item'}>
        <form onSubmit={handleSubmit}>

          {/* SKU Builder */}
          <div style={{background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem'}}>
            <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>SKU Builder</label>

            <div className="form-group">
              <label>Department</label>
              <select className="input" value={formData.deptCode} onChange={e => handleDeptChange(e.target.value)}>
                <option value="">-- Select Department --</option>
                {SKU_DEPARTMENTS.map(d => (
                  <option key={d.code} value={d.code}>{d.code} – {d.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Item Type</label>
              <select className="input" value={formData.itemCode} onChange={e => handleItemChange(e.target.value)} disabled={!formData.deptCode}>
                <option value="">-- Select Item --</option>
                {currentDeptItems.map(item => (
                  <option key={item.code} value={item.code}>{item.code} – {item.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Size</label>
              <select className="input" value={formData.sizeCode} onChange={e => handleSizeChange(e.target.value)}>
                {SKU_SIZES.map(s => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>

            {formData.SKU && (
              <div style={{marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Generated SKU:</span>
                <code style={{background: 'rgba(99,179,159,0.15)', color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold'}}>
                  {formData.SKU}
                </code>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Item Name</label>
            <input className="input" required value={formData.ItemName} onChange={e => setFormData({...formData, ItemName: e.target.value})} placeholder="Auto-filled or enter manually" />
          </div>

          <div className="form-group">
            <label>Condition</label>
            <input className="input" value={formData.Condition} onChange={e => setFormData({...formData, Condition: e.target.value})} placeholder="e.g. New, Good, Fair" />
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input className="input" type="number" required min="0" value={formData.Quantity} onChange={e => setFormData({...formData, Quantity: e.target.value})} />
          </div>

          {/* Kit Item Toggle */}
          <div style={{borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem'}}>
            <div className="form-group" style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <input
                type="checkbox"
                id="isKitCheckbox"
                checked={formData.isKit}
                onChange={e => setFormData({...formData, isKit: e.target.checked, KitContents: e.target.checked ? formData.KitContents : ''})}
                style={{width: 'auto'}}
              />
              <label htmlFor="isKitCheckbox" style={{marginBottom: 0, cursor: 'pointer'}}>This is a Kit (bundle of multiple items)</label>
            </div>

            {formData.isKit && (
              <div className="form-group">
                <label>Kit Contents</label>
                <input
                  className="input"
                  value={formData.KitContents}
                  onChange={e => setFormData({...formData, KitContents: e.target.value})}
                  placeholder="e.g. Shirt, Pants, Socks, Underwear"
                />
                <small style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>Comma-separated list of items included in this kit.</small>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center', marginTop: '0.5rem'}}>
            {editingId ? 'Update Item' : 'Save Item'}
          </button>
        </form>
      </Modal>
    </div>
  );
}




function Reports({ currentUser }) {
  const [items, setItems] = useState([]);
  const [hours, setHours] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    axios.get(`${API}/items`).then(res => setItems(res.data));
    axios.get(`${API}/volunteerHours`).then(res => setHours(res.data));
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

      <div className="stat-grid" style={{marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
        <div className="stat-card" style={{borderColor: 'var(--accent-warning)', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">LOW STOCK ITEMS (&le; 5)</div>
          <div className="stat-card-value" style={{color: 'var(--accent-warning)', fontSize: '2rem'}}>{lowStock.length}</div>
        </div>
        <div className="stat-card" style={{borderColor: 'var(--accent-primary)', borderLeftWidth: '4px'}}>
          <div className="stat-card-title">TOTAL HOURS LOGGED</div>
          <div className="stat-card-value" style={{color: 'var(--accent-primary)', fontSize: '2rem'}}>{formatHoursToHHMM(totalHours)}</div>
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
                  <tr><th>Item Name</th><th>SKU</th><th>Category</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {lowStock.map(i => (
                    <tr key={i.itemID}>
                      <td>{i.ItemName}</td>
                      <td><code style={{fontSize: '0.8rem'}}>{i.SKU || '—'}</code></td>
                      <td>{SKU_DEPARTMENTS.find(d => d.code === (i.Category || '').toString().padStart(2,'0'))?.label || i.Category}</td>
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

      </div>
    </div>
  );
}

function PrintableRequestModal({ isOpen, onClose, request }) {
  if (!isOpen || !request) return null;

  let needsItems = [];
  try {
    if (typeof request.needsList === 'string' && request.needsList.startsWith('[')) {
      needsItems = JSON.parse(request.needsList);
    } else if (Array.isArray(request.needsList)) {
      needsItems = request.needsList;
    } else if (request.needsList) {
      needsItems = request.needsList.split('\n').filter(Boolean).map(line => ({ item: line, qty: '' }));
    }
  } catch (e) {
    needsItems = [{ item: String(request.needsList), qty: '' }];
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem', overflowY: 'auto' }}>
      <div className="card" style={{ width: '850px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', color: '#111', position: 'relative' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Printer size={20} /> Printable Intake Form</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Printer size={16} /> Print Form
            </button>
            <button className="btn" onClick={onClose} style={{ background: '#e2e8f0', color: '#333' }}><X size={18} /> Close</button>
          </div>
        </div>

        <div className="printable-paper-form">
          <div className="paper-row">
            <div style={{ flex: 1 }}>
              <div className="paper-field" style={{ marginBottom: '0.5rem' }}>
                <label>Foster Family</label>
                <div className="paper-line" style={{ flex: 1 }}>{request.fosterFamily || '—'}</div>
              </div>
              <div className="paper-field">
                <label>Child's Name</label>
                <div className="paper-line" style={{ flex: 1 }}>{request.childName || '—'}</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="paper-field" style={{ marginBottom: '0.5rem' }}>
                <label>Worker</label>
                <div className="paper-line" style={{ flex: 1 }}>{request.workerName || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="paper-field" style={{ flex: 1 }}>
                  <label>Age</label>
                  <div className="paper-line" style={{ minWidth: '50px' }}>{request.childAge || '—'}</div>
                </div>
                <div className="paper-field" style={{ flex: 1 }}>
                  <label>RPM</label>
                  <div className="paper-line" style={{ flex: 1 }}>{request.rpmName || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="paper-row" style={{ marginTop: '1rem', alignItems: 'stretch' }}>
            <div className="paper-region-box">
              <span className="paper-region-title">Region</span>
              <span>{request.region || '—'}</span>
            </div>

            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', fontSize: '0.9rem', fontWeight: 600 }}>
              <div><strong>Sizes:</strong> Tops: <span style={{ textDecoration: 'underline' }}>{request.topSize || '___'}</span></div>
              <div style={{ marginLeft: '42px' }}>Pants: <span style={{ textDecoration: 'underline' }}>{request.pantsSize || '___'}</span></div>
              <div style={{ marginLeft: '42px' }}>Shoes: <span style={{ textDecoration: 'underline' }}>{request.shoesSize || '___'}</span></div>
            </div>

            <div className="paper-notes-box">
              <div className="paper-notes-title">Notes: (favorite color, character, style, etc.)</div>
              <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{request.notes || ''}</div>
            </div>
          </div>

          <div className="paper-row" style={{ marginTop: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>
              <span>Child's 1ˢᵗ Placement</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="checkbox" checked={!!request.isFirstPlacement} readOnly /> YES
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="checkbox" checked={!request.isFirstPlacement} readOnly /> NO
              </span>
            </div>

            <div className="paper-optional-box" style={{ flex: 1, marginLeft: '1rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', background: '#eee', padding: '2px 4px' }}>Optional</strong>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={!!request.hasBlanketQuilt} readOnly /> Blanket/Quilt
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={!!request.hasSuitcaseDuffle} readOnly /> Suitcase/Duffle
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={!!request.diaperSize || !!request.diaperQuantity} readOnly /> Diapers – Size <u>{request.diaperSize || '___'}</u> ({request.diaperQuantity || 0})
                </label>
              </div>
            </div>
          </div>

          <div className="paper-needs-container">
            <div className="paper-needs-header">NEEDS:</div>
            {needsItems.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No specific items listed</div>
            ) : (
              <div className="paper-needs-grid">
                {needsItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.4rem' }}>
                    <span>•</span>
                    <span>{item.qty ? `${item.qty} - ` : ''}{item.item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="paper-row" style={{ marginTop: '1.5rem', paddingTop: '0.5rem', borderTop: '1px solid #aaa' }}>
            <div className="paper-field" style={{ flex: 2 }}>
              <label>Pick-up/delivered by</label>
              <div className="paper-line" style={{ flex: 1 }}>{request.deliveredBy || '—'}</div>
            </div>
            <div className="paper-field" style={{ flex: 1 }}>
              <label>Date</label>
              <div className="paper-line" style={{ flex: 1 }}>{request.requestDate || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FosterRequests({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const defaultForm = {
    fosterFamily: '', workerName: '', childName: '', childAge: '', rpmName: '', region: '6',
    topSize: '', pantsSize: '', shoesSize: '',
    notes: '', isFirstPlacement: 0,
    needsList: [
      { item: '', qty: '' }
    ],
    deliveredBy: '', requestDate: new Date().toISOString().split('T')[0], status: 'Pending'
  };

  const [formData, setFormData] = useState(defaultForm);

  const fetchRequests = () => {
    axios.get(`${API}/requests`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setRequests(res.data);
        } else {
          console.error("Requests API returned non-array:", res.data);
          setRequests([]);
        }
      })
      .catch(err => {
        console.error("Fetch requests error:", err);
        setRequests([]);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenCreate = () => {
    setSelectedRequest(null);
    setFormData(defaultForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (req) => {
    setSelectedRequest(req);
    let parsedNeeds = [];
    try {
      if (typeof req.needsList === 'string' && req.needsList.startsWith('[')) {
        parsedNeeds = JSON.parse(req.needsList);
      } else if (Array.isArray(req.needsList)) {
        parsedNeeds = req.needsList;
      } else if (req.needsList) {
        parsedNeeds = req.needsList.split('\n').filter(Boolean).map(i => ({ item: i, qty: '' }));
      }
    } catch {
      parsedNeeds = [{ item: req.needsList, qty: '' }];
    }

    setFormData({
      ...req,
      needsList: parsedNeeds.length ? parsedNeeds : [{ item: '', qty: '' }]
    });
    setIsModalOpen(true);
  };

  const handleOpenPrint = (req) => {
    setSelectedRequest(req);
    setIsPrintModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      needsList: JSON.stringify(formData.needsList.filter(n => n.item.trim() !== ''))
    };

    if (selectedRequest) {
      axios.put(`${API}/requests/${selectedRequest.id}`, payload)
        .then(() => {
          setIsModalOpen(false);
          fetchRequests();
        })
        .catch(err => alert(err.response?.data?.error || 'Failed to update request'));
    } else {
      axios.post(`${API}/requests`, payload)
        .then(() => {
          setIsModalOpen(false);
          fetchRequests();
        })
        .catch(err => alert(err.response?.data?.error || 'Failed to create request'));
    }
  };

  const handleStatusChange = (reqId, newStatus) => {
    const target = requests.find(r => r.id === reqId);
    if (!target) return;
    axios.put(`${API}/requests/${reqId}`, { ...target, status: newStatus })
      .then(() => fetchRequests())
      .catch(err => alert('Failed to update status'));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this request form?')) return;
    axios.delete(`${API}/requests/${id}`)
      .then(() => fetchRequests())
      .catch(err => alert(err.response?.data?.error || 'Failed to delete request'));
  };

  const handleAddNeedRow = () => {
    setFormData(prev => ({
      ...prev,
      needsList: [...prev.needsList, { item: '', qty: '' }]
    }));
  };

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sku = e.target.value.trim();
      if (!sku) return; // Prevent double firing
      
      e.target.value = ''; // Clear DOM immediately
      setBarcodeInput(''); // Clear React state
      
      if (skusMapping[sku]) {
        handleAddNeedPreset(skusMapping[sku], '1');
      } else {
        alert('SKU not found: ' + sku);
      }
    }
  };

  const handleAddNeedPreset = (item, qty) => {
    setFormData(prev => {
      const existingIndex = prev.needsList.findIndex(n => n.item === item);
      if (existingIndex !== -1) {
        const updated = [...prev.needsList];
        const currentQty = parseInt(updated[existingIndex].qty) || 0;
        const addQty = parseInt(qty) || 1;
        updated[existingIndex] = { ...updated[existingIndex], qty: (currentQty + addQty).toString() };
        return { ...prev, needsList: updated };
      }
      
      const emptyIndex = prev.needsList.findIndex(n => !n.item && !n.qty);
      if (emptyIndex !== -1) {
        const updated = [...prev.needsList];
        updated[emptyIndex] = { item, qty };
        return { ...prev, needsList: updated };
      }
      
      return {
        ...prev,
        needsList: [...prev.needsList, { item, qty }]
      };
    });
  };

  const handleNeedChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.needsList];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, needsList: updated };
    });
  };

  const handleRemoveNeedRow = (index) => {
    setFormData(prev => ({
      ...prev,
      needsList: prev.needsList.filter((_, i) => i !== index)
    }));
  };

  const safeRequests = Array.isArray(requests) ? requests : [];
  const filteredRequests = safeRequests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesSearch = (req.childName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.fosterFamily || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.workerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.region || '').toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={32} color="var(--accent-primary)" /> Foster Care Request Forms
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Digitize, track, fulfill, and print foster family request intake sheets.</p>
        </div>
        {hasPermission(currentUser, 'requests.create') && (
          <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> New Request Form
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {['All', 'Pending', 'In Progress', 'Fulfilled', 'Delivered', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn"
              style={{
                background: statusFilter === st ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: statusFilter === st ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '9999px',
                padding: '0.4rem 1rem',
                fontSize: '0.875rem'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search family, child, worker..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Foster Family</th>
              <th>Child & Age</th>
              <th>Worker & Region</th>
              <th>1st Placement</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No request forms found. Click <strong>"New Request Form"</strong> to create one.
                </td>
              </tr>
            ) : (
              filteredRequests.map(req => (
                <tr key={req.id}>
                  <td><strong>#{req.id}</strong></td>
                  <td>{req.requestDate || '—'}</td>
                  <td>
                    <strong>{req.fosterFamily || '—'}</strong>
                    {req.deliveredBy && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery: {req.deliveredBy}</div>}
                  </td>
                  <td>
                    <div>{req.childName || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Age: {req.childAge || 'N/A'}</div>
                  </td>
                  <td>
                    <div>{req.workerName || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Region {req.region || 'N/A'}</div>
                  </td>
                  <td>
                    {req.isFirstPlacement ? (
                      <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>YES</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>NO</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={req.status || 'Pending'}
                      onChange={e => handleStatusChange(req.id, e.target.value)}
                      className={`status-badge status-${(req.status || 'Pending').toLowerCase().replace(/\s+/g, '-')}`}
                      style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Fulfilled">Fulfilled</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenPrint(req)} title="View & Print Paper Form" style={{ padding: '0.4rem' }}>
                        <Printer size={16} />
                      </button>
                      {hasPermission(currentUser, 'requests.update') && (
                        <button className="btn btn-secondary" onClick={() => handleOpenEdit(req)} title="Edit Request" style={{ padding: '0.4rem' }}>
                          <Edit size={16} />
                        </button>
                      )}
                      {hasPermission(currentUser, 'requests.delete') && (
                        <button className="btn" onClick={() => handleDelete(req.id)} title="Delete Request" style={{ padding: '0.4rem', background: '#fee2e2', color: '#dc2626' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRequest ? `Edit Request #${selectedRequest.id}` : 'New Foster Care Request Form'} width="780px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          {/* Section 1: Family & Worker Info */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Foster Family & Caseworker Info
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Foster Family Name</label>
                <input type="text" className="input" required value={formData.fosterFamily} onChange={e => setFormData({ ...formData, fosterFamily: e.target.value })} placeholder="e.g. Smith" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Social Worker Name</label>
                <input type="text" className="input" value={formData.workerName} onChange={e => setFormData({ ...formData, workerName: e.target.value })} placeholder="e.g. Adam Robinson" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>RPM</label>
                <input type="text" className="input" value={formData.rpmName} onChange={e => setFormData({ ...formData, rpmName: e.target.value })} placeholder="Name" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Region</label>
                <input type="text" className="input" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} placeholder="6" />
              </div>
            </div>
          </div>

          {/* Section 2: Child Details */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Child Details
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Child's Name</label>
                <input type="text" className="input" required value={formData.childName} onChange={e => setFormData({ ...formData, childName: e.target.value })} placeholder="e.g. Mary" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Age</label>
                <input type="text" className="input" value={formData.childAge} onChange={e => setFormData({ ...formData, childAge: e.target.value })} placeholder="e.g. 9mo" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Top Size</label>
                <input type="text" className="input" value={formData.topSize || ''} onChange={e => setFormData({ ...formData, topSize: e.target.value })} placeholder="e.g. 4T" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Pants Size</label>
                <input type="text" className="input" value={formData.pantsSize || ''} onChange={e => setFormData({ ...formData, pantsSize: e.target.value })} placeholder="e.g. 4T" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Shoe Size</label>
                <input type="text" className="input" value={formData.shoesSize || ''} onChange={e => setFormData({ ...formData, shoesSize: e.target.value })} placeholder="e.g. 9" />
              </div>
            </div>

            <div>
              <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Notes (favorite color, character, style, etc.)</label>
              <textarea className="input" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Favorite colors, characters, special requests..."></textarea>
            </div>
          </div>

          {/* Section 3: Placement & Care Items */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3. Placement & Optional Items
            </h4>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <span className="label" style={{ margin: 0, fontWeight: '700' }}>Child's 1st Placement?</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: '600' }}>
                <input type="radio" name="firstPlacement" checked={formData.isFirstPlacement === 1} onChange={() => setFormData({ ...formData, isFirstPlacement: 1 })} /> YES
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: '600' }}>
                <input type="radio" name="firstPlacement" checked={formData.isFirstPlacement === 0} onChange={() => setFormData({ ...formData, isFirstPlacement: 0 })} /> NO
              </label>
            </div>


          </div>

          {/* Section 4: Itemized NEEDS List */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                4. Itemized NEEDS List
              </h4>
              <button type="button" className="btn btn-secondary" onClick={handleAddNeedRow} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                + Add Item Row
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', marginBottom: '1.25rem' }}>
              <Barcode size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="Scan Barcode Here (Auto-adds item)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.5rem' }}>
              {formData.needsList.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <input type="text" className="input" style={{ width: '90px' }} placeholder="Qty (3)" value={row.qty} onChange={e => handleNeedChange(idx, 'qty', e.target.value)} />
                  <div style={{ flex: 1 }}>
                    <CreatableSelect
                      isClearable
                      options={selectOptions}
                      placeholder="Select or type an item..."
                      value={row.item ? { label: row.item, value: row.item } : null}
                      onChange={(newValue) => handleNeedChange(idx, 'item', newValue ? newValue.value : '')}
                      maxMenuHeight={500}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          borderColor: 'var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.15rem',
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: 'var(--accent-primary)'
                          }
                        }),
                        option: (base) => ({
                          ...base,
                          textTransform: 'capitalize'
                        }),
                        singleValue: (base) => ({
                          ...base,
                          textTransform: 'capitalize'
                        })
                      }}
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveNeedRow(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '0.2rem' }}>
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Delivery & Status */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              5. Delivery & Status
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Pick-up / Delivered By</label>
                <input type="text" className="input" value={formData.deliveredBy} onChange={e => setFormData({ ...formData, deliveredBy: e.target.value })} placeholder="Driver / Volunteer name" />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Request Date</label>
                <input type="date" className="input" value={formData.requestDate} onChange={e => setFormData({ ...formData, requestDate: e.target.value })} />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.4rem', fontWeight: '600' }}>Request Status</label>
                <select className="input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ padding: '0.65rem 1.5rem' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: '600' }}>{selectedRequest ? 'Save Changes' : 'Create Request Form'}</button>
          </div>
        </form>
      </Modal>

      <PrintableRequestModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} request={selectedRequest} />
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
        <img src={villageLogo} alt="The Village" style={{display: 'block', margin: '0 auto 2rem', maxWidth: '100%', maxHeight: '120px'}} />
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
              <input className="input" required type="password" value={cred.confirmPassword} onChange={e => setCred({...cred, confirmPassword: e.target.value})}/>
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
            <Route path="/requests" element={
              <ProtectedRoute permission="requests.read">
                <FosterRequests currentUser={user} />
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