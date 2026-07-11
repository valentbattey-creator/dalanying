"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { toast } from "sonner";
import { moderateContent, getViolationLevel } from "./moderation";
import { dataService, syncSeedToSupabase, banUser, unbanUser, fetchAllProfiles, createAnnouncement, type Post, type Comment, type Profile } from "./data";

export type { Post, Comment };

interface DataState {
  posts: Post[];
  comments: Comment[];
  likedPosts: Set<string>;
  savedPosts: Set<string>;
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loadMore: () => Promise<void>;
  addPost: (post: Omit<Post, "id" | "likes" | "comments" | "createdAt" | "authorId" | "authorAvatar">) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string | null, image?: string) => Promise<Comment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => void;
  deletePost: (postId: string) => Promise<boolean>;
  updatePost: (postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[]; isPinned?: boolean; isAnnouncement?: boolean }) => Promise<boolean>;
  getPostsByCategory: (category: string) => Post[];
  getPostById: (id: string) => Post | undefined;
  getCommentsByPostId: (postId: string) => Comment[];
  fetchPostById: (postId: string) => Promise<Post | null>;
  loadUserPosts: (userId: string) => Promise<Post[]>;
  loadUserLikedPosts: (userId: string) => Promise<Post[]>;
  loadUserSavedPosts: (userId: string) => Promise<Post[]>;
  refreshAll: () => Promise<void>;
  resetAndReload: (category?: string) => Promise<void>;
  // Admin
  banUser: (userId: string, until: string) => Promise<boolean>;
  unbanUser: (userId: string) => Promise<boolean>;
  fetchAllProfiles: () => Promise<Profile[]>;
  createAnnouncement: (post: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => Promise<Post | null>;
}

const DataContext = createContext<DataState | null>(null);

