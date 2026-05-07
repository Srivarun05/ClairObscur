import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Search, ShieldAlert, Signal, SignalZero, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import { getSocket } from '../../socket';
import '../../styles/admin.css';
import '../../styles/social.css';

const AdminSocial = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const loadAdminSocial = useCallback(async () => {
    const [overviewRes, reportsRes] = await Promise.all([
      Api.get('/social/admin/overview'),
      Api.get('/social/admin/reports')
    ]);
    setRows(overviewRes.data.data || []);
    setReports(reportsRes.data.data || []);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialAdminSocial = async () => {
      const [overviewRes, reportsRes] = await Promise.all([
        Api.get('/social/admin/overview'),
        Api.get('/social/admin/reports')
      ]);

      if (!isMounted) return;
      setRows(overviewRes.data.data || []);
      setReports(reportsRes.data.data || []);
    };

    loadInitialAdminSocial();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const applyPresenceSummary = (summary) => {
      setOnlineUserIds(summary.onlineUserIds || []);
    };

    const applyPresenceUpdate = (presence) => {
      setRows(prev => prev.map(row => (
        row._id === presence.userId
          ? { ...row, isOnline: presence.isOnline, lastSeen: presence.lastSeen || row.lastSeen }
          : row
      )));
      setOnlineUserIds(prev => {
        if (presence.isOnline) {
          return prev.includes(presence.userId) ? prev : [...prev, presence.userId];
        }
        return prev.filter(userId => userId !== presence.userId);
      });
    };

    socket.on('presence:summary', applyPresenceSummary);
    socket.on('presence:update', applyPresenceUpdate);
    socket.on('social:refresh', loadAdminSocial);

    return () => {
      socket.off('presence:summary', applyPresenceSummary);
      socket.off('presence:update', applyPresenceUpdate);
      socket.off('social:refresh', loadAdminSocial);
    };
  }, [loadAdminSocial]);

  const reviewReport = async (reportId, status) => {
    await Api.put(`/social/admin/reports/${reportId}`, { status });
    loadAdminSocial();
  };

  const rowsWithPresence = useMemo(() => rows.map(row => ({
    ...row,
    isOnline: onlineUserIds.includes(row._id) || row.isOnline
  })), [onlineUserIds, rows]);

  const onlineCount = rowsWithPresence.filter(row => row.isOnline).length;
  const offlineCount = Math.max(rowsWithPresence.length - onlineCount, 0);

  const filteredRows = rowsWithPresence.filter(row => {
    const presenceText = row.isOnline ? 'online' : 'offline';
    const value = `${row.username} ${row.profileVisibility} ${row.fakeFollowerRisk} ${presenceText}`.toLowerCase();
    return value.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <button className="admin-back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} /> Back to Command Center
        </button>
        <div className="admin-header">
          <h1>Social Oversight</h1>
          <p>Review followers, privacy, requests, reports, and suspicious social activity.</p>
        </div>

        <div className="admin-social-presence-grid">
          <div className="admin-social-presence-card online">
            <Signal size={20} />
            <div>
              <span>Online Users</span>
              <strong>{onlineCount}</strong>
            </div>
          </div>
          <div className="admin-social-presence-card offline">
            <SignalZero size={20} />
            <div>
              <span>Offline Users</span>
              <strong>{offlineCount}</strong>
            </div>
          </div>
        </div>

        <div className="social-search admin-social-search">
          <Search size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search username, account type, presence, or risk..."
          />
        </div>

        <div className="admin-table-container admin-social-table-container">
          <table className="admin-table admin-social-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Presence</th>
                <th>Followers</th>
                <th>Following</th>
                <th>Account Type</th>
                <th>Requests</th>
                <th>Reports</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row._id}>
                  <td>
                    <div className="admin-social-user-cell">
                      <div className="social-avatar admin-social-avatar">
                        {row.profilePic ? (
                          <img src={getImageUrl(row.profilePic)} alt={row.username} />
                        ) : (
                          row.username?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <span>{row.username}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`social-badge ${row.isOnline ? 'online' : 'offline'}`}>
                      {row.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td><span className="social-count-pill">{row.followersCount}</span></td>
                  <td><span className="social-count-pill">{row.followingCount}</span></td>
                  <td><span className={`social-badge ${row.profileVisibility}`}>{row.profileVisibility}</span></td>
                  <td><span className="social-count-pill request">{row.pendingRequestsCount}</span></td>
                  <td><span className={`social-count-pill ${row.reportsCount > 0 ? 'report' : ''}`}>{row.reportsCount}</span></td>
                  <td>{row.fakeFollowerRisk === 'review' ? <span className="social-risk"><ShieldAlert size={14} /> Review</span> : <span className="social-badge normal">Normal</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="social-panel admin-report-panel">
          <div className="social-panel-title">
            <ShieldAlert size={18} /> Report Review Queue
          </div>
          {reports.length === 0 ? (
            <p className="social-muted">No reports submitted yet.</p>
          ) : reports.map(report => (
            <article className="admin-report-card" key={report._id}>
              <div>
                <div className="admin-report-title">
                  <span>{report.reporter?.username || 'Unknown'} reported {report.reported?.username || 'Unknown'}</span>
                  <span className={`social-badge ${report.status}`}>{report.status}</span>
                </div>
                <p>{report.reason}</p>
              </div>
              {report.status === 'open' && (
                <div className="admin-report-actions">
                  <button onClick={() => reviewReport(report._id, 'accepted')}><Check size={15} /> Accept</button>
                  <button className="danger" onClick={() => reviewReport(report._id, 'declined')}><X size={15} /> Decline</button>
                </div>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default AdminSocial;
