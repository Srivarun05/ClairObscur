import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ fallbackTo = '/home', label = 'Back' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: true });
  };

  return (
    <button type="button" className="page-back-btn" onClick={handleBack}>
      <ArrowLeft size={17} />
      {label}
    </button>
  );
};

export default BackButton;
