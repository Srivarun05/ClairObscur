import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar, CheckCircle, Edit2, Pause, Play, Save, Target, Trash2, X, XCircle } from 'lucide-react';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import '../../styles/admin.css';
import '../../styles/librarymodal.css';

const STATUS_CATEGORIES = [
  { id: 'Playing', icon: <Play size={18} />, color: '#a855f7' },
  { id: 'Plan to Play', icon: <Calendar size={18} />, color: '#0ea5e9' },
  { id: 'Completed', icon: <CheckCircle size={18} />, color: '#84cc16' },
  { id: 'Paused', icon: <Pause size={18} />, color: '#f59e0b' },
  { id: 'Dropped', icon: <XCircle size={18} />, color: '#fb7185' }
];

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
};

const AdminUserLibrary = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [totalGames, setTotalGames] = useState(0);
  const [activeTab, setActiveTab] = useState('Playing');
  const [adminMode, setAdminMode] = useState('view');
  const [loading, setLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'Playing',
    playTime: 0,
    ngPlus: 0,
    startDate: '',
    endDate: '',
    notes: ''
  });

  const fetchLibrary = async () => {
    try {
      const [statusResponse, gamesResponse] = await Promise.all([
        Api.get(`/status/admin/users/${userId}`),
        Api.get('/games')
      ]);

      const records = (statusResponse.data.data || []).filter(record => record.game);
      setTargetUser(statusResponse.data.user);
      setStatuses(records);
      setTotalGames((gamesResponse.data.data || gamesResponse.data || []).length);
    } catch (error) {
      console.error('Failed to load user library', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [userId]);

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status || 'Playing',
      playTime: record.playTime || 0,
      ngPlus: record.ngPlus || 0,
      startDate: formatDateForInput(record.startDate),
      endDate: formatDateForInput(record.endDate),
      notes: record.notes || ''
    });
  };

  const updateEditForm = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const saveEditingRecord = async (event) => {
    event.preventDefault();
    if (!editingRecord) return;

    await Api.put(`/status/admin/users/${userId}/games/${editingRecord.game._id}`, editForm);
    setEditingRecord(null);
    fetchLibrary();
  };

  const deleteRecord = async (record) => {
    await Api.delete(`/status/admin/users/${userId}/games/${record.game._id}`);
    fetchLibrary();
  };

  const displayedGames = statuses.filter(record => record.status === activeTab);
  const totalTracked = statuses.length;
  const playingCount = statuses.filter(record => record.status === 'Playing').length;

  const statusCounts = STATUS_CATEGORIES.map(category => ({
    ...category,
    count: statuses.filter(record => record.status === category.id).length
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
        <button className="admin-back-btn" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={18} /> Back to User Roster
        </button>

        <div className="admin-library-header">
          <div>
            <h1>Library Override</h1>
            <p>{targetUser ? `${targetUser.username}'s tracked library` : 'User library support tools'}</p>
          </div>

          <div className="admin-mode-toggle-group" aria-label="Admin library tools">
            <button
              type="button"
              className={adminMode === 'edit' ? 'active' : ''}
              onClick={() => setAdminMode(adminMode === 'edit' ? 'view' : 'edit')}
            >
              <Edit2 size={16} /> Edit
            </button>
            <button
              type="button"
              className={`danger ${adminMode === 'delete' ? 'active' : ''}`}
              onClick={() => setAdminMode(adminMode === 'delete' ? 'view' : 'delete')}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

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
            </div>
          </div>

          <div className="library-donut-card">
            <div className="library-donut-chart">
              <svg className="library-donut-svg" viewBox="0 0 120 120" role="img" aria-label="User library status breakdown">
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
                  <button key={category.id} className="library-legend-item" onClick={() => setActiveTab(category.id)} type="button">
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
                color: activeTab === category.id ? category.color : undefined
              }}
            >
              {category.icon} {category.id} ({category.count})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="library-subtitle">Loading user library...</p>
        ) : displayedGames.length === 0 ? (
          <div className="library-empty-state">
            <p>No games in "{activeTab}" for this user.</p>
          </div>
        ) : (
          <div className="admin-library-grid">
            {displayedGames.map(record => {
              const statusMeta = STATUS_CATEGORIES.find(category => category.id === record.status);
              return (
                <article key={record._id} className={`admin-library-card ${adminMode !== 'view' ? 'actionable' : ''}`}>
                  <img src={getImageUrl(record.game.image)} alt={record.game.name} className="admin-library-cover" />
                  <div className="admin-library-card-body">
                    <h3>{record.game.name}</h3>

                    <div className="admin-library-summary">
                      <span className="admin-library-status-pill" style={{ color: statusMeta?.color, borderColor: `${statusMeta?.color}66`, background: `${statusMeta?.color}18` }}>
                        {record.status}
                      </span>
                      <div>
                        <small>Play Time</small>
                        <strong>{record.playTime || 0}h</strong>
                      </div>
                      <div>
                        <small>NG+</small>
                        <strong>{record.ngPlus || 0}</strong>
                      </div>
                    </div>

                    {adminMode !== 'view' && (
                      <div className="admin-library-actions">
                        {adminMode === 'edit' && (
                          <button type="button" onClick={() => openEditModal(record)}>
                            <Edit2 size={15} /> Edit Details
                          </button>
                        )}
                        {adminMode === 'delete' && (
                          <button type="button" className="danger" onClick={() => deleteRecord(record)}>
                            <Trash2 size={15} /> Delete Entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {editingRecord && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setEditingRecord(null)}>
          <div className="tracker-modal-content" onClick={event => event.stopPropagation()}>
            <div className="tracker-hero" style={{ backgroundImage: `url(${getImageUrl(editingRecord.game.image)})` }}>
              <div className="tracker-hero-overlay"></div>
              <button className="tracker-close-btn" onClick={() => setEditingRecord(null)}><X size={20} /></button>

              <div className="tracker-hero-content">
                <img src={getImageUrl(editingRecord.game.image)} alt={editingRecord.game.name} className="tracker-cover" />
                <h2 className="tracker-title">{editingRecord.game.name}</h2>

                <button className="tracker-save-top-btn" onClick={saveEditingRecord}>
                  <Save size={16} /> Save
                </button>
              </div>
            </div>

            <form className="tracker-form" onSubmit={saveEditingRecord}>
              <div className="tracker-grid">
                <div className="tracker-group">
                  <label>Status</label>
                  <select value={editForm.status} onChange={(event) => updateEditForm('status', event.target.value)}>
                    {STATUS_CATEGORIES.map(category => (
                      <option key={category.id} value={category.id}>{category.id}</option>
                    ))}
                  </select>
                </div>

                <div className="tracker-group">
                  <label>Play Time (Hours)</label>
                  <input type="number" min="0" value={editForm.playTime} onChange={(event) => updateEditForm('playTime', event.target.value)} />
                </div>

                <div className="tracker-group">
                  <label>NG+</label>
                  <input type="number" min="0" value={editForm.ngPlus} onChange={(event) => updateEditForm('ngPlus', event.target.value)} />
                </div>

                <div className="tracker-group">
                  <label>Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={(event) => updateEditForm('startDate', event.target.value)} />
                </div>

                <div className="tracker-group">
                  <label>Finish Date</label>
                  <input type="date" value={editForm.endDate} onChange={(event) => updateEditForm('endDate', event.target.value)} />
                </div>
              </div>

              <div className="tracker-group full-width" style={{ marginTop: '24px' }}>
                <label>Admin Notes Override</label>
                <textarea
                  rows="3"
                  placeholder="Repair user notes, clear corrupted text, or leave a support note..."
                  value={editForm.notes}
                  onChange={(event) => updateEditForm('notes', event.target.value)}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserLibrary;
