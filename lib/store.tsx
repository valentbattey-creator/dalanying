"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
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
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  deletePost: (postId: string) => Promise<boolean>;
  updatePost: (postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }) => Promise<boolean>;
  getPostsByCategory: (category: string) => Post[];
  getPostById: (id: string) => Post | undefined;
  getCommentsByPostId: (postId: string) => Comment[];
  loadUserPosts: (userId: string) => Promise<Post[]>;
  loadUserLikedPosts: (userId: string) => Promise<Post[]>;
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
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
    const { posts: newPosts, total } = await dataService.loadPostsPaginated(offset, currentCategory, searchQuery);
    setPosts(prev => [...prev, ...newPosts]);
    setTotalCount(total);
    setHasMore(offset + newPosts.length < total);
    setLoading(false);
  }, [hasMore, loading, posts.length, currentCategory, searchQuery]);

  const resetAndReload = useCallback(async (category?: string) => {
    const cat = category || "";
    setCurrentCategory(cat);
    setPosts([]);
    setHasMore(true);
    setLoading(true);
    const { posts: newPosts, total } = await dataService.loadPostsPaginated(0, cat, searchQuery);
    setPosts(newPosts);
    setTotalCount(total);
    setHasMore(newPosts.length < total);
    setLoading(false);
  }, [searchQuery]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const { posts: newPosts, total } = await dataService.loadPostsPaginated(0, currentCategory, searchQuery);
    const c = await dataService.loadComments();
    setPosts(newPosts);
    setTotalCount(total);
    setHasMore(newPosts.length < total);
    setComments(c);
    if (user) {
      const { likedPosts: lp } = await dataService.loadLikes(user.id);
      setLikedPosts(lp);
      setSavedPosts(dataService.loadSavedPosts(user.id));
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

  // When search changes, reload
  useEffect(() => {
    if (initialized.current) {
      resetAndReload(currentCategory);
    }
  }, [searchQuery]);

  const addPost = useCallback(async (p: Omit<Post, "id" | "likes" | "comments" | "createdAt" | "authorId" | "authorAvatar">) => {
    if (!user) return;
    if (isBanned(user)) return;
    const newPost = await dataService.createPost({ ...p, author: user.name, authorId: user.id, authorAvatar: user.avatar });
    setPosts(prev => [newPost, ...prev]);
  }, [user]);

  const addComment = useCallback(async (postId: string, content: string, parentId: string | null = null, image?: string) => {
    if (!user) return null;
    if (isBanned(user)) return null;
    const comment = await dataService.createComment({
      postId, parentId, author: user.name, authorId: user.id, authorAvatar: user.avatar, content, image,
    });
    setComments(prev => [...prev, comment]);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
    return comment;
  }, [user]);

  const toggleLike = useCallback((postId: string) => {
    if (!user || isBanned(user)) return;
    const currentlyLiked = likedPosts.has(postId);
    dataService.toggleLike(postId, user.id, currentlyLiked).then(({ liked, likesDelta }) => {
      setLikedPosts(prev => { const next = new Set(prev); liked ? next.add(postId) : next.delete(postId); return next; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, p.likes + likesDelta) } : p));
    });
  }, [user, likedPosts]);

  const toggleSave = useCallback((postId: string) => {
    if (!user) return;
    const currentlySaved = savedPosts.has(postId);
    const result = dataService.toggleSave(postId, user.id, currentlySaved);
    setSavedPosts(prev => { const next = new Set(prev); result ? next.add(postId) : next.delete(postId); return next; });
  }, [user, savedPosts]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    const ok = await dataService.deletePost(postId);
    if (ok) setPosts(prev => prev.filter(p => p.id !== postId));
    return ok;
  }, []);

  const updatePost = useCallback(async (postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }): Promise<boolean> => {
    const ok = await dataService.updatePost(postId, updates);
    if (ok) setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
    return ok;
  }, []);

  const getPostsByCategory = useCallback((cat: string) => cat ? posts.filter(p => p.category === cat) : posts, [posts]);
  const getPostById = useCallback((id: string) => posts.find(p => p.id === id), [posts]);
  const getCommentsByPostId = useCallback((pid: string) => comments.filter(c => c.postId === pid), [comments]);

  const loadUserPosts = useCallback(async (userId: string) => dataService.loadUserPosts(userId), []);
  const loadUserLikedPosts = useCallback(async (userId: string) => dataService.loadUserLikedPosts(userId), []);

  const handleBanUser = useCallback(async (userId: string, until: string) => banUser(userId, until), []);
  const handleUnbanUser = useCallback(async (userId: string) => unbanUser(userId), []);
  const handleFetchAllProfiles = useCallback(async () => fetchAllProfiles(), []);
  const handleCreateAnnouncement = useCallback(async (post: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => createAnnouncement(post), []);

  return (
    <DataContext.Provider value={{
      posts, comments, likedPosts, savedPosts, loading, hasMore, totalCount, searchQuery, setSearchQuery,
      loadMore, addPost, addComment, toggleLike, toggleSave, deletePost, updatePost,
      getPostsByCategory, getPostById, getCommentsByPostId,
      loadUserPosts, loadUserLikedPosts, refreshAll, resetAndReload,
      banUser: handleBanUser, unbanUser: handleUnbanUser,
      fetchAllProfiles: handleFetchAllProfiles,
      createAnnouncement: handleCreateAnnouncement,
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
