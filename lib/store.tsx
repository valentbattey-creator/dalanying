"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { dataService, syncSeedToSupabase, type Post, type Comment } from "./data";

export type { Post, Comment };

interface DataState {
  posts: Post[];
  comments: Comment[];
  likedPosts: Set<string>;
  savedPosts: Set<string>;
  loading: boolean;
  addPost: (post: Omit<Post, "id" | "likes" | "comments" | "createdAt" | "authorId">) => Promise<void>;
  addComment: (postId: string, content: string) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  getPostsByCategory: (category: string) => Post[];
  getPostById: (id: string) => Post | undefined;
  getCommentsByPostId: (postId: string) => Comment[];
  refreshPosts: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Load data on mount and when user changes
  const refreshPosts = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      dataService.loadPosts(),
      dataService.loadComments(),
    ]);
    setPosts(p);
    setComments(c);
    if (user) {
      setLikedPosts(dataService.loadLikedPosts(user.id));
      setSavedPosts(dataService.loadSavedPosts(user.id));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refreshPosts();
    }
  }, [refreshPosts]);

  // Sync seed data to Supabase when user logs in and DB is empty
  useEffect(() => {
    if (user) {
      syncSeedToSupabase(user.id).then((synced) => {
        if (synced) refreshPosts();
      });
    }
  }, [user]);

  const addPost = useCallback(async (p: Omit<Post, "id" | "likes" | "comments" | "createdAt" | "authorId">) => {
    if (!user) return;
    const newPost = await dataService.createPost({
      ...p,
      author: user.name,
      authorId: user.id,
    });
    setPosts((prev) => [newPost, ...prev]);
  }, [user]);

  const addComment = useCallback((postId: string, content: string) => {
    if (!user) return;
    dataService.createComment(postId, user.name, user.id, content).then((comment) => {
      setComments((prev) => [...prev, comment]);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
      );
    });
  }, [user]);

  const toggleLike = useCallback((postId: string) => {
    if (!user) return;
    const currentlyLiked = likedPosts.has(postId);
    dataService.toggleLike(postId, user.id, currentlyLiked).then((result) => {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        result.liked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: result.likes } : p))
      );
    });
  }, [user, likedPosts]);

  const toggleSave = useCallback((postId: string) => {
    if (!user) return;
    const currentlySaved = savedPosts.has(postId);
    const result = dataService.toggleSave(postId, user.id, currentlySaved);
    setSavedPosts((prev) => {
      const next = new Set(prev);
      result ? next.add(postId) : next.delete(postId);
      return next;
    });
  }, [user, savedPosts]);

  const getPostsByCategory = useCallback(
    (cat: string) => (cat ? posts.filter((p) => p.category === cat) : posts),
    [posts]
  );
  const getPostById = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);
  const getCommentsByPostId = useCallback(
    (pid: string) => comments.filter((c) => c.postId === pid),
    [comments]
  );

  return (
    <DataContext.Provider
      value={{
        posts,
        comments,
        likedPosts,
        savedPosts,
        loading,
        addPost,
        addComment,
        toggleLike,
        toggleSave,
        getPostsByCategory,
        getPostById,
        getCommentsByPostId,
        refreshPosts,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}
