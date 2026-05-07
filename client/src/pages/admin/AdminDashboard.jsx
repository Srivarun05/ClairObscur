import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Gamepad2, Plus, ShieldAlert, Activity, ArrowRight, Network } from 'lucide-react';
import Api from '../../Api';
import TopNav from '../../components/layout/TopNav';
import GameModal from '../../components/dashboard/GameModal';
import '../../styles/admin.css'; 

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, admins: 0, games: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        // Stats are built from the same APIs the rest of the app uses, avoiding a separate admin-only endpoint.
        const [gamesRes, usersRes] = await Promise.all([
          Api.get('/games'),
          Api.get('/users') 
        ]);

        const usersList = usersRes.data.data || usersRes.data || [];
        const adminCount = usersList.filter(u => u.role === 'admin').length;
        const userCount = usersList.filter(u => u.role !== 'admin').length;

        setStats({
          games: gamesRes.data.data?.length || gamesRes.data?.length || 0,
          users: userCount,
          admins: adminCount
        });
      } catch (error) {
        console.error("Failed to load admin stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Dashboard numbers are only needed on first mount for this view.
    fetchPlatformStats();
  }, []);

  return (
    <div className="steam-dashboard">
      <TopNav />
      
      <main className="dashboard-main admin-dashboard">
        <div className="admin-header">
          <h1>Welcome back, Admin</h1>
          <p>Here is what is happening on Crateon today.</p>
        </div>

        <div className="admin-stats-grid">
          <div className="stat-card glowing-blue">
            <div className="stat-icon"><Users size={28} /></div>
            <div className="stat-info">
              <h3>Total Users</h3>
              <h2>
                {isLoading ? '...' : `${stats.admins} Admin | ${stats.users} Users`}
              </h2>
            </div>
          </div>

          <div className="stat-card glowing-purple">
            <div className="stat-icon"><Gamepad2 size={28} /></div>
            <div className="stat-info">
              <h3>Games in Library</h3>
              <h2>{isLoading ? '...' : stats.games}</h2>
            </div>
          </div>

          <div className="stat-card glowing-green">
            <div className="stat-icon"><Activity size={28} /></div>
            <div className="stat-info">
              <h3>System Status</h3>
              <h2>Online</h2>
            </div>
          </div>
        </div>

        <h2 className="section-title">Quick Actions</h2>
        <div className="admin-actions-grid">
          
          <div className="action-card" onClick={() => setIsCreateModalOpen(true)}>
            <div className="action-icon-wrapper"><Plus size={32} color="#fff" /></div>
            <div className="action-text">
              <h3>Publish New Game</h3>
              <p>Add a new title to the global database.</p>
            </div>
            <ArrowRight className="action-arrow" size={20} />
          </div>

          <div className="action-card" onClick={() => navigate('/admin/users')}>
            <div className="action-icon-wrapper"><ShieldAlert size={32} color="#fff" /></div>
            <div className="action-text">
              <h3>Manage Users</h3>
              <p>View, edit, or remove user accounts.</p>
            </div>
            <ArrowRight className="action-arrow" size={20} />
          </div>

          <div className="action-card" onClick={() => navigate('/admin/social')}>
            <div className="action-icon-wrapper"><Network size={32} color="#fff" /></div>
            <div className="action-text">
              <h3>Social Oversight</h3>
              <p>Inspect follows, requests, reports, and account risk.</p>
            </div>
            <ArrowRight className="action-arrow" size={20} />
          </div>

        </div>
      </main>

      {isCreateModalOpen && (
        <GameModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          gameToEdit={null}
          // The quick-action flow reuses the shared game modal in pure "create" mode.
          refreshGames={() => window.location.reload()} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
