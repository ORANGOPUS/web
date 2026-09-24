import { supabase } from '@/lib/supabase'

export interface Project {
  id: string
  user_id: string
  title: string
  description: string
  image_url?: string
  github_url?: string
  live_url?: string
  technologies: string[]
  status: 'draft' | 'published' | 'archived'
  category?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  featured: boolean
  likes_count: number
  views_count: number
  created_at: string
  updated_at: string
  slug?: string
  // User info for display
  user_name?: string
  user_avatar?: string
}

export interface CreateProjectData {
  title: string
  description: string
  image_url?: string
  github_url?: string
  live_url?: string
  technologies: string[]
  category?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  status?: 'draft' | 'published' | 'archived'
  featured?: boolean
}

class ProjectService {
  private cache: Map<string, any> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < this.cacheTimeout
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  private getCache(key: string): any | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key).data
    }
    return null
  }

  async createProject(projectData: CreateProjectData): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          ...projectData,
          status: 'draft',
          featured: false,
          likes_count: 0,
          views_count: 0
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating project:', error)
        return { success: false, error: error.message }
      }

      // Clear cache
      this.clearCache()

      return { success: true, project: data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getProjects(options: {
    status?: 'draft' | 'published' | 'archived'
    featured?: boolean
    category?: string
    difficulty_level?: string
    limit?: number
    offset?: number
    userId?: string
  } = {}): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status)
      }
      if (options.featured !== undefined) {
        query = query.eq('featured', options.featured)
      }
      if (options.category) {
        query = query.eq('category', options.category)
      }
      if (options.difficulty_level) {
        query = query.eq('difficulty_level', options.difficulty_level)
      }
      if (options.userId) {
        query = query.eq('user_id', options.userId)
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching projects:', error)
        return { success: false, error: error.message }
      }

      // Transform data to include user info
      const projects = data?.map(project => ({
        ...project,
        user_name: project.users?.name,
        user_avatar: project.users?.avatar_url
      })) || []

      return { success: true, projects }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getProject(id: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        return { success: false, error: error.message }
      }

      // Increment view count
      await this.incrementViewCount(id)

      const project = {
        ...data,
        user_name: data.users?.name,
        user_avatar: data.users?.avatar_url
      }

      return { success: true, project }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async updateProject(id: string, updates: UpdateProjectData): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns the project
        .select('*')
        .single()

      if (error) {
        console.error('Error updating project:', error)
        return { success: false, error: error.message }
      }

      return { success: true, project: data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns the project

      if (error) {
        console.error('Error deleting project:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async likeProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('project_likes')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (existingLike) {
        // Unlike
        const { error: unlikeError } = await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id)

        if (unlikeError) {
          return { success: false, error: unlikeError.message }
        }
      } else {
        // Like
        const { error: likeError } = await supabase
          .from('project_likes')
          .insert({
            project_id: projectId,
            user_id: user.id
          })

        if (likeError) {
          return { success: false, error: likeError.message }
        }
      }

      // Clear cache
      this.clearCache()

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async isProjectLiked(projectId: string): Promise<{ success: boolean; liked?: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: true, liked: false }
      }

      const { data, error } = await supabase
        .from('project_likes')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        return { success: false, error: error.message }
      }

      return { success: true, liked: !!data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  private async incrementViewCount(projectId: string): Promise<void> {
    try {
      await supabase.rpc('increment_project_views', { project_id: projectId })
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  // Get project categories
  async getCategories(): Promise<{ success: boolean; categories?: string[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('category')
        .not('category', 'is', null)

      if (error) {
        return { success: false, error: error.message }
      }

      const categories = [...new Set(data.map(item => item.category))].filter(Boolean)
      return { success: true, categories }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  // Search projects
  async searchProjects(query: string): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const projects = data?.map(project => ({
        ...project,
        user_name: project.users?.name,
        user_avatar: project.users?.avatar_url
      })) || []

      return { success: true, projects }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  // Utility methods
  getProjectCategories(): string[] {
    return [
      'Web Development',
      'Mobile Development',
      'AI/ML',
      'Game Development',
      'DevOps',
      'Data Science',
      'Blockchain',
      'IoT',
      'Other'
    ]
  }

  getProjectStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' }
    ]
  }

  clearCache(): void {
    this.cache.clear()
  }

  async getProjectBySlug(slug: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      // First try to get by slug
      let { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      // If slug column doesn't exist or no project found, try to get by ID (fallback)
      if (error && (error.code === '42703' || error.code === 'PGRST116')) {
        // Try to get by ID as fallback (assuming slug might be the ID)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('projects')
          .select(`
            *,
            users:user_id (
              name,
              avatar_url
            )
          `)
          .eq('id', slug)
          .eq('status', 'published')
          .single()

        if (fallbackError) {
          console.error('Error fetching project by slug/ID:', fallbackError)
          return { success: false, error: 'Project not found' }
        }

        data = fallbackData
        error = null
      } else if (error) {
        console.error('Error fetching project by slug:', error)
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Project not found' }
      }

      // Increment view count
      await this.incrementViewCount(data.id)

      const project = {
        ...data,
        user_name: data.users?.name,
        user_avatar: data.users?.avatar_url
      }

      return { success: true, project }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async checkProjectLike(projectId: string): Promise<{ success: boolean; liked?: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: true, liked: false }
      }

      const { data, error } = await supabase
        .from('project_likes')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking project like:', error)
        return { success: false, error: error.message }
      }

      return { success: true, liked: !!data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }
}

export const projectService = new ProjectService() 