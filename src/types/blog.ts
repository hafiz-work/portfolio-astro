export type BlogStatus = 'draft' | 'published' | 'archived' | 'rejected'

export interface BlogSection {
  id: number
  postId: number
  heading: string
  body: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface BlogChecklist {
  id: number
  postId: number
  itemText: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt: string
  heroText: string | null
  coverImageUrl: string | null
  bodyContent: string
  publishedDate: string | null
  readTimeMinutes: number
  tags: string[]
  category: string | null
  status: BlogStatus
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  /** Set for posts written by registered users (display name); null/absent for the owner's posts. */
  authorName?: string | null
  /** Own/admin views: why a moderator rejected it. */
  moderationReason?: string | null
  sections?: BlogSection[]
  checklist?: BlogChecklist[]
}

export interface BlogPostSummary {
  id: number
  slug: string
  title: string
  excerpt: string
  heroText: string | null
  coverImageUrl: string | null
  publishedDate: string | null
  readTimeMinutes: number
  tags: string[]
  category: string | null
  status: BlogStatus
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  /** Set for posts written by registered users (display name); null/absent for the owner's posts. */
  authorName?: string | null
  /** Own/admin views: why a moderator rejected it. */
  moderationReason?: string | null
}

export interface CreateBlogPostPayload {
  slug?: string
  title: string
  excerpt: string
  heroText?: string | null
  /** Social-share image: absolute https URL or root-relative path (~1200x630). */
  coverImageUrl?: string | null
  bodyContent?: string
  publishedDate?: string | null
  readTimeMinutes?: number
  tags?: string[]
  category?: string | null
  status?: BlogStatus
  isFeatured?: boolean
  sections?: Array<{
    heading: string
    body: string
    displayOrder?: number
  }>
  checklist?: Array<{
    itemText: string
    displayOrder?: number
  }>
}

export type UpdateBlogPostPayload = Partial<CreateBlogPostPayload>
