import React from 'react';
import { PieChart, Github, Twitter, Mail } from 'lucide-react';
import '../../styles/footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const scrollToTop = () => {
    // Footer branding doubles as a lightweight "back to top" affordance on long pages.
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="global-footer">
      <div className="footer-content">
        
        <div className="footer-brand" 
          onClick={scrollToTop} 
          style={{ cursor: 'pointer' }} 
          title="Back to top"
        >
          <PieChart size={24} color="currentColor" />
          <span>CrateOn</span>
        </div>
        
        <div className="footer-bottom">
        <p>&copy; {currentYear} CrateOn. All rights reserved. Level up your library.</p>
      </div>

        <div className="footer-socials">
          <a href="https://github.com/Srivarun05/CrateOn" target="_blank" rel="noreferrer" aria-label="Github">
            <Github size={18} />
          </a>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
