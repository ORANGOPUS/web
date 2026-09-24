<template>
  <div class="auth-page">
    <div class="auth-background">
      <div class="auth-particles"></div>
    </div>
    
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo-section">
            <img src="/orangopus-icon.svg" alt="" class="auth-logo" />
            <h1 class="auth-title">Welcome to Orangopus</h1>
            <p class="auth-subtitle">Join our inclusive community of creators</p>
          </div>
          
          <button @click="$emit('close')" class="close-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="auth-tabs">
          <button 
            @click="isLogin = true; resetSignupSuccess()" 
            :class="['tab-button', { active: isLogin }]"
          >
            Sign In
          </button>
          <button 
            @click="isLogin = false; resetSignupSuccess()" 
            :class="['tab-button', { active: !isLogin }]"
          >
            Sign Up
          </button>
        </div>

        <div v-if="!signInEnabled" class="error-message setup-note">
          Sign-in isn't switched on yet. It starts working once the site is connected to Supabase.
        </div>

        <button type="button" class="github-button" :disabled="authState.loading || !signInEnabled" @click="signInWithGitHub">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Continue with GitHub
        </button>
        <div class="auth-divider"><span>or use email</span></div>

        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="Enter your email"
              :disabled="authState.loading"
            />
          </div>

          <div v-if="!isLogin" class="form-group">
            <label for="name">Full Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              placeholder="Enter your full name"
              :disabled="authState.loading"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              placeholder="Enter your password"
              :disabled="authState.loading"
            />
          </div>

          <div v-if="authState.error" class="error-message">
            {{ authState.error }}
          </div>

          <div v-if="signupSuccess" class="success-message">
            <h3>Check your email!</h3>
            <p>We've sent you a confirmation link. Please check your email and click the link to complete your registration.</p>
            <p class="email-note">Didn't receive the email? Check your spam folder or try signing up again.</p>
            <div class="success-actions">
              <button @click="resendConfirmation()" class="resend-button" :disabled="resendLoading">
                {{ resendLoading ? 'Sending...' : 'Resend Email' }}
              </button>
              <button @click="resetSignupSuccess()" class="try-again-button">
                Try Again
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            class="submit-button"
            :disabled="authState.loading"
          >
            <span v-if="authState.loading" class="loading-spinner"></span>
            {{ authState.loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account') }}
          </button>
        </form>

        <div class="auth-footer">
          <p v-if="isLogin">
            Don't have an account? 
            <button @click="isLogin = false" class="link-button">Sign up</button>
          </p>
          <p v-else>
            Already have an account? 
            <button @click="isLogin = true" class="link-button">Sign in</button>
          </p>
        </div>
        
        <div class="auth-features">
          <div class="feature">
            <div class="feature-icon">🤝</div>
            <span>Inclusive Community</span>
          </div>
          <div class="feature">
            <div class="feature-icon">🔓</div>
            <span>100% Free & Open</span>
          </div>
          <div class="feature">
            <div class="feature-icon">💡</div>
            <span>No Judgement Zone</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { authService, AuthState } from "@/services/authService";
import { isSupabaseConfigured } from "@/lib/supabase";

interface FormData {
  email: string;
  password: string;
  name: string;
}

export default defineComponent({
  name: "AuthPage",
  props: {
    initialMode: {
      type: String,
      default: 'login',
      validator: (value: string) => ['login', 'signup'].includes(value)
    }
  },
  data() {
    return {
      isLogin: this.initialMode === 'login',
      form: {
        email: '',
        password: '',
        name: ''
      } as FormData,
      authState: {
        user: null,
        loading: false,
        error: null
      } as AuthState,
      unsubscribe: () => {},
      signupSuccess: false,
      resendLoading: false,
      signInEnabled: isSupabaseConfigured
    };
  },
  watch: {
    initialMode(newMode: string) {
      this.isLogin = newMode === 'login';
    }
  },
  mounted() {
    this.unsubscribe = authService.subscribe((state) => {
      this.authState = state;
      if (state.user) {
        this.$emit('success');
      }
    });
  },
  beforeUnmount() {
    this.unsubscribe();
  },
  methods: {
    async signInWithGitHub() {
      await authService.signInWithGitHub();
    },

    async handleSubmit() {
      if (this.isLogin) {
        const result = await authService.signIn(this.form.email, this.form.password);
        if (result.success) {
          this.$emit('success');
        }
      } else {
        const result = await authService.signUp(this.form.email, this.form.password, this.form.name);
        if (result.success) {
          this.signupSuccess = true;
        }
      }
    },

    resetSignupSuccess() {
      this.signupSuccess = false;
    },

    async resendConfirmation() {
      this.resendLoading = true;
      try {
        const result = await authService.resendConfirmation(this.form.email);
        if (result.success) {
          this.$emit('resend-success');
        } else {
          this.authState.error = result.error || 'Failed to resend confirmation email';
        }
      } catch (error) {
        this.authState.error = 'Failed to resend confirmation email';
      } finally {
        this.resendLoading = false;
      }
    }
  }
});
</script>

<style scoped>
.setup-note {
  margin-bottom: 16px;
}
.github-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #161b22;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.github-button svg { width: 20px; height: 20px; }
.github-button:disabled { opacity: 0.5; cursor: not-allowed; }
.github-button:not(:disabled):hover { border-color: #ff913d; }
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}
.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.auth-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 10000;
  overflow-y: auto;
  padding: 20px;
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.auth-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20% 30%, rgba(255, 145, 60, 0.2), transparent),
    radial-gradient(1px 1px at 60% 70%, rgba(255, 255, 255, 0.1), transparent),
    radial-gradient(3px 3px at 80% 20%, rgba(255, 145, 60, 0.15), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(255, 255, 255, 0.08), transparent);
  background-size: 400px 400px, 300px 300px, 500px 500px, 200px 200px;
  animation: auth-float 25s ease-in-out infinite;
}

