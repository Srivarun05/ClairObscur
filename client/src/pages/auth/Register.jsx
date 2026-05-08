import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../../Api';
import { User, AtSign, Lock, Rocket, PieChart } from 'lucide-react';
import bgImage from '../../assets/registerBG.png';
import ThemeToggle from '../../components/common/ThemeToggle';
import '../../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Registration only creates the account; the user is then routed to login explicitly.
        const response = await Api.post('/auth/register', {
        username,
        email,
        password
      });

      console.log("Registration successful!", response.data);
      navigate('/login');

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container register-bg" style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    }}>
      <header className="header">
        <div className="logo"><PieChart size={28} /> CrateOn</div>
        <div className="auth-header-actions">
          <ThemeToggle />
          <button className="header-btn" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </header>

      <main className="main-content">
        <div className="register-layout">
          <div className="auth-card register-mode">
            <h2 className="auth-title center">Register</h2>
            <p className="auth-subtitle center">
              Already part of the quest? <span className="auth-link" onClick={() => navigate('/login')}>Log In</span>
            </p>

            {/* The same error slot handles duplicate email, weak password, and network failures. */}
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your gamer tag"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <AtSign className="input-icon" />
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '32px' }} disabled={loading}>
                {loading ? 'CREATING...' : <>CREATE ACCOUNT <Rocket size={18} strokeWidth={2.5} /></>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
