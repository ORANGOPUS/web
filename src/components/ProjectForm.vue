<template>
  <div class="project-form">
    <div class="form-header">
      <h2>{{ isEditing ? 'Edit Project' : 'Create New Project' }}</h2>
      <button @click="$emit('close')" class="close-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <form @submit.prevent="handleSubmit" class="form">
      <div v-if="!isEditing" class="writer">
        <div class="writer-head">
          <span class="writer-badge">AI</span>
          <div>
            <strong>Write it from GitHub</strong>
            <p>Paste a public repository and the project writer drafts the listing from its README. Check it before saving.</p>
          </div>
        </div>
        <div class="writer-row">
          <label for="writer_repo" class="sr-only">GitHub repository link</label>
          <input
            id="writer_repo"
            v-model="writerRepo"
            type="text"
            inputmode="url"
            placeholder="https://github.com/orangopus/web"
            :disabled="writing || loading"
            @keydown.enter.prevent="writeFromGitHub"
          />
          <button type="button" class="writer-button" :disabled="writing || loading || !writerRepo.trim()" @click="writeFromGitHub">
            <span v-if="writing" class="loading-spinner"></span>
            {{ writing ? 'Writing…' : 'Draft it' }}
          </button>
        </div>
        <p v-if="writerMessage" class="writer-message" :class="{ ok: writerOk }">{{ writerMessage }}</p>
      </div>

      <div class="form-group">
        <label for="title">Project Title *</label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          required
          placeholder="Enter project title"
          :disabled="loading"
        />
      </div>

      <div class="form-group">
        <label for="description">Description *</label>
        <textarea
          id="description"
          v-model="form.description"
          required
          placeholder="Describe your project..."
          rows="4"
          :disabled="loading"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="category">Category</label>
          <select
            id="category"
            v-model="form.category"
            :disabled="loading"
          >
            <option value="">Select a category</option>
            <option value="web-development">Web Development</option>
            <option value="mobile-app">Mobile App</option>
            <option value="desktop-app">Desktop App</option>
            <option value="game">Game</option>
            <option value="ai-ml">AI/ML</option>
            <option value="data-science">Data Science</option>
            <option value="devops">DevOps</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="difficulty">Difficulty Level</label>
          <select
            id="difficulty"
            v-model="form.difficulty_level"
            :disabled="loading"
          >
            <option value="">Select difficulty</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="technologies">Technologies *</label>
        <div class="technologies-input">
          <div class="technology-tags">
            <span
              v-for="tech in form.technologies"
              :key="tech"
              class="technology-tag"
            >
              {{ tech }}
              <button
                type="button"
                @click="removeTechnology(tech)"
                class="remove-tech"
              >
                ×
              </button>
            </span>
          </div>
          <div class="add-technology">
            <input
              v-model="newTechnology"
              type="text"
              placeholder="Add technology..."
              @keydown.enter.prevent="addTechnology"
              :disabled="loading"
            />
            <button
              type="button"
              @click="addTechnology"
              class="add-tech-btn"
              :disabled="!newTechnology.trim() || loading"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="github_url">GitHub URL</label>
          <input
            id="github_url"
            v-model="form.github_url"
            type="url"
            placeholder="https://github.com/username/repo"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="live_url">Live Demo URL</label>
          <input
            id="live_url"
            v-model="form.live_url"
            type="url"
            placeholder="https://your-project.com"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="image_url">Project Image URL</label>
        <input
          id="image_url"
          v-model="form.image_url"
          type="url"
          placeholder="https://example.com/image.jpg"
          :disabled="loading"
        />
        <small class="form-help">Provide a direct link to your project image</small>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="$emit('close')"
          class="cancel-button"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="submit-button"
          :disabled="loading || !isFormValid"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { projectService, type Project, type CreateProjectData } from '@/services/projectService'
import { supabase } from '@/lib/supabase'

