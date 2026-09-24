import { supabase } from '@/lib/supabase'

export interface CommunityPost {
  id: string
  user_id: string
  user_name: string
  user_avatar: string
  content: string
  post_type: 'project' | 'question' | 'showcase' | 'discussion'
  tags: string[]
  likes_count: number
  comments_count: number
  github_repo?: GitHubRepo
  project_id?: string
  created_at: string
  updated_at: string
  is_liked?: boolean
}

export interface GitHubRepo {
  name: string
  description: string
  url: string
  stars: number
  forks: number
  language: string
  last_updated: string
  topics: string[]
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  user_name: string
  user_avatar: string
  content: string
  created_at: string
}

export interface CreatePostData {
  content: string
  post_type: 'project' | 'question' | 'showcase' | 'discussion'
  tags: string[]
  github_repo?: GitHubRepo
  project_id?: string
}

class CommunityService {
  private cache: Map<string, any> = new Map()
  private cacheTimeout = 2 * 60 * 1000 // 2 minutes for real-time feel

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

  async createPost(postData: CreatePostData): Promise<{ success: boolean; post?: CommunityPost; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          user_name: profile?.name || user.email?.split('@')[0] || 'Anonymous',
          user_avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=ff5500&color=fff`,
          content: postData.content,
          post_type: postData.post_type,
          tags: postData.tags,
          github_repo: postData.github_repo,
          project_id: postData.project_id
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating post:', error)
        return { success: false, error: error.message }
      }

      // Clear cache
      this.clearCache()

      return { success: true, post: data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getPosts(options: {
    post_type?: string
    tags?: string[]
    limit?: number
    offset?: number
    userId?: string
  } = {}): Promise<{ success: boolean; posts?: CommunityPost[]; error?: string }> {
    try {
      const cacheKey = `posts_${JSON.stringify(options)}`
      const cached = this.getCache(cacheKey)
      if (cached) return { success: true, posts: cached }

      let query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (options.post_type) {
        query = query.eq('post_type', options.post_type)
      }
      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags)
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
        console.error('Error fetching posts:', error)
        return { success: false, error: error.message }
      }

      // Check if current user liked each post
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const postIds = data?.map(post => post.id) || []
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)

          const likedPostIds = new Set(likes?.map(like => like.post_id) || [])
          data?.forEach(post => {
            post.is_liked = likedPostIds.has(post.id)
          })
        }
      }

      this.setCache(cacheKey, data)
      return { success: true, posts: data || [] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async likePost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      if (existingLike) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })

      }

      // Clear cache
      this.clearCache()

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getGitHubRepos(username: string): Promise<{ success: boolean; repos?: GitHubRepo[]; error?: string }> {
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`)
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const repos = await response.json()
      
      const formattedRepos: GitHubRepo[] = repos.map((repo: any) => ({
        name: repo.name,
        description: repo.description || 'No description',
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || 'Unknown',
        last_updated: repo.updated_at,
        topics: repo.topics || []
      }))

      return { success: true, repos: formattedRepos }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getTrendingProjects(): Promise<{ success: boolean; projects?: any[]; error?: string }> {
    try {
      // Get popular posts with GitHub repos
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .not('github_repo', 'is', null)
        .order('likes_count', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching trending projects:', error)
        return { success: false, error: error.message }
      }

      return { success: true, projects: data || [] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  async getPostStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('post_type, likes_count, comments_count')

      if (error) {
        console.error('Error fetching post stats:', error)
        return { success: false, error: error.message }
      }

      const stats = {
        total_posts: data?.length || 0,
        total_likes: data?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0,
        total_comments: data?.reduce((sum, post) => sum + (post.comments_count || 0), 0) || 0,
        by_type: data?.reduce((acc, post) => {
          acc[post.post_type] = (acc[post.post_type] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      }

      return { success: true, stats }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      return { success: false, error: errorMessage }
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const communityService = new CommunityService() 