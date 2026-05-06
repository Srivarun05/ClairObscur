import React from 'react';
import { Search, Plus, Users, Heart, Filter, X, Library } from 'lucide-react'; 
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const SubNav = ({ onOpenCreateModal, searchQuery, setSearchQuery, selectedGenre, setSelectedGenre, allGenres }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <div className={`sub-header ${isAdmin ? 'admin-mode' : 'user-mode'}`} 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
      
      {/* Left-side actions change depending on whether the signed-in user is a player or an admin. */}
      <div className="user-nav-links desktop-only" style={{ display: 'flex', gap: '16px' }}>        
        {user && (
          <button 
            onClick={() => navigate('/wishlist')} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: location.pathname === '/wishlist' ? 'var(--bg-hover)' : 'transparent', 
              color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Heart size={16} fill={location.pathname === '/wishlist' ? 'currentColor' : 'none'} /> My Wishlist
          </button>
        )}

        {user && (
          <button 
            className="admin-action-btn" 
            onClick={() => navigate('/status')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: location.pathname === '/status' ? 'var(--bg-hover)' : 'transparent', 
              color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} 
          >
            <Library size={16} fill={location.pathname === '/status' ? 'currentColor' : 'none'}/> My Library
          </button>
        )}

        {isAdmin && (
          <div className="admin-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="admin-action-btn" onClick={onOpenCreateModal}>
              <Plus size={16} /> Create Game
            </button>
            <button className="admin-action-btn" onClick={() => navigate('/admin/users')}>
              <Users size={16} /> Manage Users
            </button>
          </div>
      )}
      </div>

      <div className="right-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        
        {/* The same control strip can optionally host genre filters when the parent page provides them. */}
        {selectedGenre && selectedGenre !== 'All' && (
          <button className="clear-filter-btn" onClick={() => setSelectedGenre && setSelectedGenre('All')}>
            {selectedGenre.toUpperCase()} <X size={14} strokeWidth={3} />
          </button>
        )}

        {allGenres && allGenres.length > 0 && (
          <div className="filter-dropdown-wrapper">
            <Filter className="filter-icon" size={16} />
            <select 
              className="icon-select" 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre && setSelectedGenre(e.target.value)}
            >
              <option value="All">Filter by Genre</option>
              {allGenres.filter(g => g !== 'All').map(genre => (
                <option key={genre} value={genre}>
                  {genre.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="search-container" style={{ position: 'relative' }}>
          <Search className="search-icon" style={{ left: !isAdmin ? '16px' : '10px' }} />
          <input 
            type="text" 
            className={`search-input ${!isAdmin ? 'large' : ''}`} 
            placeholder="Search your library..." 
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          />
        </div>

      </div>
    </div>
  );
};

export default SubNav;
