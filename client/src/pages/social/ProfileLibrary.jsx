import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Calendar, CheckCircle, Clock3, Lock, Pause, Play, RotateCcw, StickyNote, Target, X, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Api from '../../Api';
import BackButton from '../../components/common/BackButton';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import '../../styles/social.css';

const STATUS_CATEGORIES = [
  { id: 'Playing', icon: <Play size={18} />, color: '#a855f7' },
  { id: 'Plan to Play', icon: <Calendar size={18} />, color: '#0ea5e9' },
  { id: 'Completed', icon: <CheckCircle size={18} />, color: '#84cc16' },
  { id: 'Paused', icon: <Pause size={18} />, color: '#f59e0b' },
  { id: 'Dropped', icon: <XCircle size={18} />, color: '#fb7185' }
];

const formatLibraryDate = (dateString) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const ProfileLibrary = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Playing');
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadProfile = useCallback(async () => {
    const response = await Api.get(`/social/profiles/${userId}`);
    setProfile(response.data.data);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!profile) return null;

  const { user, canViewDetails, library = [], libraryMessage, totalGames = 0 } = profile;
  const totalTracked = library.length;
  const playingCount = library.filter(item => item.status === 'Playing').length;
  const displayedGames = library.filter(item => item.status === activeTab);
  const playingPreview = library
    .filter(item => item.status === 'Playing')
    .slice(0, 2)
    .map(item => item.game?.name)
    .filter(Boolean)
    .join(', ');
  const statusCounts = STATUS_CATEGORIES.map(category => ({
    ...category,
    count: library.filter(item => item.status === category.id).length
  }));

  const donutRadius = 44;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const donutSegments = statusCounts
    .filter(category => category.count > 0 && totalTracked > 0)
    .map(category => {
      const segmentLength = (category.count / totalTracked) * donutCircumference;
      const segment = {
        ...category,
        dashArray: `${segmentLength} ${donutCircumference - segmentLength}`,
        dashOffset: -donutOffset
      };
      donutOffset += segmentLength;
      return segment;
    });
  const activeDonutMetric = hoveredSegment || { count: totalTracked, id: 'Total', color: 'var(--text-main)' };

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <BackButton fallbackTo={`/profile/${userId}`} />

        <section className="profile-library-header">
          <div className="social-avatar profile-library-owner-avatar">
            {user.profilePic ? <img src={getImageUrl(user.profilePic)} alt={user.username} /> : user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1>{user.username}'s Library</h1>
            <p>{canViewDetails ? 'Read-only library overview.' : libraryMessage}</p>
          </div>
        </section>

        {!canViewDetails ? (
          <div className="social-panel private-profile-note">
            <Lock size={20} /> {libraryMessage || "Only followers can view this user's library."}
          </div>
        ) : (
          <>
            <section className="library-analytics-panel">
              <div className="library-stat-card">
                <div className="library-stat-icon">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <p className="library-stat-label">Total / Tracked Games</p>
                  <h2 className="library-stat-value">{totalGames}/{totalTracked}</h2>
                </div>
              </div>

              <div className="library-stat-card">
                <div className="library-stat-icon">
                  <Target size={22} />
                </div>
                <div>
                  <p className="library-stat-label">Currently Playing</p>
                  <h2 className="library-stat-value">{playingCount}</h2>
                  {playingPreview && <p className="library-stat-note">{playingPreview}</p>}
                </div>
              </div>

              <div className="library-donut-card">
                <div className="library-donut-chart">
                  <svg className="library-donut-svg" viewBox="0 0 120 120" role="img" aria-label={`${user.username}'s library status breakdown`}>
                    <circle className="library-donut-track" cx="60" cy="60" r={donutRadius} />
                    {donutSegments.map(segment => (
                      <circle
                        key={segment.id}
                        className="library-donut-segment"
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        stroke={segment.color}
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                        onMouseEnter={() => setHoveredSegment(segment)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        onFocus={() => setHoveredSegment(segment)}
                        onBlur={() => setHoveredSegment(null)}
                        onClick={() => setActiveTab(segment.id)}
                      />
                    ))}
                  </svg>
                  <div className="library-donut-center">
                    <span style={{ color: activeDonutMetric.color }}>{activeDonutMetric.count}</span>
                    <small>{activeDonutMetric.id}</small>
                  </div>
                </div>
                <div className="library-donut-meta">
                  <p className="library-stat-label">Breakdown</p>
                  <div className="library-donut-legend">
                    {statusCounts.map(category => (
                      <button
                        key={category.id}
                        className="library-legend-item"
                        onClick={() => setActiveTab(category.id)}
                        type="button"
                      >
                        <span style={{ background: category.color }} />
                        {category.id}
                        <strong>{category.count}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="library-tabs">
              {statusCounts.map(category => (
                <button
                  key={category.id}
                  className={`library-tab ${activeTab === category.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(category.id)}
                  style={{
                    background: activeTab === category.id ? `${category.color}22` : 'transparent',
                    color: activeTab === category.id ? category.color : undefined,
                  }}
                >
                  {category.icon} {category.id} ({category.count})
                </button>
              ))}
            </div>

            {displayedGames.length === 0 ? (
              <div className="library-empty-state">
                <p>No games in "{activeTab}" yet.</p>
              </div>
            ) : (
              <div className="library-grid profile-readonly-library-grid">
                {displayedGames.map(item => {
                  const activeCategory = STATUS_CATEGORIES.find(category => category.id === item.status);
                  return (
                    <div key={item._id} className="library-card profile-readonly-library-card">
                      <button
                        className="library-card-click-area profile-library-detail-trigger"
                        onClick={() => setSelectedRecord(item)}
                        type="button"
                        title={`View ${item.game.name} details`}
                      >
                        <img src={getImageUrl(item.game.image)} alt={item.game.name} className="library-card-image" />
                        <div className="library-card-content">
                          <h3 className="library-card-title">{item.game.name}</h3>
                          <span className="profile-library-view-detail">View details</span>
                        </div>
                      </button>
                      <div className="library-card-actions">
                        <span
                          className="profile-library-status-pill"
                          style={{
                            color: activeCategory?.color,
                            borderColor: `${activeCategory?.color}66`,
                            background: `${activeCategory?.color}18`
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)} style={{ zIndex: 3000 }}>
          <div className="profile-library-detail-modal" onClick={event => event.stopPropagation()}>
            <div
              className="profile-library-detail-hero"
              style={{ backgroundImage: `url(${getImageUrl(selectedRecord.game.image)})` }}
            >
              <div className="profile-library-detail-shade" />
              <button
                className="tracker-close-btn"
                onClick={() => setSelectedRecord(null)}
                type="button"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
              <div className="profile-library-detail-heading">
                <img src={getImageUrl(selectedRecord.game.image)} alt={selectedRecord.game.name} />
                <div>
                  <p>{user.username}'s tracking details</p>
                  <h2>{selectedRecord.game.name}</h2>
                </div>
              </div>
            </div>

            <div className="profile-library-detail-body">
              <div className="profile-library-detail-grid">
                <div className="profile-library-detail-field">
                  <span>Status</span>
                  <strong>{selectedRecord.status}</strong>
                </div>
                <div className="profile-library-detail-field">
                  <span><Clock3 size={15} /> Play Time</span>
                  <strong>{selectedRecord.playTime ?? 0} hours</strong>
                </div>
                <div className="profile-library-detail-field">
                  <span><RotateCcw size={15} /> NG+</span>
                  <strong>{selectedRecord.ngPlus ?? 0}</strong>
                </div>
                <div className="profile-library-detail-field">
                  <span><Calendar size={15} /> Start Date</span>
                  <strong>{formatLibraryDate(selectedRecord.startDate)}</strong>
                </div>
                <div className="profile-library-detail-field">
                  <span><CheckCircle size={15} /> Finish Date</span>
                  <strong>{formatLibraryDate(selectedRecord.endDate)}</strong>
                </div>
              </div>

              <div className="profile-library-detail-notes">
                <span><StickyNote size={15} /> Personal Notes</span>
                <p>{selectedRecord.notes?.trim() || 'No notes added.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileLibrary;
