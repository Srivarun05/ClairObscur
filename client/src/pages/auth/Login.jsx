import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, ArrowRight, PieChart } from 'lucide-react';
import libraryImage from '../../assets/Library.png'; 
import bgImage from '../../assets/LibraryBlur.png'; 
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        email,
        password
      });

      // Save token and user data to LocalStorage
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      
      console.log("Login successful!", response.data);
      alert("Welcome back!");
      
      // Navigate to the main app dashboard (You will build this next!)
      // navigate('/home');

    } catch (err) {
      // Safely extract backend error message
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{
        backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.6)), url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    }}>
      <header className="header no-border">
        <div className="logo"><PieChart size={28} /> CrateOn</div>
      </header>

      <main className="main-content">
        <div className="login-layout">
          <div className="login-hero">
            <div className="login-hero-image">
              <img src={libraryImage} alt="CrateOn Library Preview" className="hero-img-content"/>
            </div>
            <div className="login-hero-text">
              <h1>Level Up Your Library.</h1>
              <p>Track your progress, organize your backlog, and share your ultimate collection with the community.</p>
            </div>
          </div>

          <div className="auth-card">
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Please enter your details to sign in.</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com"
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

               <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : <>Login <ArrowRight size={20} strokeWidth={2.5} /></>}
              </button>
            </form>

            <div className="bottom-text">
              Don't have an account? <span className="auth-link" onClick={() => navigate('/register')}>Create an account</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;