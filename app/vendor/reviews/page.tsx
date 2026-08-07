'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Star, Flag, MessageSquare, BarChart2, AlertTriangle } from 'lucide-react';

interface Review {
  id: string;
  booking_id: string;
  property_id: string;
  guest_user_id: string;
  guest_name: string;
  rating: number;
  title: string;
  body: string;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  flagged: boolean;
  status: 'published' | 'hidden' | 'flagged';
  created_at: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

type StatusFilter = 'all' | 'needs_reply' | 'replied' | 'flagged';
type StarFilter = 'all' | '5' | '4' | '3' | 'below3';

export default function VendorReviewsPage() {
  const { selectedPropertyId } = useVendor();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyIds, setOpenReplyIds] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [flaggingIds, setFlaggingIds] = useState<Set<string>>(new Set());

  const loadReviews = useCallback(async () => {
    if (!selectedPropertyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('property_id', selectedPropertyId)
      .order('created_at', { ascending: false });

    if (error) console.error('Reviews fetch error:', error);
    setReviews((data as Review[]) || []);
    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Stats
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
  const repliedCount = reviews.filter((r) => r.vendor_reply).length;
  const responseRate =
    totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;

  // Filters
  const filtered = reviews.filter((r) => {
    // Star filter
    if (starFilter === '5' && r.rating !== 5) return false;
    if (starFilter === '4' && r.rating !== 4) return false;
    if (starFilter === '3' && r.rating !== 3) return false;
    if (starFilter === 'below3' && r.rating >= 3) return false;

    // Status filter
    if (statusFilter === 'needs_reply' && r.vendor_reply) return false;
    if (statusFilter === 'replied' && !r.vendor_reply) return false;
    if (statusFilter === 'flagged' && !r.flagged) return false;

    return true;
  });

  const toggleReply = (id: string) => {
    setOpenReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const postReply = async (reviewId: string) => {
    const body = replyDrafts[reviewId]?.trim();
    if (!body) return;

    setSubmittingIds((prev) => new Set(prev).add(reviewId));
    const { error } = await supabase
      .from('reviews')
      .update({ vendor_reply: body, vendor_reply_at: new Date().toISOString() })
      .eq('id', reviewId);

    setSubmittingIds((prev) => {
      const next = new Set(prev);
      next.delete(reviewId);
      return next;
    });

    if (!error) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, vendor_reply: body, vendor_reply_at: new Date().toISOString() }
            : r
        )
      );
      setReplyDrafts((prev) => { const next = { ...prev }; delete next[reviewId]; return next; });
      setOpenReplyIds((prev) => { const next = new Set(prev); next.delete(reviewId); return next; });
    }
  };

