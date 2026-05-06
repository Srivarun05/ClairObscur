import React, { useState, useEffect } from 'react';
import { Search, Trash2, Shield, User, ArrowLeft, ShieldAlert, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import '../../styles/admin.css';

const ManageUsers = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); 
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', selectedUser: null });
  const [editModal, setEditModal] = useState({ isOpen: false, user: null, username: '', email: '' });

  const fetchUsers = async () => {
    try {
      const response = await Api.get('/users');
      setUsers(response.data.data || response.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Admins can manage regular users, but not themselves or other admins from this screen.
  const checkPermission = (targetUser) => {
    if (!currentUser || !targetUser) return false;
    if (currentUser._id === targetUser._id) return false; 
    if (currentUser.role === 'admin') {
      return targetUser.role === 'user';
    }
    return false;
  };

  const handleToggleRoleClick = (u) => {
    if (!checkPermission(u)) return;
    setActionModal({ isOpen: true, type: 'role', selectedUser: u });
  };

  const handleDeleteUserClick = (u) => {
    if (!checkPermission(u)) return;
    setActionModal({ isOpen: true, type: 'delete', selectedUser: u });
  };

  const handleEditUserClick = (u) => {
    if (!checkPermission(u)) return;
    setEditModal({ 
      isOpen: true, 
      user: u, 
      username: u.username, 
      email: u.email 
    });
  };

  const executeAction = async () => {
    const { type, selectedUser } = actionModal;
    try {
      // One confirmation modal handles both destructive delete and role-change flows.
      if (type === 'role') {
        const newRole = selectedUser.role === 'admin' ? 'user' : 'admin';
        await Api.put(`/users/${selectedUser._id}/role`, { role: newRole });
      } else if (type === 'delete') {
        await Api.delete(`/users/${selectedUser._id}`);
      }
      fetchUsers(); 
    } catch (error) {
      console.error(`Failed to execute ${type}`, error);
      alert(error.response?.data?.message || `Failed to execute ${type}`);
    } finally {
      setActionModal({ isOpen: false, type: '', selectedUser: null });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      // This edit flow is intentionally limited to profile basics, not role or password changes.
      await Api.put(`/users/${editModal.user._id}`, { 
        username: editModal.username, 
        email: editModal.email 
      });
      fetchUsers();
      setEditModal({ isOpen: false, user: null, username: '', email: '' });
    } catch (error) {
      console.error("Failed to update user", error);
      alert(error.response?.data?.message || "Failed to update user.");
    }
  };

  return (
    <div className="steam-dashboard">
      <TopNav />
      
      <main className="dashboard-main admin-dashboard">
        
        <button className="admin-back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} /> Back to Command Center
        </button> 

        <div className="admin-header">
          <h1>User Roster</h1>
          <p>Manage permissions and accounts across the entire platform.</p>
        </div>

        <div className="search-filter-container" style={{ marginBottom: '20px' }}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search users by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading user database...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Email Address</th>
                  <th>Joined Date</th>
                  <th>System Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => {
                    const canEdit = checkPermission(u); 
                    return (
                      <tr key={u._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">
                              {u.profilePic ? (
                                <img src={getImageUrl(u.profilePic)} alt="avatar" />
                              ) : (
                                <span className="user-avatar-fallback">
                                  {(u.username || 'U')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="user-name">
                              {u.username} 
                              {u._id === currentUser._id && <span className="current-user-label">(You)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted">{u.email}</td>
                        <td className="text-muted">
                          {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td>
                          <span 
                            className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}
                            style={{ 
                              cursor: canEdit ? 'pointer' : 'default', 
                              opacity: canEdit ? 1 : 0.5
                            }}
                            onClick={() => canEdit && handleToggleRoleClick(u)}
                            title={canEdit ? "Click to toggle role" : "You do not have permission to change this role"}
                          >
                            {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                            {u.role?.toUpperCase() || 'USER'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                              className="edit-user-btn" 
                              onClick={() => handleEditUserClick(u)}
                              disabled={!canEdit}
                              title={canEdit ? "Edit User Info" : "No Permission"}
                              style={{ opacity: canEdit ? 1 : 0.2 }}
                            >
                              <Edit2 size={16} />
                            </button>
                            
                            <button 
                              className="delete-user-btn" 
                              onClick={() => handleDeleteUserClick(u)}
                              disabled={!canEdit}
                              title={canEdit ? "Delete Account" : "No Permission"}
                              style={{ opacity: canEdit ? 1 : 0.2 }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="admin-empty-row">
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {actionModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setActionModal({ isOpen: false, type: '', selectedUser: null })}>
          <div className="popup-modal-content" onClick={e => e.stopPropagation()}>
            <div className={`modal-icon-wrapper ${actionModal.type === 'delete' ? 'warning' : ''}`} style={{ borderColor: actionModal.type === 'role' ? 'rgba(59, 130, 246, 0.5)' : ''}}>
              {actionModal.type === 'delete' ? <Trash2 size={32} color="#ef4444" /> : <ShieldAlert size={32} color="#3b82f6" />}
            </div>
            
            <h2 className="admin-modal-title">
              {actionModal.type === 'delete' ? 'Delete User?' : 'Change Role?'}
            </h2>
            
            <p className="admin-modal-copy">
              {actionModal.type === 'delete' 
                ? `Are you sure you want to permanently delete "${actionModal.selectedUser?.username}"?` 
                : `Are you sure you want to change "${actionModal.selectedUser?.username}" to a ${actionModal.selectedUser?.role === 'admin' ? 'Regular User' : 'System Admin'}?`}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setActionModal({ isOpen: false, type: '', selectedUser: null })}
                className="admin-modal-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={executeAction}
                style={{ background: actionModal.type === 'delete' ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {actionModal.type === 'delete' ? 'Yes, Delete' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setEditModal({ isOpen: false, user: null, username: '', email: '' })}>
          <div className="popup-modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}>
            <h2 className="admin-modal-title edit-title">Edit User Details</h2>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="admin-edit-label">Username</label>
                <input 
                  type="text" 
                  value={editModal.username}
                  onChange={(e) => setEditModal({...editModal, username: e.target.value})}
                  required
                  className="admin-edit-input"
                />
              </div>
              <div style={{ marginBottom: '32px' }}>
                <label className="admin-edit-label">Email Address</label>
                <input 
                  type="email" 
                  value={editModal.email}
                  onChange={(e) => setEditModal({...editModal, email: e.target.value})}
                  required
                  className="admin-edit-input"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, user: null, username: '', email: '' })}
                  className="admin-modal-cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
