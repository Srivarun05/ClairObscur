import React, { useCallback, useState, useEffect, useRef } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PieChart, User as UserIcon, LogOut, Menu, X, Heart, Library, Shield, Plus, Users, Bell, MessageCircle } from 'lucide-react';
import UserProfileModal from '../dashboard/UserProfileModal'; 
import Api from '../../Api';
import ThemeToggle from '../common/ThemeToggle';
import { disconnectSocket, getSocket } from '../../socket';

const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `http://localhost:8000/${imagePath.replace(/\\/g, "/")}`; 
};

const TopNav = ({ onOpenCreateModal }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [messageSummary, setMessageSummary] = useState({ totalUnread: 0 });
  const notificationRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await Api.get('/social/notifications');
      setNotifications(response.data.data || []);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  const loadMessageSummary = useCallback(async () => {
    if (!user) return;

    try {
      const response = await Api.get('/messages/summary');
      setMessageSummary(response.data.data || { totalUnread: 0 });
    } catch {
      setMessageSummary({ totalUnread: 0 });
    }
  }, [user]);

  useEffect(() => {
    loadMessageSummary();
  }, [loadMessageSummary]);

  useEffect(() => {
    window.addEventListener('messages:refresh', loadMessageSummary);

    return () => {
      window.removeEventListener('messages:refresh', loadMessageSummary);
    };
  }, [loadMessageSummary]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => {
        const withoutExisting = prev.filter(item => item._id !== notification._id);
        const nextNotification = { ...notification, isRead: false };
        return [nextNotification, ...withoutExisting].slice(0, 50);
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('message:new', loadMessageSummary);
    socket.on('message:sent', loadMessageSummary);
    socket.on('connect', loadNotifications);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('message:new', loadMessageSummary);
      socket.off('message:sent', loadMessageSummary);
      socket.off('connect', loadNotifications);
    };
  }, [loadMessageSummary, loadNotifications, user]);

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  const getNotificationPath = (notification) => {
    if (notification.type === 'follow_request') return '/people';
    if (notification.type === 'report' && user?.role === 'admin') return '/admin/social';
    if (notification.actor?._id) return `/profile/${notification.actor._id}`;
    if (notification.metadata?.reportedUserId) return `/profile/${notification.metadata.reportedUserId}`;
    return '/people';
  };

  const openNotification = (notification) => {
    navigate(getNotificationPath(notification));
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
  };

  const dismissNotification = async (event, notificationId) => {
    event.stopPropagation();

    const previousNotifications = notifications;
    setNotifications(prev => prev.filter(notification => notification._id !== notificationId));

    try {
      await Api.delete(`/social/notifications/${notificationId}`);
    } catch (error) {
      setNotifications(previousNotifications);
      console.error('Failed to remove notification', error);
    }
  };

  const toggleNotifications = async () => {
    setIsNotificationsOpen(prev => !prev);
    if (unreadCount > 0) {
      try {
        await Api.put('/social/notifications/read');
        setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
      } catch (error) {
        console.error('Failed to mark notifications read', error);
      }
    }
  };

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isNotificationsOpen]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const navigateAndClose = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false); 
  };

  return (
    <>
      <header className="global-header" style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="header-left">
          <div className="brand-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer', color: 'var(--text-main)' }}>
            <PieChart size={24} color="var(--text-main)" />
            CrateOn
          </div>
          
          <nav className="main-nav-links desktop-only">
            <a 
              className={`main-nav-link ${location.pathname === '/home' ? 'active' : ''}`} 
              onClick={() => navigate('/home')}
              style={{ cursor: 'pointer', color: location.pathname === '/home' ? 'var(--text-main)' : 'var(--text-muted)' }}
            >
              Dashboard
            </a>
            
            {user?.role === 'admin' && (
              <a 
                className={`main-nav-link ${location.pathname === '/admin' ? 'active' : ''}`} 
                onClick={() => navigate('/admin')}
                style={{ cursor: 'pointer', color: location.pathname === '/admin' ? 'var(--text-main)' : 'var(--text-muted)' }}
              >
                Admin Panel
              </a>
            )}
          </nav>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="action-icon theme-toggle-btn notification-toggle-btn desktop-only"
            onClick={() => navigate('/inbox')}
            title="Messages"
            aria-label="Messages"
            style={{ cursor: 'pointer', color: location.pathname === '/inbox' ? 'var(--text-main)' : 'var(--text-muted)' }}
          >
            <MessageCircle size={19} />
            {messageSummary.totalUnread > 0 && <span className="notification-badge">{messageSummary.totalUnread > 9 ? '9+' : messageSummary.totalUnread}</span>}
          </button>

          <div className="notification-wrapper desktop-only" ref={notificationRef}>
            <button
              type="button"
              className="action-icon theme-toggle-btn notification-toggle-btn"
              onClick={toggleNotifications}
              title="Notifications"
              aria-label="Notifications"
              style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isNotificationsOpen && (
              <div className="notification-popover">
                <div className="notification-popover-title">Notifications</div>
                {notifications.length === 0 ? (
                  <p>No notifications yet.</p>
                ) : (
                  notifications.slice(0, 8).map(notification => (
                    <div className="notification-item" key={notification._id}>
                      <button
                        type="button"
                        className="notification-open-btn"
                        onClick={() => openNotification(notification)}
                      >
                        <span className="notification-avatar">
                          {notification.actor?.profilePic ? (
                            <img src={getImageUrl(notification.actor.profilePic)} alt={notification.actor.username || 'User'} />
                          ) : (
                            notification.actor?.username?.[0]?.toUpperCase() || '!'
                          )}
                        </span>
                        <span>{notification.message}</span>
                      </button>
                      <button
                        type="button"
                        className="notification-dismiss-btn"
                        onClick={(event) => dismissNotification(event, notification._id)}
                        aria-label="Remove notification"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <ThemeToggle className="action-icon theme-toggle-btn desktop-only" />

          <button 
            className="user-profile-btn desktop-only" 
            onClick={() => setIsProfileOpen(true)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          >
            {user?.profilePic ? (
              <img src={getImageUrl(user.profilePic)} alt="Avatar" className="nav-avatar-img" />
            ) : (
              <UserIcon size={16} />
            )}
            <span className="desktop-only">{user?.username ? user.username.toUpperCase() : 'GUEST'}</span>
          </button>
          
          <div className="action-icon desktop-only" onClick={handleLogout} title="Logout" style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
            <LogOut size={18} />
          </div>

          <div className="action-icon mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ cursor: 'pointer', color: 'var(--text-main)' }}>
            <Menu size={24} />
          </div>
        </div>
      </header>

      {/* --- MOBILE SLIDE-OUT MENU --- */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      <div className={`mobile-slide-menu ${isMobileMenuOpen ? 'open' : ''}`} style={{ background: 'var(--bg-main)', borderLeft: '1px solid var(--border-color)' }}>
        <div className="mobile-menu-header">
          <h3 style={{ color: 'var(--text-main)' }}>Menu</h3>
          <button className="close-menu-btn" onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <nav className="mobile-menu-links">
          <button 
            onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }} 
            style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '8px', paddingBottom: '20px', color: 'var(--text-main)' }}
          >
            {user?.profilePic ? (
               <img src={getImageUrl(user.profilePic)} alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
               <UserIcon size={20} />
            )}
            <span>{user?.username ? user.username : 'My Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateAndClose('/inbox')}
            style={{ color: 'var(--text-muted)' }}
          >
            <MessageCircle size={18} /> Messages {messageSummary.totalUnread > 0 ? `(${messageSummary.totalUnread})` : ''}
          </button>

          <button
            type="button"
            onClick={toggleNotifications}
            style={{ color: 'var(--text-muted)' }}
          >
            <Bell size={18} /> Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>

          {isNotificationsOpen && (
            <div className="mobile-notification-list">
              {notifications.length === 0 ? (
                <p>No notifications yet.</p>
              ) : (
                notifications.slice(0, 5).map(notification => (
                  <div className="notification-item" key={notification._id}>
                    <button
                      type="button"
                      className="notification-open-btn"
                      onClick={() => openNotification(notification)}
                    >
                      <span className="notification-avatar">
                        {notification.actor?.profilePic ? (
                          <img src={getImageUrl(notification.actor.profilePic)} alt={notification.actor.username || 'User'} />
                        ) : (
                          notification.actor?.username?.[0]?.toUpperCase() || '!'
                        )}
                      </span>
                      <span>{notification.message}</span>
                    </button>
                    <button
                      type="button"
                      className="notification-dismiss-btn"
                      onClick={(event) => dismissNotification(event, notification._id)}
                      aria-label="Remove notification"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <ThemeToggle className="mobile-theme-toggle" />

          <button onClick={() => navigateAndClose('/home')} style={{ color: 'var(--text-muted)' }}>
            <PieChart size={18} /> Dashboard
          </button>

          <button onClick={() => navigateAndClose('/wishlist')} style={{ color: 'var(--text-muted)' }}>
            <Heart size={18} /> My Wishlist
          </button>

          <button onClick={() => navigateAndClose('/status')} style={{ color: 'var(--text-muted)' }}>
            <Library size={18} /> My Library
          </button>

          {user?.role === 'admin' && (
            <>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', padding: '16px 16px 8px 16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', letterSpacing: '1px' }}>
                Admin Controls
              </div>
              
              <button onClick={() => navigateAndClose('/admin')} style={{ color: 'var(--text-muted)' }}>
                <Shield size={18} /> Admin Panel
              </button>
              
              {onOpenCreateModal && (
                <button onClick={() => { onOpenCreateModal(); setIsMobileMenuOpen(false); }} style={{ color: 'var(--text-muted)' }}>
                  <Plus size={18} /> Create Game
                </button>
              )}
              
              <button onClick={() => navigateAndClose('/admin/users')} style={{ color: 'var(--text-muted)' }}>
                <Users size={18} /> Manage Users
              </button>
            </>
          )}

          <button onClick={handleLogout} className="logout-mobile-btn" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </div>

      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};

export default TopNav;
