<template>
  <div class="opus-webapp">
    <!-- Auth Page View -->
    <AuthPage 
      v-if="showAuth" 
      :initial-mode="authMode" 
      @close="showAuth = false" 
      @success="handleAuthSuccess"
      @resend-success="handleResendSuccess"
    />
    
    <!-- Main App Content -->
    <div v-else>
      <Navigation 
        @navigate-to-dashboard="showDashboard = true" 
        @navigate-to-profile="showProfile = true"
        @navigate-to-projects="navigateToProjects"
        @show-auth="showAuthPage"
      />
      <Notification ref="notification" />
      
      <!-- Landing Page View -->
      <div v-if="!showDashboard && !showProfile" class="landing-page">
        <div id="home">
          <Header />
        </div>
        <MissionStatement />
        <div id="github">
          <GitHubIntegration @share-repository="handleRepositoryShare" @import-repository="handleRepositoryImport" />
        </div>
        <div id="community">
          <SocialFeed @project-created="handleProjectCreated" />
        </div>
        <div id="projects">
          <ProjectShowcase @project-created="handleProjectCreated" />
        </div>
        <div id="team">
          <TeamSection />
        </div>
        <JourneySection />
        <div id="faq">
          <FAQSection />
        </div>
        <PressKitSection />
        <CTASection />
        <Footer />
        <DonateButton />
      </div>
      
      <!-- Dashboard View -->
      <div v-else-if="showDashboard" class="dashboard-view">
        <div class="dashboard-header">
          <button @click="showDashboard = false" class="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
        </div>
        <Dashboard @project-created="handleProjectCreated" />
      </div>
      
      <!-- Profile View -->
      <div v-else-if="showProfile" class="profile-view">
        <div class="profile-header">
          <button @click="showProfile = false" class="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
        </div>
        <UserProfile @profile-updated="handleProfileUpdated" />
      </div>
      <ProjectForm
        v-if="showProjectForm"
        :initial-values="importProjectInitialValues"
        @close="closeProjectForm"
        @success="handleProjectCreatedAndClose"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { authService, AuthState } from "@/services/authService";
import { type Project, type CreateProjectData } from "@/services/projectService";
import Navigation from "@/components/Navigation.vue";
import Notification from "@/components/Notification.vue";
import Header from "@/components/Header.vue";
import MissionStatement from "@/components/MissionStatement.vue";
// @ts-ignore
import GitHubIntegration from "@/components/GitHubIntegration.vue";
// @ts-ignore
import SocialFeed from "@/components/SocialFeed.vue";
import ProjectShowcase from "@/components/ProjectShowcase.vue";
import TeamSection from "@/components/TeamSection.vue";
import JourneySection from "@/components/JourneySection.vue";
import FAQSection from "@/components/FAQSection.vue";
import CTASection from "@/components/CTASection.vue";
import Footer from "@/components/Footer.vue";
// @ts-ignore
import DonateButton from "@/components/DonateButton.vue";
import Dashboard from "@/components/Dashboard.vue";
import UserProfile from "@/components/UserProfile.vue";
import AuthPage from "@/components/AuthPage.vue";
import PressKitSection from "@/components/PressKitSection.vue";
import ProjectForm from "@/components/ProjectForm.vue";

interface NotificationComponent {
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
}

