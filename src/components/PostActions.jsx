import { Link } from "react-router-dom";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import * as api from "../services/api";

export default function PostActions({ post, onError }) {
  const run = (fn) => { try { fn(); } catch (e) { onError?.(e.message); } };
  const base = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition";
  const idle = "text-muted hover:bg-cloud hover:text-ink";
  const own = post.ownerId === api.me().id;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button onClick={() => run(() => api.toggleLike(post.id))} aria-pressed={post.liked} className={`${base} ${post.liked ? "bg-violet-50 text-violet" : idle}`}>
        <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
      </button>
      <Link to={`/publicacao/${post.id}`} className={`${base} ${idle}`}><MessageCircle className="h-4 w-4" /> {post.comments}</Link>
      <button onClick={() => run(() => api.toggleRepost(post.id))} disabled={own} aria-pressed={post.reposted} title={own ? "Você não pode repostar o próprio projeto" : "Repostar"}
        className={`${base} ${post.reposted ? "bg-approved-bg text-approved" : idle} disabled:cursor-not-allowed disabled:opacity-40`}>
        <Repeat2 className="h-4 w-4" /> {post.reposts}
      </button>
    </div>
  );
}
