
(function() {
  'use strict';
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    const toggleButton = document.querySelector('[data-toggle]');
    const navMenu = document.querySelector('[data-menu]');
    
    if (!toggleButton || !navMenu) {
      return;
    }
    
    function toggleMenu() {
      const isOpen = navMenu.getAttribute('data-open') === 'true';
      
      navMenu.setAttribute('data-open', String(!isOpen));
      toggleButton.setAttribute('aria-expanded', String(!isOpen));
      
      const icon = toggleButton.querySelector('i');
      if (icon) {
        icon.className = !isOpen ? 'ri-close-line' : 'ri-menu-line';
      }
    }
    
    toggleButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });
    
    // Cerrar menú al hacer clic en un enlace
    const navLinks = navMenu.querySelectorAll('.c-navbar__link');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        if (navMenu.getAttribute('data-open') === 'true') {
          toggleMenu();
        }
      });
    });
        
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(e) {
      const isOpen = navMenu.getAttribute('data-open') === 'true';
      const clickedToggle = toggleButton.contains(e.target);
      const clickedMenu = navMenu.contains(e.target);
      
      if (isOpen && !clickedToggle && !clickedMenu) {
        toggleMenu();
      }
    });
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navMenu.getAttribute('data-open') === 'true') {
        toggleMenu();
      }
    });
    
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', function() {
      const currentWidth = window.innerWidth;
      if (currentWidth > 900 && lastWidth <= 900) {
        if (navMenu.getAttribute('data-open') === 'true') {
          toggleMenu();
        }
      }
      lastWidth = currentWidth;
    });
  }
  
})();