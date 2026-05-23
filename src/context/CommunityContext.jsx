import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useApp } from './AppContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';
import {
  SAMPLE_POSTS, SHOWCASE_PROJECTS, STUDY_BUDDIES, SUCCESS_STORIES,
} from '../data/community.js';

const CommunityContext = createContext(null);

const DEFAULT_STATE = {
  // user-authored content
  posts: [],
  replies: {},          // { [postId]: [reply, ...] } (user replies; seed replies live on post objects)
  showcases: [],
  successStories: [],
  // social
  buddy: null,          // { buddyId, addedAt, lastCheckIn, sharedProgress }
  bookmarks: {},        // { [postId]: true }
  upvotes: {},          // { [`p-${id}`]: true, [`r-${id}`]: true, [`s-${id}`]: true, [`ss-${id}`]: true }
  hearts: {},           // success-story hearts
  solutions: {},        // { [postId]: replyId }
  daily: {},            // { 'YYYY-MM-DD': { studied: bool, buddyId } }
  reports: {},          // { [postId]: reason }
  helpfulReplyCount: 0, // total upvotes I've received on my replies (synthetic)
  isMentor: false,
};

export function CommunityProvider({ children }) {
  const { profile } = useApp();
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::community`, DEFAULT_STATE);

  // ---------- snapshot for GamificationContext ----------
  useEffect(() => {
    const postsAuthored = state.posts.length;
    const helpfulReplies = state.helpfulReplyCount;
    const isMentor = state.isMentor;
    window.__community_snapshot = { postsAuthored, helpfulReplies, isMentor };
    return () => { delete window.__community_snapshot; };
  }, [state]);

  // ---------- merged feeds (seed + user-authored) ----------
  const allPosts = useMemo(() => {
    const userPosts = state.posts.map((p) => ({ ...p, isMine: true }));
    return [...userPosts, ...SAMPLE_POSTS].sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.posts]);

  const allShowcases = useMemo(() => {
    return [...state.showcases.map((s) => ({ ...s, isMine: true })), ...SHOWCASE_PROJECTS]
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.showcases]);

  const allSuccess = useMemo(() => {
    return [...state.successStories.map((s) => ({ ...s, isMine: true })), ...SUCCESS_STORIES]
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.successStories]);

  // ---------- helpers ----------
  const me = useCallback(() => ({
    id: 'me', name: profile?.name || 'You',
    country_flag: '🇬🇭', isMe: true,
  }), [profile?.name]);

  // ---------- forum ----------
  const addPost = useCallback((p) => {
    setState((s) => ({
      ...s,
      posts: [{ id: uid(), at: new Date().toISOString(), author: me(), upvotes: 0, replies: [], tags: [], ...p }, ...s.posts],
    }));
  }, [setState, me]);

  const addReply = useCallback((postId, body) => {
    setState((s) => {
      const reply = { id: uid(), at: new Date().toISOString(), author: me(), body, upvotes: 0 };
      // user replies live in replies map; we'll surface them in the merged view
      return {
        ...s,
        replies: { ...s.replies, [postId]: [...(s.replies[postId] || []), reply] },
      };
    });
  }, [setState, me]);

  const togglePostUpvote = useCallback((postId) => {
    setState((s) => {
      const key = `p-${postId}`;
      const on = !s.upvotes[key];
      const ups = { ...s.upvotes, [key]: on };
      if (!on) delete ups[key];
      return { ...s, upvotes: ups };
    });
  }, [setState]);

  const toggleReplyUpvote = useCallback((replyId) => {
    setState((s) => {
      const key = `r-${replyId}`;
      const on = !s.upvotes[key];
      const ups = { ...s.upvotes, [key]: on };
      if (!on) delete ups[key];
      // Track synthetic helpful-reply count
      const helpful = Math.max(0, s.helpfulReplyCount + (on ? 1 : -1));
      return { ...s, upvotes: ups, helpfulReplyCount: helpful };
    });
  }, [setState]);

  const markSolution = useCallback((postId, replyId) => {
    setState((s) => ({ ...s, solutions: { ...s.solutions, [postId]: replyId } }));
  }, [setState]);

  const toggleBookmark = useCallback((postId) => {
    setState((s) => {
      const next = { ...s.bookmarks };
      if (next[postId]) delete next[postId]; else next[postId] = true;
      return { ...s, bookmarks: next };
    });
  }, [setState]);

  const reportPost = useCallback((postId, reason = 'inappropriate') => {
    setState((s) => ({ ...s, reports: { ...s.reports, [postId]: reason } }));
  }, [setState]);

  const repliesFor = useCallback((post) => {
    const seed = post.replies || [];
    const mine = state.replies[post.id] || [];
    return [...seed, ...mine];
  }, [state.replies]);

  // ---------- showcase ----------
  const addShowcase = useCallback((sc) => {
    setState((s) => ({
      ...s,
      showcases: [{ id: uid(), at: new Date().toISOString(), author: me(), upvotes: 0, comments: 0, tags: [], ...sc }, ...s.showcases],
    }));
  }, [setState, me]);

  const toggleShowcaseUpvote = useCallback((id) => {
    setState((s) => {
      const key = `s-${id}`;
      const on = !s.upvotes[key];
      const ups = { ...s.upvotes, [key]: on };
      if (!on) delete ups[key];
      return { ...s, upvotes: ups };
    });
  }, [setState]);

  // ---------- success stories ----------
  const addSuccess = useCallback((ss) => {
    setState((s) => ({
      ...s,
      successStories: [{ id: uid(), at: new Date().toISOString(), author: me(), hearts: 0, comments: 0, ...ss }, ...s.successStories],
    }));
  }, [setState, me]);

  const toggleHeart = useCallback((id) => {
    setState((s) => {
      const key = `h-${id}`;
      const on = !s.hearts[key];
      const hearts = { ...s.hearts, [key]: on };
      if (!on) delete hearts[key];
      return { ...s, hearts };
    });
  }, [setState]);

  // ---------- buddy + daily check-in ----------
  const buddies = useMemo(() => {
    return STUDY_BUDDIES.map((b) => ({ ...b, isMyBuddy: state.buddy?.buddyId === b.id }));
  }, [state.buddy]);

  const setBuddy = useCallback((buddyId) => {
    setState((s) => ({ ...s, buddy: { buddyId, addedAt: new Date().toISOString(), lastCheckIn: null, sharedProgress: true } }));
  }, [setState]);

  const clearBuddy = useCallback(() => {
    setState((s) => ({ ...s, buddy: null }));
  }, [setState]);

  const checkInToday = useCallback((studied = true) => {
    const today = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      daily: { ...s.daily, [today]: { studied, buddyId: s.buddy?.buddyId } },
      buddy: s.buddy ? { ...s.buddy, lastCheckIn: new Date().toISOString() } : s.buddy,
    }));
  }, [setState]);

  const toggleMentor = useCallback(() => {
    setState((s) => ({ ...s, isMentor: !s.isMentor }));
  }, [setState]);

  const resetCommunity = useCallback(() => setState(DEFAULT_STATE), [setState]);

  const value = useMemo(() => ({
    state,
    // forum
    allPosts,
    addPost, addReply, togglePostUpvote, toggleReplyUpvote,
    markSolution, toggleBookmark, reportPost, repliesFor,
    // showcase
    allShowcases, addShowcase, toggleShowcaseUpvote,
    // success
    allSuccess, addSuccess, toggleHeart,
    // buddy
    buddies, setBuddy, clearBuddy, checkInToday,
    // mentor
    toggleMentor,
    // reset
    resetCommunity,
  }), [
    state, allPosts, allShowcases, allSuccess, buddies,
    addPost, addReply, togglePostUpvote, toggleReplyUpvote,
    markSolution, toggleBookmark, reportPost, repliesFor,
    addShowcase, toggleShowcaseUpvote, addSuccess, toggleHeart,
    setBuddy, clearBuddy, checkInToday, toggleMentor, resetCommunity,
  ]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider');
  return ctx;
}