export default defineComponent({
  name: 'ProjectForm',
  props: {
    project: {
      type: Object as () => Project | null,
      default: null
    },
    initialValues: {
      type: Object as () => Partial<CreateProjectData> | null,
      default: null
    }
  },
  data() {
    return {
      form: {
        title: '',
        description: '',
        image_url: '',
        github_url: '',
        live_url: '',
        technologies: [] as string[],
        category: '',
        difficulty_level: '' as 'beginner' | 'intermediate' | 'advanced' | ''
      },
      newTechnology: '',
      loading: false,
      error: '',
      writerRepo: '',
      writing: false,
      writerMessage: '',
      writerOk: false
    }
  },
  computed: {
    isEditing(): boolean {
      return !!this.project
    },
    isFormValid(): boolean {
      return !!(
        this.form.title.trim() &&
        this.form.description.trim() &&
        this.form.technologies.length > 0
      )
    }
  },
  mounted() {
    if (this.project) {
      this.form = {
        title: this.project.title,
        description: this.project.description,
        image_url: this.project.image_url || '',
        github_url: this.project.github_url || '',
        live_url: this.project.live_url || '',
        technologies: [...this.project.technologies],
        category: this.project.category || '',
        difficulty_level: this.project.difficulty_level || ''
      }
    } else if (this.initialValues) {
      this.form = {
        ...this.form,
        ...this.initialValues,
        technologies: this.initialValues.technologies ? [...this.initialValues.technologies] : []
      }
      if (this.initialValues.github_url) this.writerRepo = this.initialValues.github_url
    }
  },
  methods: {
    // Asks the project writer agent (server/project-writer.mjs) for a draft and fills the form with it.
    async writeFromGitHub() {
      const repo = this.writerRepo.trim()
      if (!repo || this.writing) return
      this.writing = true
      this.writerMessage = ''
      this.writerOk = false
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
        const res = await fetch('/api/project-writer', { method: 'POST', headers, body: JSON.stringify({ github_url: repo }) })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.draft) {
          this.writerMessage = data?.message || "The writer isn't available right now. You can fill in the form yourself."
          return
        }
        const d = data.draft
        this.form = {
          ...this.form,
          title: d.title || this.form.title,
          description: d.description || this.form.description,
          technologies: Array.isArray(d.technologies) && d.technologies.length ? d.technologies : this.form.technologies,
          category: d.category || this.form.category,
          difficulty_level: d.difficulty_level || this.form.difficulty_level,
          github_url: d.github_url || this.form.github_url,
          live_url: this.form.live_url || d.live_url || ''
        }
        this.writerOk = true
        this.writerMessage = 'Draft ready. Read it through and change anything before you save.'
      } catch {
        this.writerMessage = "The writer isn't available right now. You can fill in the form yourself."
      } finally {
        this.writing = false
      }
    },
    addTechnology() {
      const tech = this.newTechnology.trim()
      if (tech && !this.form.technologies.includes(tech)) {
        this.form.technologies.push(tech)
        this.newTechnology = ''
      }
    },
    removeTechnology(tech: string) {
      const index = this.form.technologies.indexOf(tech)
      if (index > -1) {
        this.form.technologies.splice(index, 1)
      }
    },
    async handleSubmit() {
      if (!this.isFormValid) return

      this.loading = true
      this.error = ''

      try {
        const projectData: CreateProjectData = {
          title: this.form.title.trim(),
          description: this.form.description.trim(),
          image_url: this.form.image_url.trim() || undefined,
          github_url: this.form.github_url.trim() || undefined,
          live_url: this.form.live_url.trim() || undefined,
          technologies: this.form.technologies,
          category: this.form.category || undefined,
          difficulty_level: this.form.difficulty_level || undefined
        }

        if (this.isEditing && this.project) {
          const result = await projectService.updateProject(this.project.id, projectData)
          if (result.success) {
            this.$emit('success', result.project)
          } else {
            this.error = result.error || 'Failed to update project'
          }
        } else {
          const result = await projectService.createProject(projectData)
          if (result.success) {
            this.$emit('success', result.project)
          } else {
            this.error = result.error || 'Failed to create project'
          }
        }
      } catch (error) {
        this.error = 'An unexpected error occurred'
        console.error('Project form error:', error)
      } finally {
        this.loading = false
      }
    }
  }
})
</script>

<style scoped>
.writer {
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 145, 61, 0.08);
  border: 1px solid rgba(255, 145, 61, 0.3);
  margin-bottom: 8px;
}
.writer-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.writer-head p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 4px;
  line-height: 1.5;
}
.writer-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ff913d;
  color: #1a1a1a;
}
.writer-row {
  display: flex;
  gap: 10px;
}
.writer-row input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font: inherit;
}
.writer-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 10px;
  border: none;
  background: #ff913d;
  color: #1a1a1a;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.writer-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.writer-message {
  margin-top: 10px;
  font-size: 14px;
  color: #ffb3a1;
}
.writer-message.ok {
  color: #9be29b;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.project-form {
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 32px;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-family: "Manrope", Helvetica;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
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
  background: rgba(255, 145, 60, 0.05);
  box-shadow: 0 0 0 4px rgba(255, 145, 60, 0.1);
}

.form-group input:disabled,
.form-group textarea:disabled,
.form-group select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-help {
  font-family: "Manrope", Helvetica;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}

.technologies-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.technology-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.technology-tag {
  background: rgba(255, 145, 60, 0.2);
  border: 1px solid rgba(255, 145, 60, 0.3);
  border-radius: 20px;
  padding: 6px 12px;
  color: #ff913c;
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-tech {
  background: none;
  border: none;
  color: #ff913c;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.remove-tech:hover {
  background: rgba(255, 145, 60, 0.3);
  color: #ffffff;
}

.add-technology {
  display: flex;
  gap: 8px;
}

.add-technology input {
  flex: 1;
}

.add-tech-btn {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 16px 20px;
  font-family: "Manrope", Helvetica;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.add-tech-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 145, 60, 0.3);
}

.add-tech-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
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

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 16px;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 16px 24px;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.submit-button {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-family: "Manrope", Helvetica;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
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

@media (max-width: 768px) {
  .project-form {
    padding: 24px;
    margin: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .add-technology {
    flex-direction: column;
  }
  
  .add-tech-btn {
    width: 100%;
  }
}
</style> 