@keyframes auth-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-15px) rotate(0.5deg); }
  66% { transform: translateY(10px) rotate(-0.5deg); }
}

.auth-container {
  width: 100%;
  max-width: 500px;
  /* auto margins centre the card but let it scroll when it's taller than the screen */
  margin: auto;
}

.auth-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  animation: cardSlideIn 0.5s ease;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.logo-section {
  text-align: center;
  flex: 1;
}

.auth-logo {
  height: 40px;
  width: auto;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 15px rgba(255, 145, 60, 0.5));
}

.auth-title {
  font-family: "Manrope", Helvetica;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #ffffff 0%, #ff913c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-subtitle {
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transform: scale(1.05);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.auth-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 32px;
}

.tab-button {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 14px 20px;
  border-radius: 8px;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button.active {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(255, 145, 60, 0.3);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
  color: #ffffff;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #ff913c;
  background: rgba(255, 145, 60, 0.05);
  box-shadow: 0 0 0 4px rgba(255, 145, 60, 0.1);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.error-message {
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 12px;
  padding: 16px;
  color: #ff3b30;
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  text-align: center;
}

.success-message {
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.success-message h3 {
  color: #34c759;
  font-family: "Manrope", Helvetica;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.success-message p {
  color: rgba(255, 255, 255, 0.9);
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.success-message .email-note {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-style: italic;
  margin-top: 12px;
}

.success-actions {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.resend-button {
  background: none;
  border: none;
  color: #ff913c;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.resend-button:hover {
  color: #ffaf57;
}

.resend-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.try-again-button {
  background: none;
  border: none;
  color: #ff913c;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.try-again-button:hover {
  color: #ffaf57;
}

.submit-button {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 18px;
  font-family: "Manrope", Helvetica;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(255, 145, 60, 0.4);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-footer {
  text-align: center;
  margin-bottom: 32px;
}

.auth-footer p {
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.link-button {
  background: none;
  border: none;
  color: #ff913c;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.link-button:hover {
  color: #ffaf57;
}


.auth-features {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.feature-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.feature span {
  font-family: "Manrope", Helvetica;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .auth-page {
    padding: 16px;
  }
  
  .auth-card {
    padding: 32px 24px;
  }
  
  .auth-title {
    font-size: 24px;
  }
  
  .auth-subtitle {
    font-size: 14px;
  }
  
  .auth-tabs {
    margin-bottom: 24px;
  }
  
  .tab-button {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .auth-form {
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .form-group input {
    padding: 14px 16px;
    font-size: 14px;
  }
  
  .submit-button {
    padding: 16px;
    font-size: 16px;
  }
  
  .auth-features {
    flex-direction: column;
    gap: 16px;
  }
  
  .feature {
    flex-direction: row;
    gap: 12px;
  }
  
  .feature-icon {
    font-size: 20px;
    margin-bottom: 0;
  }
  
  .feature span {
    font-size: 11px;
  }
}
</style> 