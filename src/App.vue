<template>
  <div id="app">
    <router-view />
    <DonationAssistant />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import DonationAssistant from '@/components/DonationAssistant.vue'

export default defineComponent({
  name: 'App',
  components: { DonationAssistant }
})
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Manrope", Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
  color: #ffffff;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}

/* Animation classes */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.animate-on-scroll.animate-in {
  opacity: 1;
  transform: translateY(0);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 145, 60, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 145, 60, 0.7);
}

/* Selection styles */
::selection {
  background: rgba(255, 145, 60, 0.3);
  color: #ffffff;
}

/* Focus styles */
*:focus {
  outline: 2px solid rgba(255, 145, 60, 0.5);
  outline-offset: 2px;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Loading animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Loading spinner */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #ff913c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid;
}

.btn-primary {
  background: #ff913c;
  color: #ffffff;
  border-color: #ff913c;
}

.btn-primary:hover {
  background: #e67d2b;
  border-color: #e67d2b;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #ff913c;
  background: rgba(255, 255, 255, 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal {
    margin: 20px;
    max-width: none;
  }
  
  .btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* Light theme styles */
.light-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%);
  color: #212529;
}

.light-theme body {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%);
  color: #212529;
}

.light-theme .btn-secondary {
  background: rgba(0, 0, 0, 0.1);
  color: #212529;
  border-color: rgba(0, 0, 0, 0.2);
}

.light-theme .btn-secondary:hover {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(0, 0, 0, 0.3);
}

.light-theme .form-group label {
  color: #212529;
}

.light-theme .form-group input,
.light-theme .form-group textarea,
.light-theme .form-group select {
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.8);
  color: #212529;
}

.light-theme .form-group input:focus,
.light-theme .form-group textarea:focus,
.light-theme .form-group select:focus {
  background: rgba(255, 255, 255, 1);
  border-color: #ff913c;
}

.light-theme .form-group input::placeholder,
.light-theme .form-group textarea::placeholder {
  color: rgba(0, 0, 0, 0.5);
}

.light-theme .modal {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.light-theme .loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid #ff913c;
}

.light-theme ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.light-theme ::selection {
  background: rgba(255, 145, 60, 0.2);
  color: #212529;
}
</style> 