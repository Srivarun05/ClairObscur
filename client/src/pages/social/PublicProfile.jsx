import React, { useEffect, useState } from 'react';
import { Lock, Settings, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import '../../styles/social.css';

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  const loadProfile = async () => {
    const response = await Api.get(`/social/profiles/${userId}`);
    setProfile(response.data.data);
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const follow = async () => {
    await Api.post(`/social/profiles/${userId}/follow`);
    loadProfile();
  };

  const unfollow = async () => {
    await Api.delete(`/social/profiles/${userId}/follow`);
    loadProfile();
  };

  const report = async (event) => {
    event.preventDefault();
    setReportMessage('');
    try {
      await Api.post(`/social/profiles/${userId}/report`, { reason: reportReason });
      setReportMessage('Report submitted for admin review.');
      setReportReason('');
      setIsReportOpen(false);
      setIsSettingsOpen(false);
    } catch (error) {
      setReportMessage(error.response?.data?.message || 'Unable to submit report.');
    }
  };

  if (!profile) return null;

  const { user, relationship, followersCount, followingCount, followers, following, canViewDetails } = profile;

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <section className="public-profile-card">
          <div className="public-profile-avatar">
            {user.profilePic ? <img src={getImageUrl(user.profilePic)} alt={user.username} /> : user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1>{user.username}</h1>
            <p>{followersCount} followers | {followingCount} following</p>
            <span className="profile-visibility">{user.profileVisibility === 'private' && <Lock size={13} />} {user.profileVisibility}</span>
          </div>
          <div className="profile-actions">
            {relationship === 'accepted' ? (
              <button onClick={unfollow}><UserMinus size={16} /> Unfollow</button>
            ) : relationship === 'pending' ? (
              <button disabled><Lock size={16} /> Requested</button>
            ) : relationship !== 'self' && (
              <button onClick={follow}><UserPlus size={16} /> Follow</button>
            )}
            {relationship !== 'self' && (
              <div className="profile-settings-menu">
                <button
                  type="button"
                  className="profile-settings-btn"
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  aria-label="Profile options"
                >
                  <Settings size={17} />
                </button>
                {isSettingsOpen && (
                  <div className="profile-settings-popover">
                    <button className="danger compact" onClick={() => setIsReportOpen(true)}><ShieldAlert size={14} /> Report</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {reportMessage && <div className="social-inline-message">{reportMessage}</div>}

        {!canViewDetails ? (
          <div className="social-panel private-profile-note">
            <Lock size={20} /> This profile is private. Follow request approval is required.
          </div>
        ) : (
          <section className="social-two-col">
            <div className="social-panel">
              <div className="social-panel-title">Followers</div>
              {followers.map(item => <p key={item._id} className="social-muted">{item.username}</p>)}
            </div>
            <div className="social-panel">
              <div className="social-panel-title">Following</div>
              {following.map(item => <p key={item._id} className="social-muted">{item.username}</p>)}
            </div>
          </section>
        )}
      </main>

      {isReportOpen && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setIsReportOpen(false)}>
          <form className="report-modal" onSubmit={report} onClick={event => event.stopPropagation()}>
            <h2>Report {user.username}</h2>
            <p>Give admins a specific reason so they can review the account properly.</p>
            <textarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Example: This account is impersonating someone, spamming requests, or harassing users..."
              rows="5"
              required
              minLength={10}
            />
            <div className="report-modal-actions">
              <button type="button" onClick={() => setIsReportOpen(false)}>Cancel</button>
              <button type="submit" className="danger">Submit Report</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
