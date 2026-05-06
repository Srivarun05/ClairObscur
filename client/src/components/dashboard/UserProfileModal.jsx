import React, { useState, useEffect } from 'react';
import { X, Upload, User as UserIcon, Edit2 } from 'lucide-react';
import Api from '../../Api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../config';
import '../../styles/profile.css';

const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, login } = useAuth(); 
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [profilePic, setProfilePic] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      // The modal refetches live profile data so it reflects updates from other tabs or admin changes.
      fetchUserProfile();
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      const response = await Api.get('/users/profile'); 
      const userData = response.data.data;
      setUsername(userData.username);
      setEmail(userData.email);
      setProfileVisibility(userData.profileVisibility || 'public');
      if (userData.profilePic) {
        setPreviewImage(getImageUrl(userData.profilePic));
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // A local object URL gives instant feedback before the file is uploaded to the server.
      setProfilePic(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('username', username);
    formData.append('profileVisibility', profileVisibility);
    if (profilePic) {
      formData.append('profilePic', profilePic);
    }

    try {
      const response = await Api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // The page is reloaded here so every place that reads the avatar/name picks up the latest data.
      setTimeout(() => {
        window.location.reload(); 
      }, 1000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || "Failed to update profile" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="profile-header">My Profile</h2>

        {message.text && (
          <div className={`profile-msg ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-pic-section">
            <div className="profile-pic-preview">
              {previewImage ? (
                <img src={previewImage} alt="Profile" />
              ) : (
                <UserIcon size={56} color="#666" />
              )}
            </div>
            <label className="upload-btn">
              <Upload size={16} /> Change Picture
              <input type="file" accept="image/*" onChange={handleImageChange} hidden />
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="username-input">Username</label>
            <div className="profile-input-wrapper">
              <input 
                id="username-input"  
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
              />
              <Edit2 size={16} className="profile-input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email-input">Email (Read Only)</label>
            <input 
              id="email-input"  
              type="email" 
              value={email} 
              disabled 
              className="disabled-input"
              title="Email cannot be changed"
            />
          </div>

          <div className="form-group">
            <label htmlFor="visibility-input">Profile Visibility</label>
            <select
              id="visibility-input"
              value={profileVisibility}
              onChange={(e) => setProfileVisibility(e.target.value)}
              className="profile-visibility-select"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <button type="submit" className="save-profile-btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
