export interface PostData {
  /** 帖子唯一 ID */
  id: string
  /** 标题（必填） */
  title: string
  /** 正文内容（必填，支持长文本） */
  content: string
  /** 图片链接数组（选填，0-9 张） */
  images: string[]
  /** 分类标签 */
  category: string
  /** 作者名 */
  author: string
  /** 头像 URL */
  avatar: string
  /** 发布时间 */
  createdAt: string
  /** 点赞数 */
  likes: number
  /** 评论数 */
  comments: number
}
