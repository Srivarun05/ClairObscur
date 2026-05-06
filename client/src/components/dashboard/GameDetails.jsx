import React, { useState, useEffect } from 'react';
import { X, Trash2, Send, Edit2, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Api from '../../Api';
import GameRating from '../../pages/dashboard/GameRating';
import GuestModal from '../common/GuestModal';
import { getImageUrl } from '../../config';
import '../../styles/GameDetails.css'; 

const GameDetails = ({ isOpen, onClose, game }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [comments, setComments] = useState([]);

  const [currentStatus, setCurrentStatus] = useState('');
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, commentId: null });

  useEffect(() => {
    if (isOpen && game && user) {
      const fetchCurrentStatus = async () => {
        try {
          // Status is fetched per-user so the same game can render differently for different players.
          const response = await Api.get('/status');
          const existingStatus = response.data.data.find(s => s.game._id === game._id);
          setCurrentStatus(existingStatus ? existingStatus.status : '');
        } catch (error) {
          console.error("Failed to fetch status");
        }
      };
      fetchCurrentStatus();
    }
  }, [isOpen, game, user]);

  useEffect(() => {
    if (isOpen && game) {
      fetchComments();
    } else {
      // Reset modal-scoped state when closing so stale edits do not bleed into the next game.
      setComments([]); 
      setNewComment('');
      setEditingCommentId(null);
      setDeleteModal({ isOpen: false, commentId: null });
    }
  }, [isOpen, game]);

  const handleStatusChange = async (selectedStatus) => {
    if (!user) return setShowGuestModal(true);
    
    // Clicking the active status again clears it, which acts like removing the game from that bucket.
    const newStatus = currentStatus === selectedStatus ? '' : selectedStatus;    
    setCurrentStatus(newStatus);
    setIsStatusLoading(true);
    
    try {
      await Api.put(`/status/${game._id}`, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await Api.get(`/comments/${game._id || game.id}`);
      setComments(response.data.data || []);
    } catch (error) {
      console.error("Could not fetch comments", error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if(!user) {
      setShowGuestModal(true);
      return;
    }
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await Api.post(`/comments/${game._id || game.id}`, { comment: newComment });
      setNewComment('');
      fetchComments(); 
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (commentId) => {
    setDeleteModal({ isOpen: true, commentId });
  };

  const confirmDeleteComment = async () => {
    try {
      await Api.delete(`/comments/${deleteModal.commentId}`);
      fetchComments(); 
    } catch (error) {
      console.error("Failed to delete comment", error);
    } finally {
      setDeleteModal({ isOpen: false, commentId: null });
    }
  };

  const startEditing = (commentObj) => {
    setEditingCommentId(commentObj._id);
    setEditCommentText(commentObj.comment);
  };

  const handleUpdateComment = async (commentId) => {
    try {
      await Api.put(`/comments/${commentId}`, { comment: editCommentText });
      setEditingCommentId(null);
      fetchComments();
    } catch (error) {
      console.error("Failed to update comment", error);
    }
  };

  if (!isOpen || !game) return null;

  const displayGenre = Array.isArray(game.genre) ? game.genre.join(' | ') : (game.genre || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal-content" onClick={e => e.stopPropagation()}>
        
        <button className="details-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="details-image-section">
          <div className="details-blur-background" style={{ backgroundImage: `url(${getImageUrl(game.image || game.imageUrl)})` }} />
          <img src={getImageUrl(game.image || game.imageUrl)} alt={game.name} className="details-cover-image" />
        </div>

        <div className="details-info-section">
          <h1 className="details-title">{game.name}</h1>
          <p className="details-genre">{displayGenre.toUpperCase()}</p>
          <p className="details-desc">{game.description}</p>

          <GameRating gameId={game._id || game.id} />
          
          <div className="status-buttons-container">
            <p className="status-label">Library Status</p>
            <div className="status-buttons-row">
              {[
                { label: 'Completed', value: 'Completed', colorClass: 'status-completed' },
                { label: 'Planning', value: 'Plan to Play', colorClass: 'status-planning' },
                { label: 'Playing', value: 'Playing', colorClass: 'status-playing' },
                { label: 'Paused', value: 'Paused', colorClass: 'status-paused' },
                { label: 'Dropped', value: 'Dropped', colorClass: 'status-dropped' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isStatusLoading}
                  className={`status-pill ${option.colorClass} ${currentStatus === option.value ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {currentStatus && (
              <button 
                onClick={() => window.location.href = '/status'} 
                className="view-library-link"
              >
                View in Library →
              </button>
            )}
          </div>

          <div className="comments-container">
            <h3 className="comments-header">Community Discussions ({comments.length})</h3>
            
            <form className="comment-input-box" onSubmit={handlePostComment}>
              <input 
                type="text" 
                placeholder="Share your thoughts on this game..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmitting}
              />
              <button type="submit" disabled={isSubmitting || !newComment.trim()}>
                <Send size={16} /> Post
              </button>
            </form>
            <div className="comment-list">
              {comments.length > 0 ? (
                comments.map(commentObj => {
                  
                  const currentUserId = user?._id || user?.id;
                  const commentUserId = commentObj.user?._id || commentObj.user?.id;
                  
                  // Owners can manage their own comments; admins can moderate everyone else's.
                  const isOwner = Boolean(currentUserId && commentUserId && String(currentUserId) === String(commentUserId));
                  
                  const canEdit = isOwner || isAdmin;
                  const canDelete = isOwner || isAdmin;

                  return (
                    <div key={commentObj._id} className="comment-item">
                      <div className="comment-header-row">
                        <div className="comment-user">
                          <div className="user-avatar" style={{ overflow: 'hidden' }}>
                            {commentObj.user?.profilePic ? (
                              <img 
                                src={getImageUrl(commentObj.user.profilePic)} 
                                alt={commentObj.user.username} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              (commentObj.user?.username || 'P')[0].toUpperCase()
                            )}
                          </div>
                          <span>{commentObj.user?.username || 'Player'}</span>
                        </div>

                        {editingCommentId !== commentObj._id && (
                          <div className="comment-actions">
                            
                            {canEdit && (
                              <button onClick={() => startEditing(commentObj)} className="comment-edit-btn" title="Edit">
                                <Edit2 size={14} />
                              </button>
                            )}
                            
                            {canDelete && (
                              <button onClick={() => triggerDelete(commentObj._id)} className="delete-btn" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="comment-body">
                        {editingCommentId === commentObj._id ? (
                          <div className="inline-edit-container">
                            <input 
                              type="text" 
                              className="inline-edit-input"
                              value={editCommentText} 
                              onChange={(e) => setEditCommentText(e.target.value)} 
                              autoFocus
                            />
                            <button onClick={() => handleUpdateComment(commentObj._id)} className="inline-save-btn" title="Save">
                              <Check size={16}/>
                            </button>
                            <button onClick={() => setEditingCommentId(null)} className="inline-cancel-btn" title="Cancel">
                              <X size={16}/>
                            </button>
                          </div>
                        ) : (
                          <p className="comment-text">{commentObj.comment}</p>
                        )}
                      </div>

                    </div>
                  );
                })
              ) : (
                <p className="empty-comments-text">No comments yet. Start the discussion!</p>
              )}
            </div>  
          </div>
        </div>
        
        <GuestModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} actionText="join the discussion" />

        {deleteModal.isOpen && (
          <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setDeleteModal({ isOpen: false, commentId: null })}>
            <div className="popup-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-icon-wrapper warning">
                <Trash2 size={32} color="#ef4444" />
              </div>
              <h2 className="delete-modal-title">Delete Comment?</h2>
              <p className="delete-modal-copy">This action is permanent and cannot be undone.</p>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, commentId: null })}
                  className="delete-modal-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteComment}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GameDetails;