// Import Repository interface from GitHubIntegration
interface Repository {
  id: number;
  name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

export default defineComponent({
  name: "OpusWebapp",
  components: {
    Navigation,
    Notification,
    Header,
    MissionStatement,
    GitHubIntegration,
    SocialFeed,
    ProjectShowcase,
    TeamSection,
    JourneySection,
    FAQSection,
    CTASection,
    Footer,
    DonateButton,
    Dashboard,
    UserProfile,
    AuthPage,
    PressKitSection,
    ProjectForm
  },
  props: {
    initialView: {
      type: String,
      default: 'home'
    }
  },
  data() {
    return {
      showAuth: false,
      authMode: 'login' as 'login' | 'signup',
      showDashboard: false,
      showProfile: false,
      authState: {
        user: null,
        loading: false,
        error: null
      } as AuthState,
      unsubscribe: () => {},
      showProjectForm: false,
      importProjectInitialValues: null as Partial<CreateProjectData> | null
    };
  },
  mounted() {
    this.initializeAnimations();
    this.handleUrlParameters();
    this.setInitialView();
    
    // Subscribe to auth state changes
    this.unsubscribe = authService.subscribe((state) => {
      this.authState = state;
    });
  },
  beforeUnmount() {
    this.unsubscribe();
  },
  methods: {
    setInitialView() {
      if (this.initialView === 'dashboard') {
        this.showDashboard = true;
      } else if (this.initialView === 'profile') {
        this.showProfile = true;
      }
    },
    
    showAuthPage(mode: 'login' | 'signup' = 'login') {
      this.authMode = mode;
      this.showAuth = true;
    },
    
    handleAuthSuccess() {
      this.showAuth = false;
      const notification = this.$refs.notification as NotificationComponent;
      if (notification) {
        notification.success(
          'Welcome!',
          'You have successfully signed in to Opus.'
        );
      }
    },

    handleResendSuccess() {
      const notification = this.$refs.notification as NotificationComponent;
      if (notification) {
        notification.success(
          'Email Sent!',
          'A new confirmation email has been sent to your inbox.'
        );
      }
    },

    initializeAnimations() {
      // Initialize scroll animations
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
      });
    },

    handleRepositoryShare(repository: any) {
      // Handle repository sharing to social feed
      console.log('Repository shared:', repository);
      const notification = this.$refs.notification as NotificationComponent;
      if (notification) {
        notification.success(
          'Repository Shared!',
          `${repository.name} has been shared to the community feed.`
        );
      }
    },

    handleRepositoryImport(repo: Repository) {
      // Map GitHub repo fields to project form initial values
      this.importProjectInitialValues = {
        title: repo.name,
        description: repo.description || '',
        github_url: repo.html_url,
        technologies: repo.language ? [repo.language] : [],
        image_url: '',
        live_url: '',
        category: '',
        difficulty_level: undefined
      };
      this.showProjectForm = true;
    },

    closeProjectForm() {
      this.showProjectForm = false;
      this.importProjectInitialValues = null;
    },

    handleProjectCreatedAndClose(project: Project) {
      this.handleProjectCreated(project);
      this.closeProjectForm();
    },

    handleProjectCreated(project: any) {
      // Handle project creation from showcase or social feed
      console.log('Project created:', project);
      const notification = this.$refs.notification as NotificationComponent;
      if (notification) {
        notification.success(
          'Project Created!',
          `${project.title} has been added to the showcase.`
        );
      }
    },
    
    handleProfileUpdated(user: any) {
      // Handle profile updates
      console.log('Profile updated:', user);
      const notification = this.$refs.notification as NotificationComponent;
      if (notification) {
        notification.success(
          'Profile Updated!',
          'Your profile has been updated successfully.'
        );
      }
    },

    handleUrlParameters() {
      // Handle URL parameters for authentication errors (both query params and hash)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check query parameters first
      let error = urlParams.get('error');
      let errorCode = urlParams.get('error_code');
      let errorDescription = urlParams.get('error_description');
      
      // If not found in query params, check hash params
      if (!error) {
        error = hashParams.get('error');
        errorCode = hashParams.get('error_code');
        errorDescription = hashParams.get('error_description');
      }
      
      if (error) {
        const notification = this.$refs.notification as NotificationComponent;
        if (notification) {
          let message = error;
          if (errorCode === 'otp_expired') {
            message = 'The email confirmation link has expired. Please try signing up again.';
          } else if (errorDescription) {
            message = decodeURIComponent(errorDescription);
          }
          
          notification.error(
            'Authentication Error',
            message
          );
        }
        
        // Clear the URL parameters to prevent showing the error again
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    },

    navigateToProjects() {
      this.showDashboard = false;
      this.showProfile = false;
      setTimeout(() => {
        const projectsSection = document.querySelector('#projects');
        if (projectsSection) {
          projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }
});
</script>

<style scoped>
.opus-webapp {
  background-color: #000000;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Add padding to account for fixed navigation */
#home {
  padding-top: 70px;
}

/* Light theme styles */
.light-theme {
  background-color: #ffffff;
  color: #000000;
}

.light-theme .opus-webapp {
  background-color: #ffffff;
}

.dashboard-view,
.profile-view {
  padding-top: 70px;
}

.dashboard-header,
.profile-header {
  padding: 20px 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .dashboard-header,
  .profile-header {
    padding: 20px;
  }
}
</style>

<style>
/*
  Main page theme, matched to the donate page: warm charcoal ground with an orange glow,
  Funnel Display headings in solid white, and soft bordered cards.
  Selectors are prefixed with .opus-webapp .landing-page so they outrank component styles.
*/
.opus-webapp .landing-page {
  --theme-orange: #ff913d;
  --theme-ink: #1a0e05;
  --theme-card: rgba(255, 255, 255, 0.04);
  --theme-border: rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(80% 60% at 90% 0%, rgba(255, 145, 61, 0.14), transparent 60%),
    radial-gradient(60% 50% at 0% 100%, rgba(255, 145, 61, 0.06), transparent 60%),
    linear-gradient(135deg, #0a0a0a 0%, #151515 50%, #0a0a0a 100%);
}

.opus-webapp .landing-page .press-kit-section {
  background: transparent;
}

/* Headings */
.opus-webapp .landing-page .header-title,
.opus-webapp .landing-page .section-title,
.opus-webapp .landing-page .cta-title {
  font-family: "Funnel Display", "Manrope", Helvetica, Arial, sans-serif;
  font-weight: 400;
  letter-spacing: 0;
  color: #ffffff;
  background: none;
  -webkit-text-fill-color: #ffffff;
  animation: none;
  text-wrap: balance;
}

.opus-webapp .landing-page .header-subtitle {
  color: var(--theme-orange);
  font-size: 13px;
  letter-spacing: 0.14em;
}

.opus-webapp .landing-page .highlight {
  background: none;
  -webkit-text-fill-color: var(--theme-orange);
  color: var(--theme-orange);
}

/* Cards */
.opus-webapp .landing-page .status-card,
.opus-webapp .landing-page .stat-card,
.opus-webapp .landing-page .repo-card,
.opus-webapp .landing-page .post-card,
.opus-webapp .landing-page .post-form,
.opus-webapp .landing-page .project-card,
.opus-webapp .landing-page .team-member,
.opus-webapp .landing-page .faq-item,
.opus-webapp .landing-page .kit-card {
  background: var(--theme-card);
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  box-shadow: none;
  backdrop-filter: none;
}

/* Buttons: sentence case, dark text on orange like the donate button */
.opus-webapp .landing-page .btn {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 700;
}

.opus-webapp .landing-page .btn-primary {
  color: var(--theme-ink);
}
</style>
