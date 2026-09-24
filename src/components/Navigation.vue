<template>
  <nav class="navigation" :class="{ 'scrolled': isScrolled }">
    <div class="nav-content">
      <div class="nav-brand">
                <img src="/orangopus-logo-white.svg" alt="Orangopus" class="nav-logo" />

      </div>
      
      <div class="nav-links">
        <a 
          v-for="link in navLinks" 
          :key="link.id"
          :href="link.href"
          @click="scrollToSection(link.href)"
          class="nav-link"
          :class="{ 'active': activeSection === link.id }"
        >
          {{ link.name }}
        </a>
      </div>
      
      <div class="nav-actions">
        <!-- Authentication Section -->
        <div v-if="!authState.user" class="auth-buttons">
          <button @click="$emit('show-auth', 'login')" class="auth-button login">
            Sign In
          </button>
          <button @click="$emit('show-auth', 'signup')" class="auth-button signup">
            Sign Up
          </button>
        </div>
        
        <!-- User Profile Section -->
        <div v-else class="user-profile">
          <div class="user-avatar" @click="toggleUserMenu">
            <img 
              :src="authState.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'" 
              :alt="authState.user.name"
            />
            <div class="avatar-indicator"></div>
          </div>
          
          <div v-if="showUserMenu" class="user-menu">
            <div class="user-info">
              <img 
                :src="authState.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'" 
                :alt="authState.user.name"
                class="menu-avatar"
              />
              <div class="user-details">
                <h4>{{ authState.user.name }}</h4>
                <p>{{ authState.user.github_username || 'No GitHub username' }}</p>
              </div>
            </div>
            
            <div class="menu-actions">
              <button @click="navigateToDashboard" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                  <path d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"/>
                </svg>
                Dashboard
              </button>
              
              <button @click="navigateToProfile" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </button>
              
              <button @click="navigateToProjects" class="menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                My Projects
              </button>
              
              <div class="menu-divider"></div>
              
              <button @click="handleSignOut" class="menu-item signout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        <button @click="scrollToTop" class="scroll-top" :class="{ 'visible': showScrollTop }">
          <svg viewBox="0 0 24 24" fill="currentColor" class="scroll-icon">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { authService, AuthState } from "@/services/authService";

interface NavLink {
  id: string;
  name: string;
  href: string;
}

export default defineComponent({
  name: "Navigation",
  emits: ['navigate-to-dashboard', 'navigate-to-profile', 'navigate-to-projects', 'show-auth'],
  data() {
    return {
      isScrolled: false,
      activeSection: "home",
      showScrollTop: false,
      showUserMenu: false,
      authState: {
        user: null,
        loading: false,
        error: null
      } as AuthState,
      navLinks: [
        { id: "home", name: "Home", href: "#home" },
        { id: "github", name: "GitHub", href: "#github" },
        { id: "community", name: "Community", href: "#community" },
        { id: "projects", name: "Projects", href: "#projects" },
        { id: "team", name: "Team", href: "#team" },
        { id: "faq", name: "FAQ", href: "#faq" }
      ] as NavLink[],
      unsubscribe: () => {}
    };
  },
  mounted() {
    this.handleScroll();
    window.addEventListener('scroll', this.handleScroll);
    this.observeSections();
    
    // Subscribe to auth state changes
    this.unsubscribe = authService.subscribe((state) => {
      this.authState = state;
    });
    
    // Close user menu when clicking outside
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('click', this.handleClickOutside);
    this.unsubscribe();
  },
  methods: {
    handleScroll() {
      this.isScrolled = window.scrollY > 100;
      this.showScrollTop = window.scrollY > 500;
    },
    
    scrollToSection(href: string) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    },
    
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    },
    
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    },
    
    handleClickOutside(event: Event) {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        this.showUserMenu = false;
      }
    },
    
    async handleSignOut() {
      await authService.signOut();
      this.showUserMenu = false;
    },
    
    navigateToDashboard() {
      this.showUserMenu = false;
      this.$emit('navigate-to-dashboard');
    },
    
    navigateToProfile() {
      this.showUserMenu = false;
      this.$emit('navigate-to-profile');
    },
    
    navigateToProjects() {
      this.showUserMenu = false;
      this.$emit('navigate-to-projects');
    },
    
    observeSections() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) {
              this.activeSection = id;
            }
          }
        });
      }, { 
        threshold: 0.3,
        rootMargin: '-100px 0px -100px 0px'
      });

      // Observe all sections
      this.navLinks.forEach(link => {
        const element = document.querySelector(link.href);
        if (element) {
          observer.observe(element);
        }
      });
    }
  }
});
</script>

