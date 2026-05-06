import React, { useState, useRef } from 'react';
import { Edit2, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../config';

const GameCard = ({ game, onEdit, onViewDetails, isFavorited, onToggleFavorite }) => {
  const { user } = useAuth();
  
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});

  const displayGenre = Array.isArray(game.genre) 
    ? game.genre.join(' | ') 
    : (game.genre || 'Explore');

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    const shadowX = ((x - centerX) / centerX) * -20;
    const shadowY = ((y - centerY) / centerY) * -20;

    // A lightweight tilt effect gives cards some depth without introducing a separate animation library.
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`,
      boxShadow: `${shadowX}px ${shadowY + 20}px 40px var(--card-tilt-shadow), 0 0 20px var(--card-tilt-glow)`,
      transition: 'none',
      zIndex: 10
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      boxShadow: `0 0 0 rgba(0,0,0,0)`,
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)', 
      zIndex: 1
    });
  };

  return (
    <div 
      className="game-card" 
      ref={cardRef}
      onClick={() => onViewDetails(game)} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
    >

      <button 
        className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
        title={isFavorited ? "Remove from Wishlist" : "Add to Wishlist"}
        onClick={(e) => { 
          // Stop propagation so toggling wishlist status does not also open the details modal.
          e.stopPropagation();  
          onToggleFavorite(game._id); 
        }} 
      >
        <Heart 
          size={16} 
          fill={isFavorited ? 'currentColor' : 'none'} 
          color="currentColor" 
        />
      </button>
      
      {user?.role === 'admin' && (
        <button className="edit-btn" title="Edit Game"
        onClick={(e) => { e.stopPropagation(); onEdit(game); }} >
          <Edit2 size={16} />
        </button>
      )}

      <div className="card-image-wrapper">
        <img src={getImageUrl(game.image || game.imageUrl)} alt={game.name} className="card-image" />
      </div>
      <div className="card-content">
        <h3 className="card-title">{game.name}</h3>
        <p className="game-card-genre">{displayGenre}</p>        
        <p className="card-description" style={{ 
          fontSize: '13px', display: '-webkit-box', 
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
        }}>
          {game.description}
        </p>
      </div>
    </div>
  );
};

export default GameCard;
