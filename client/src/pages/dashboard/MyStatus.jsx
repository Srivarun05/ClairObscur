import React, { useState, useEffect } from 'react';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { Play, Calendar, CheckCircle, Pause, XCircle } from 'lucide-react';
import { getImageUrl } from '../../config';
import LibraryEditModal from '../../components/dashboard/LibraryEditModal'; 

const STATUS_CATEGORIES = [
  { id: 'Playing', icon: <Play size={18} />, color: '#a855f7' },
  { id: 'Plan to Play', icon: <Calendar size={18} />, color: '#0ea5e9' },
  { id: 'Completed', icon: <CheckCircle size={18} />, color: '#84cc16' },
  { id: 'Paused', icon: <Pause size={18} />, color: '#f59e0b' },
  { id: 'Dropped', icon: <XCircle size={18} />, color: '#fb7185' }
];

const MyStatus = () => {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Playing');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLibrary = async () => {
    try {
      // Each status record includes both the game and the user's tracking metadata for that game.
      const response = await Api.get('/status');
      setStatuses((response.data.data || []).filter(record => record.game));
    } catch (error) {
      console.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleUpdateStatus = async (gameId, newStatus) => {
    try {
      await Api.put(`/status/${gameId}`, { status: newStatus });
      // Refetch keeps the tab counts and the card list aligned with the server after edits.
      fetchLibrary(); 
    } catch (error) {
      console.error("Failed to update status");
    }
  };

  const displayedGames = statuses.filter(s => s.status === activeTab);
  // Tabs are rendered from the same source of truth used for filtering so counts never drift.

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }}>My Library</h1>
        <p className="library-subtitle">Track and manage your gaming journey.</p>

        <div className="library-tabs">
          {STATUS_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`library-tab ${activeTab === cat.id ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
              style={{
                background: activeTab === cat.id ? `${cat.color}22` : 'transparent',
                color: activeTab === cat.id ? cat.color : undefined,
              }}
            >
              {cat.icon} {cat.id} ({statuses.filter(s => s.status === cat.id).length})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="library-subtitle">Loading library...</p>
        ) : displayedGames.length === 0 ? (
          <div className="library-empty-state">
            <p>No games in "{activeTab}" yet.</p>
          </div>
        ) : (
          <div className="library-grid">
            
            {displayedGames.map((record) => {
              const { game, status } = record; 
              
              if (!game) return null;

              return (
                <div key={game._id} className="library-card">
                  
                  <div 
                    className="library-card-click-area"
                    onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
                    title="Click to edit tracking details"
                  >
                    <img src={getImageUrl(game.image)} alt={game.name} className="library-card-image" />
                    <div className="library-card-content">
                      <h3 className="library-card-title">{game.name}</h3>
                    </div>
                  </div>
                  
                  <div className="library-card-actions">
                    <div className="library-status-buttons">
                      {[
                        { label: 'Completed', value: 'Completed', color: '#84cc16' },
                        { label: 'Planning', value: 'Plan to Play', color: '#0ea5e9' },
                        { label: 'Playing', value: 'Playing', color: '#a855f7' },
                        { label: 'Paused', value: 'Paused', color: '#f59e0b' },
                        { label: 'Dropped', value: 'Dropped', color: '#fb7185' }
                      ].map(opt => {
                        const isActive = status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            className={`library-status-btn ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleUpdateStatus(game._id, isActive ? '' : opt.value);
                            }}
                            style={{
                              flex: '1 1 auto', 
                              textAlign: 'center',
                              background: isActive ? opt.color : 'transparent',
                              color: isActive ? '#000' : undefined,
                              borderColor: isActive ? opt.color : undefined,
                            }}
                            title={isActive ? "Click to remove from library" : `Move to ${opt.label}`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      <LibraryEditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        statusRecord={selectedRecord} 
        onSaveSuccess={fetchLibrary} 
      />

    </div>
  );
};

export default MyStatus;