  const toggleFlag = async (review: Review) => {
    setFlaggingIds((prev) => new Set(prev).add(review.id));
    const newFlagged = !review.flagged;
    const { error } = await supabase
      .from('reviews')
      .update({ flagged: newFlagged, status: newFlagged ? 'flagged' : 'published' })
      .eq('id', review.id);

    setFlaggingIds((prev) => { const next = new Set(prev); next.delete(review.id); return next; });

    if (!error) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? { ...r, flagged: newFlagged, status: newFlagged ? 'flagged' : 'published' }
            : r
        )
      );
    }
  };

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Star className="w-12 h-12 text-ms-orange mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
          <p className="text-gray-500 font-medium">Select a property from the sidebar to manage reviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review Manager</h1>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={Math.round(avgRating)} size="sm" />
            <span className="text-gray-500 font-medium text-sm">
              {avgRating > 0 ? avgRating.toFixed(1) + ' avg' : 'No ratings yet'}{' '}
              {totalReviews > 0 && `across ${totalReviews} review${totalReviews !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Reviews */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-[#0f1f3d]/8 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#0f1f3d] dark:text-lime-500 dark:fill-lime-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Reviews</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{totalReviews}</p>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 dark:bg-transparent rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Rating</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-2xl font-black text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
              {avgRating > 0 && <StarRating rating={Math.round(avgRating)} size="sm" />}
            </div>
          </div>
        </div>

        {/* Response Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-ms-teal-light rounded-xl flex items-center justify-center dark:bg-transparent">
            <BarChart2 className="w-5 h-5 text-ms-teal" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Response Rate</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{responseRate}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-xl p-5 shadow-sm space-y-4">
        {/* Star Filter */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Filter by Stars</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'all', label: 'All' },
                { key: '5', label: '★★★★★' },
                { key: '4', label: '★★★★' },
                { key: '3', label: '★★★' },
                { key: 'below3', label: 'Below ★★★' },
              ] as { key: StarFilter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStarFilter(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  starFilter === key
                    ? 'bg-amber-400 text-white border-amber-400 dark:bg-ms-orange dark:border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-gray-700 dark:hover:border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-700">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Filter by Status</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'needs_reply', label: 'Needs Reply' },
                { key: 'replied', label: 'Replied' },
                { key: 'flagged', label: 'Flagged' },
              ] as { key: StatusFilter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  statusFilter === key
                    ? 'bg-[#0f1f3d] text-white border-[#0f1f3d] dark:bg-ms-orange'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0f1f3d]/40 hover:bg-[#0f1f3d]/5 dark:bg-zinc-700 dark:'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 font-bold animate-pulse">Loading reviews...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4 dark:bg-slate-700">
            <Star className="w-8 h-8 text-gray-400 dark:text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No reviews yet</h3>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">
            {reviews.length === 0
              ? 'Reviews from your guests will appear here once submitted.'
              : 'No reviews match the current filters. Try adjusting them above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const isOpen = openReplyIds.has(review.id);
            const isSubmitting = submittingIds.has(review.id);
            const isFlagging = flaggingIds.has(review.id);
            const draft = replyDrafts[review.id] || '';

            return (
              <div
                key={review.id}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
                  review.flagged ? 'border-rose-200' : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  {/* Review Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#0f1f3d] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(review.guest_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{review.guest_name}</span>
                          {review.flagged && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-black uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3" /> Flagged
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-gray-400 font-medium">
                            {new Date(review.created_at).toLocaleDateString([], {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flag Button */}
                    <button
                      onClick={() => toggleFlag(review)}
                      disabled={isFlagging}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 shrink-0 ${
                        review.flagged
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-rose-600 hover:border-rose-200'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {review.flagged ? 'Unflag' : 'Flag'}
                    </button>
                  </div>

                  {/* Review Content */}
                  <div className="mt-4">
                    {review.title && (
                      <p className="font-bold text-gray-900 text-sm mb-1">{review.title}</p>
                    )}
                    <p className="text-gray-600 text-sm leading-relaxed">{review.body}</p>
                  </div>

                  {/* Existing Reply */}
                  {review.vendor_reply && (
                    <div className="mt-4 ml-4 pl-4 border-l-2 border-[#c9a96e] bg-[#c9a96e]/5 rounded-r-lg py-3 pr-3">
                      <p className="text-xs font-bold text-[#c9a96e] uppercase tracking-wider mb-1.5">Your Reply</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.vendor_reply}</p>
                      {review.vendor_reply_at && (
                        <p className="text-[10px] text-gray-400 font-medium mt-1.5">
                          {new Date(review.vendor_reply_at).toLocaleDateString([], {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply Toggle */}
                  {!review.vendor_reply && !isOpen && (
                    <button
                      onClick={() => toggleReply(review.id)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ms-orange)] hover:bg-ms-orange-hover text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reply
                    </button>
                  )}

                  {/* Inline Reply Form */}
                  {isOpen && !review.vendor_reply && (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={draft}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        placeholder="Write your reply to this guest..."
                        rows={3}
                        className="w-full px-4 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30 focus:border-[#c9a96e] text-gray-800 placeholder-gray-400 resize-none transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => postReply(review.id)}
                          disabled={!draft.trim() || isSubmitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ms-orange)] hover:bg-ms-orange-hover text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {isSubmitting ? 'Posting...' : 'Post Reply'}
                        </button>
                        <button
                          onClick={() => toggleReply(review.id)}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Reply link (if already replied) */}
                  {review.vendor_reply && !isOpen && (
                    <button
                      onClick={() => {
                        setReplyDrafts((prev) => ({ ...prev, [review.id]: review.vendor_reply || '' }));
                        toggleReply(review.id);
                      }}
                      className="mt-3 text-xs font-semibold text-gray-400 hover:text-[#c9a96e] transition-colors underline underline-offset-2"
                    >
                      Edit reply
                    </button>
                  )}

                  {/* Edit reply form */}
                  {isOpen && review.vendor_reply && (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={draft}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-4 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30 focus:border-[#c9a96e] text-gray-800 placeholder-gray-400 resize-none transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => postReply(review.id)}
                          disabled={!draft.trim() || isSubmitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ms-orange)] hover:bg-ms-orange-hover text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {isSubmitting ? 'Updating...' : 'Update Reply'}
                        </button>
                        <button
                          onClick={() => toggleReply(review.id)}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