<style scoped>
.navigation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.navigation.scrolled {
  background: rgba(0, 0, 0, 0.93);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.nav-brand {
  display: flex;
  align-items: center;
}

.nav-logo {
  height: 32px;
  width: auto;
  filter: drop-shadow(0 0 10px rgba(255, 145, 60, 0.3));
  transition: all 0.3s ease;
}

.nav-brand:hover .nav-logo {
  filter: drop-shadow(0 0 15px rgba(255, 145, 60, 0.5));
  transform: scale(1.05);
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}

.nav-link:hover {
  color: #ffffff;
}

.nav-link.active {
  color: #ff913c;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  border-radius: 1px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.theme-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.scroll-top {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}

.scroll-top.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.scroll-top:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 145, 60, 0.3);
}

.scroll-icon {
  width: 20px;
  height: 20px;
}

/* Authentication Buttons */
.auth-buttons {
  display: flex;
  gap: 12px;
}

.auth-button {
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.auth-button.login {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-button.login:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.auth-button.signup {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(255, 145, 60, 0.3);
}

.auth-button.signup:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 145, 60, 0.4);
}

/* User Profile */
.user-profile {
  position: relative;
}

.user-avatar {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 145, 60, 0.3);
  transition: all 0.3s ease;
}

.user-avatar:hover img {
  border-color: rgba(255, 145, 60, 0.6);
  transform: scale(1.05);
}

.avatar-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: #22c55e;
  border: 2px solid #000000;
  border-radius: 50%;
}

/* User Menu */
.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  min-width: 240px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  z-index: 1001;
  animation: menuSlideIn 0.3s ease;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.menu-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255, 145, 60, 0.3);
}

.user-details h4 {
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 4px 0;
}

.user-details p {
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  width: 100%;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateX(4px);
}

.menu-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.menu-item.signout {
  color: #ef4444;
}

.menu-item.signout:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav-content {
    padding: 0 20px;
  }
  
  .nav-links {
    display: none;
  }
  
  .auth-buttons {
    gap: 8px;
  }
  
  .auth-button {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .user-menu {
    right: -20px;
    min-width: 200px;
  }
  
  .user-details h4 {
    font-size: 14px;
  }
  
  .user-details p {
    font-size: 12px;
  }
  
  .menu-item {
    padding: 10px 12px;
    font-size: 13px;
  }
}

/* Light theme styles */
.light-theme .navigation {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
}

.light-theme .navigation.scrolled {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.light-theme .nav-link {
  color: rgba(0, 0, 0, 0.7);
}

.light-theme .nav-link:hover {
  color: #212529;
}

.light-theme .nav-link.active {
  color: #ff913c;
}

.light-theme .theme-toggle {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.2);
  color: #212529;
}

.light-theme .theme-toggle:hover {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(0, 0, 0, 0.3);
}

.light-theme .auth-button {
  color: #212529;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.light-theme .auth-button.login {
  background: rgba(0, 0, 0, 0.05);
}

.light-theme .auth-button.login:hover {
  background: rgba(0, 0, 0, 0.1);
}

.light-theme .auth-button.signup {
  background: #ff913c;
  color: #ffffff;
  border-color: #ff913c;
}

.light-theme .auth-button.signup:hover {
  background: #e67d2b;
  border-color: #e67d2b;
}

.light-theme .user-menu {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
}

.light-theme .user-info h4 {
  color: #212529;
}

.light-theme .user-info p {
  color: rgba(0, 0, 0, 0.7);
}

.light-theme .menu-item {
  color: #212529;
}

.light-theme .menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.light-theme .menu-item.signout {
  color: #dc3545;
}

.light-theme .menu-item.signout:hover {
  background: rgba(220, 53, 69, 0.1);
}

.light-theme .menu-divider {
  background: rgba(0, 0, 0, 0.1);
}

.light-theme .nav-logo {
  filter: drop-shadow(0 0 0 #ff913c) brightness(0) saturate(100%) invert(71%) sepia(35%) saturate(1966%) hue-rotate(338deg) brightness(101%) contrast(101%) !important;
}

</style> 