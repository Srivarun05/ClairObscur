import React, { useCallback, useEffect, useState } from 'react';
import { Gamepad2, Lock, Settings, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Api from '../../Api';
import BackButton from '../../components/common/BackButton';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import { getSocket } from '../../socket';
import { extractAccentColor } from '../../utils/extractAccentColor';
import '../../styles/social.css';

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [profileAccent, setProfileAccent] = useState(null);

  const loadProfile = useCallback(async () => {
    const response = await Api.get(`/social/profiles/${userId}`);
    setProfile(response.data.data);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let isCurrent = true;
    const profileImage = profile?.user?.profilePic ? getImageUrl(profile.user.profilePic) : '';

    if (!profileImage) {
      setProfileAccent(null);
      return undefined;
    }

    extractAccentColor(profileImage).then((accent) => {
      if (isCurrent) setProfileAccent(accent);
    });

    return () => {
      isCurrent = false;
    };
  }, [profile?.user?.profilePic]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refreshProfile = (payload) => {
      if (!payload?.profileId || String(payload.profileId) === String(userId)) {
        loadProfile();
      }
    };

    socket.on('social:refresh', refreshProfile);

    return () => {
      socket.off('social:refresh', refreshProfile);
    };
  }, [loadProfile, userId]);

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

  const { user, relationship, followersCount, followingCount, followers, following, canViewDetails, library = [], libraryMessage } = profile;
  const profileAccentStyle = profileAccent ? { '--profile-accent': profileAccent } : undefined;

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <BackButton fallbackTo="/people" />
        <section className="public-profile-card profile-accent-surface" style={profileAccentStyle}>
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
            ) : relationship === 'declined' ? (
              <button onClick={follow}><UserPlus size={16} /> Follow</button>
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
          <div className="social-panel private-profile-note profile-accent-surface" style={profileAccentStyle}>
            <Lock size={20} /> {libraryMessage || "Only followers can view this user's library."}
          </div>
        ) : (
          <>
            <section className="social-panel profile-accent-surface" style={profileAccentStyle}>
              <div className="social-panel-title"><Gamepad2 size={18} /> Library</div>
              {library.length === 0 ? (
                <p className="social-muted">No games tracked yet.</p>
              ) : (
                <div className="profile-library-grid">
                  {library.map(item => (
                    <article className="profile-library-card" key={item._id}>
                      <img src={getImageUrl(item.game.image)} alt={item.game.name} />
                      <div>
                        <h3>{item.game.name}</h3>
                        <span>{item.status}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="social-two-col">
              <div className="social-panel profile-accent-surface" style={profileAccentStyle}>
                <div className="social-panel-title">Followers</div>
                {followers.map(item => <p key={item._id} className="social-muted">{item.username}</p>)}
              </div>
              <div className="social-panel profile-accent-surface" style={profileAccentStyle}>
                <div className="social-panel-title">Following</div>
                {following.map(item => <p key={item._id} className="social-muted">{item.username}</p>)}
              </div>
            </section>
          </>
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
