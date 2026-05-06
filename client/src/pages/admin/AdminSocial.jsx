import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Search, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import '../../styles/admin.css';
import '../../styles/social.css';

const AdminSocial = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAdminSocial = async () => {
    const [overviewRes, reportsRes] = await Promise.all([
      Api.get('/social/admin/overview'),
      Api.get('/social/admin/reports')
    ]);
    setRows(overviewRes.data.data || []);
    setReports(reportsRes.data.data || []);
  };

  useEffect(() => {
    loadAdminSocial();
  }, []);

  const reviewReport = async (reportId, status) => {
    await Api.put(`/social/admin/reports/${reportId}`, { status });
    loadAdminSocial();
  };

  const filteredRows = rows.filter(row => {
    const value = `${row.username} ${row.profileVisibility} ${row.accountStatus} ${row.fakeFollowerRisk}`.toLowerCase();
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

        <div className="social-search admin-social-search">
          <Search size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search username, account type, status, or risk..."
          />
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Followers</th>
                <th>Following</th>
                <th>Account Type</th>
                <th>Status</th>
                <th>Requests</th>
                <th>Reports</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row._id}>
                  <td><span className="social-user-pill">{row.username}</span></td>
                  <td><span className="social-count-pill">{row.followersCount}</span></td>
                  <td><span className="social-count-pill">{row.followingCount}</span></td>
                  <td><span className={`social-badge ${row.profileVisibility}`}>{row.profileVisibility}</span></td>
                  <td><span className={`social-badge ${row.accountStatus}`}>{row.accountStatus}</span></td>
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
