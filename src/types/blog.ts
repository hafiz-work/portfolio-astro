export type BlogStatus = 'draft' | 'published' | 'archived'

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