function isBanned(u: import("./auth").AppUser | null): boolean {
  if (!u || !u.bannedUntil) return false;
  return new Date(u.bannedUntil).getTime() > Date.now();
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("dalanying_likedPosts");
        if (stored) {
          const arr = JSON.parse(stored);
          // Keys are "postId_userId" format, extract post IDs for current user
          const uid = JSON.parse(localStorage.getItem("dalanying_user") || "{}").id;
          if (uid) {
            return new Set(arr.filter((k: string) => k.endsWith("_" + uid)).map((k: string) => k.split("_")[0]));
          }
        }
      } catch {}
    }
    return new Set();
  });
  const [savedPosts, setSavedPosts] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("dalanying_savedPosts");
        if (stored) return new Set(JSON.parse(stored));
      } catch {}
    }
    return new Set();
  });
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  const initialized = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    const offset = posts.length;
    const result = await dataService.fetchPostsPaginated(offset, currentCategory, searchQuery);
    setPosts(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const uniqueNew = result.posts.filter(p => !existingIds.has(p.id));
      return [...prev, ...uniqueNew];
    });
    setTotalCount(result.total);
    setHasMore(offset + result.posts.length < result.total);
    setLoading(false);
  }, [hasMore, loading, posts.length, currentCategory, searchQuery]);

  const resetAndReload = useCallback(async (category?: string) => {
    const cat = category || "";
    setCurrentCategory(cat);
    setPosts([]);
    setHasMore(true);
    setLoading(true);
    const result = await dataService.fetchPostsPaginated(0, cat, searchQuery);
    setPosts(result.posts);
    setTotalCount(result.total);
    setHasMore(result.posts.length < result.total);
    setLoading(false);
  }, [searchQuery]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const result = await dataService.fetchPostsPaginated(0, currentCategory, searchQuery);
    const c = await dataService.fetchComments();
    setPosts(result.posts);
    setTotalCount(result.total);
    setHasMore(result.posts.length < result.total);
    setComments(c);
    if (user) {
      const { userLikes } = await dataService.fetchLikes(user.id);
      setLikedPosts(userLikes);
      const saved = dataService.loadSavedPosts(user.id) as Set<string>;
      setSavedPosts(saved);
    }
    setLoading(false);
  }, [user, currentCategory, searchQuery]);

  // Initial load
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refreshAll();
    }
  }, [refreshAll]);

  // Seed sync
  useEffect(() => {
    if (user) {
      syncSeedToSupabase(user.id).then(synced => { if (synced) refreshAll(); });
    }
  }, [user]);

  // When search changes
  useEffect(() => {
    if (initialized.current) {
      resetAndReload(currentCategory);
    }
  }, [searchQuery]);

  const addPost = useCallback(async (p: Omit<Post, "id" | "likes" | "comments" | "createdAt" | "authorId" | "authorAvatar">) => {
    if (!user) return;
    if (isBanned(user)) return;
    // Content moderation
    const modResult = moderateContent((p.title || "") + " " + (p.content || ""));
    if (!modResult.passed) {
      toast?.error?.("内容违规：" + (modResult.reason || "包含不当内容"));
      return;
    }
    const newPost = await dataService.createPost({
      ...p,
      author: user.name,
      authorId: user.id,
      authorAvatar: user.avatar,
      category: p.category || "推荐",
      tags: p.tags || [],
      images: (p as any).images || [],
    });
    setPosts(prev => [newPost, ...prev]);
  }, [user]);

  const addComment = useCallback(async (postId: string, content: string, parentId: string | null = null, image?: string) => {
    if (!user) return null;
    if (isBanned(user)) return null;
    // Content moderation
    const modResult = moderateContent(content);
    if (!modResult.passed) {
      toast?.error?.("评论违规：" + (modResult.reason || "包含不当内容"));
      return null;
    }
    const comment = await dataService.createComment({
      postId, parentId, author: user.name, authorId: user.id, authorAvatar: user.avatar, content, image: image || "",
    });
    if (comment) {
      setComments(prev => [...prev, comment]);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
    }
    return comment;
  }, [user]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user || isBanned(user)) return;
    const currentlyLiked = likedPosts.has(postId);
    const newLikes = await dataService.toggleLike(postId, user.id, currentlyLiked);
    const key = postId + "_" + user.id;
    setLikedPosts(prev => {
      const next = new Set(prev);
      currentlyLiked ? next.delete(postId) : next.add(postId);
      // Persist to localStorage in combined key format
      try {
        const liked = JSON.parse(localStorage.getItem("dalanying_likedPosts") || "[]");
        const updated = currentlyLiked ? liked.filter((k: string) => k !== key) : [...liked, key];
        localStorage.setItem("dalanying_likedPosts", JSON.stringify(updated));
      } catch {}
      return next;
    });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
  }, [user, likedPosts]);

  const toggleSave = useCallback((postId: string) => {
    if (!user) return;
    const currentlySaved = savedPosts.has(postId);
    dataService.toggleSave(postId, user.id, currentlySaved);
    setSavedPosts(prev => {
      const next = new Set(prev);
      currentlySaved ? next.delete(postId) : next.add(postId);
      try { localStorage.setItem("dalanying_savedPosts", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [user, savedPosts]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    const ok = await dataService.deletePost(postId);
    if (ok) setPosts(prev => prev.filter(p => p.id !== postId));
    return ok;
  }, []);

  const updatePost = useCallback(async (postId: string, updates: any): Promise<boolean> => {
    const ok = await dataService.updatePost(postId, updates);
    if (ok) setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
    return ok;
  }, []);

  const getPostsByCategory = useCallback((cat: string) => cat ? posts.filter(p => p.category === cat) : posts, [posts]);
  const getPostById = useCallback((id: string) => posts.find(p => p.id === id), [posts]);
  const getCommentsByPostId = useCallback((pid: string) => comments.filter(c => c.postId === pid), [comments]);

  const loadUserPosts = useCallback(async (userId: string) => dataService.fetchUserPosts(userId), []);
  const loadUserLikedPosts = useCallback(async (userId: string) => dataService.fetchUserLikedPosts(userId), []);
  const loadUserSavedPosts = useCallback(async (userId: string) => dataService.fetchUserSavedPosts(userId), []);

  const handleBanUser = useCallback(async (userId: string, until: string) => banUser(userId, until), []);
  const handleUnbanUser = useCallback(async (userId: string) => unbanUser(userId), []);
  const handleFetchAllProfiles = useCallback(async () => fetchAllProfiles(), []);
  const handleCreateAnnouncement = useCallback(async (post: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => createAnnouncement(post), []);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const ok = await dataService.deleteComment(commentId);
    if (ok) setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    return ok;
  }, []);
  const handleFetchPostById = useCallback(async (postId: string) => dataService.fetchPostById(postId), []);

  return (
    <DataContext.Provider value={{
      posts, comments, likedPosts, savedPosts, loading, hasMore, totalCount, searchQuery, setSearchQuery,
      loadMore, addPost, addComment, toggleLike, toggleSave, deletePost, updatePost,
      getPostsByCategory, getPostById, getCommentsByPostId,
      loadUserPosts, loadUserLikedPosts, loadUserSavedPosts, refreshAll, resetAndReload,
      banUser: handleBanUser, unbanUser: handleUnbanUser,
      fetchAllProfiles: handleFetchAllProfiles,
      createAnnouncement: handleCreateAnnouncement,
      fetchPostById: handleFetchPostById,
      deleteComment: handleDeleteComment,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}
