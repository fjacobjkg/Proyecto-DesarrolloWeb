// NAVBAR.JS - Menú móvil interactivo
(function() {
  'use strict';
  
  // Esperar a que el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Obtener elementos del DOM
    const toggleButton = document.querySelector('[data-toggle]');
    const navMenu = document.querySelector('[data-menu]');
    
    // Verificar que existen los elementos
    if (!toggleButton || !navMenu) {
      return; // Salir silenciosamente si no existen
    }
    
    // Función para abrir/cerrar el menú
    function toggleMenu() {
      const isOpen = navMenu.getAttribute('data-open') === 'true';
      
      // Cambiar el estado
      navMenu.setAttribute('data-open', String(!isOpen));
      toggleButton.setAttribute('aria-expanded', String(!isOpen));
      
      // Cambiar el icono del botón
      const icon = toggleButton.querySelector('i');
      if (icon) {
        icon.className = !isOpen ? 'ri-close-line' : 'ri-menu-line';
      }
    }
    
    // Event listener para el botón toggle
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
    
    // Funcionalidad para el botón "Ingresar" generado con ::after
    navMenu.addEventListener('click', function(e) {
      const rect = navMenu.getBoundingClientRect();
      const clickY = e.clientY;
      const menuBottom = rect.bottom;
      
      if (clickY > menuBottom - 50) {
        const loginButton = document.querySelector('[data-login-open]');
        if (loginButton) {
          loginButton.click();
        }
        toggleMenu();
      }
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
    
    // Cerrar menú con Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navMenu.getAttribute('data-open') === 'true') {
        toggleMenu();
      }
    });
    
    // Cerrar menú al redimensionar a desktop
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