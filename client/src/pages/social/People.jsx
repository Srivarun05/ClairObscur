import React, { useEffect, useState } from 'react';
import { Check, Lock, Search, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import { getImageUrl } from '../../config';
import '../../styles/social.css';

const People = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const loadSocial = async () => {
    const [usersRes, requestsRes] = await Promise.all([
      Api.get(`/social/users?q=${encodeURIComponent(debouncedQuery)}`),
      Api.get('/social/requests')
    ]);
    setUsers(usersRes.data.data || []);
    setRequests(requestsRes.data.data || []);
  };

  useEffect(() => {
    loadSocial();
  }, [debouncedQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const respond = async (requestId, status) => {
    await Api.put(`/social/requests/${requestId}`, { status });
    loadSocial();
  };

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="dashboard-main">
        <div className="social-header">
          <div>
            <h1>People</h1>
            <p>Find players, manage follow requests, and keep up with your network.</p>
          </div>
        </div>

        <div className="social-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." />
        </div>

        <section className="social-panel">
          <div className="social-panel-title">
            <UserPlus size={18} /> Discover
          </div>
          <div className="social-grid">
            {users.map(user => (
              <button key={user._id} className="social-user-card" onClick={() => navigate(`/profile/${user._id}`)}>
                <div className="social-avatar">
                  {user.profilePic ? <img src={getImageUrl(user.profilePic)} alt={user.username} /> : user.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3>{user.username}</h3>
                  <p>{user.followersCount} followers | {user.followingCount} following</p>
                  <span>{user.profileVisibility === 'private' && <Lock size={12} />} {user.relationship}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="social-panel">
          <div className="social-panel-title">
            <UserPlus size={18} /> Follow Requests
          </div>
          {requests.length === 0 ? <p className="social-muted">No pending requests.</p> : requests.map(request => (
            <div className="social-list-row" key={request._id}>
              <span>{request.follower?.username}</span>
              <div>
                <button onClick={() => respond(request._id, 'accepted')}><Check size={15} /></button>
                <button className="danger" onClick={() => respond(request._id, 'declined')}><X size={15} /></button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default People;
