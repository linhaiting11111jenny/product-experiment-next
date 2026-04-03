"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CONDITION_SUMMARIES,
  PRODUCT,
  REVIEWS,
  type Condition,
  normalizeCondition
} from "@/lib/reviews";

const REVIEWS_PER_PAGE = 5;

function starString(stars: number) {
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
}

async function trackEvent(payload: Record<string, unknown>) {
  try {
    await fetch("/api/experiment/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch {
    // Keep the experiment usable even if tracking fails.
  }
}

function trackEventOnExit(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/experiment/track", blob);
      return;
    }

    void fetch("/api/experiment/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      keepalive: true
    });
  } catch {
    // Ignore exit tracking failures.
  }
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ExperimentPage({
  condition: initialCondition,
  uid,
  returnUrl
}: {
  condition?: string;
  uid?: string;
  returnUrl?: string;
}) {
  const mountedRef = useRef(false);
  const sessionIdRef = useRef(createSessionId());
  const startAt = useRef(Date.now());
  const hiddenAtRef = useRef<number | null>(null);
  const totalHiddenMsRef = useRef(0);
  const reviewOpenedAtRef = useRef<number | null>(null);
  const reviewHiddenStartedAtRef = useRef<number | null>(null);
  const reviewHiddenMsRef = useRef(0);
  const maxScrollPercentRef = useRef(0);
  const exitSentRef = useRef(false);
  const [condition] = useState<Condition>(normalizeCondition(initialCondition));
  const [visibleCount, setVisibleCount] = useState(0);
  const [viewedReviews, setViewedReviews] = useState(false);
  const [loadMoreClicks, setLoadMoreClicks] = useState(0);
  const shownReviews = useMemo(() => REVIEWS.slice(0, visibleCount), [visibleCount]);

  useEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    void trackEvent({
      sessionId: sessionIdRef.current,
      uid,
      condition,
      event: "page_view",
      returnUrlPresent: Boolean(returnUrl)
    });
  }, [condition, returnUrl, uid]);

  useEffect(() => {
    const buildSessionSnapshot = () => {
      const now = Date.now();
      const hiddenMs =
        totalHiddenMsRef.current + (hiddenAtRef.current ? now - hiddenAtRef.current : 0);
      const elapsedMs = now - startAt.current;
      const visibleMs = Math.max(elapsedMs - hiddenMs, 0);

      const reviewOpenElapsedMs = reviewOpenedAtRef.current ? now - reviewOpenedAtRef.current : 0;
      const reviewHiddenMs =
        reviewHiddenMsRef.current +
        (reviewHiddenStartedAtRef.current ? now - reviewHiddenStartedAtRef.current : 0);
      const reviewVisibleMs = reviewOpenedAtRef.current
        ? Math.max(reviewOpenElapsedMs - reviewHiddenMs, 0)
        : 0;

      return {
        sessionId: sessionIdRef.current,
        uid,
        condition,
        loadMoreClicks,
        reviewPanelViewed: viewedReviews,
        returnUrlPresent: Boolean(returnUrl),
        elapsedSeconds: Math.round(elapsedMs / 1000),
        visibleSeconds: Math.round(visibleMs / 1000),
        hiddenSeconds: Math.round(hiddenMs / 1000),
        reviewOpenElapsedSeconds: Math.round(reviewOpenElapsedMs / 1000),
        reviewVisibleSeconds: Math.round(reviewVisibleMs / 1000),
        maxScrollPercent: Math.round(maxScrollPercentRef.current),
        visibleReviewCount: visibleCount
      };
    };

    const updateScrollDepth = () => {
      const viewport = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const scrollBottom = window.scrollY + viewport;
      const percent = fullHeight > 0 ? Math.min((scrollBottom / fullHeight) * 100, 100) : 0;
      maxScrollPercentRef.current = Math.max(maxScrollPercentRef.current, percent);
    };

    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        hiddenAtRef.current = now;

        if (reviewOpenedAtRef.current && !reviewHiddenStartedAtRef.current) {
          reviewHiddenStartedAtRef.current = now;
        }

        void trackEvent({
          event: "page_hidden",
          ...buildSessionSnapshot()
        });

        return;
      }

      if (hiddenAtRef.current) {
        totalHiddenMsRef.current += now - hiddenAtRef.current;
        hiddenAtRef.current = null;
      }

      if (reviewHiddenStartedAtRef.current) {
        reviewHiddenMsRef.current += now - reviewHiddenStartedAtRef.current;
        reviewHiddenStartedAtRef.current = null;
      }

      void trackEvent({
        event: "page_visible",
        ...buildSessionSnapshot()
      });
    };

    const handlePageExit = () => {
      if (exitSentRef.current) {
        return;
      }

      exitSentRef.current = true;
      updateScrollDepth();

      trackEventOnExit({
        event: "session_end",
        ...buildSessionSnapshot()
      });
    };

    updateScrollDepth();

    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, [condition, loadMoreClicks, returnUrl, uid, viewedReviews, visibleCount]);

  const getSessionSnapshot = () => {
    const now = Date.now();
    const hiddenMs =
      totalHiddenMsRef.current + (hiddenAtRef.current ? now - hiddenAtRef.current : 0);
    const elapsedMs = now - startAt.current;
    const visibleMs = Math.max(elapsedMs - hiddenMs, 0);

    const reviewOpenElapsedMs = reviewOpenedAtRef.current ? now - reviewOpenedAtRef.current : 0;
    const reviewHiddenMs =
      reviewHiddenMsRef.current +
      (reviewHiddenStartedAtRef.current ? now - reviewHiddenStartedAtRef.current : 0);
    const reviewVisibleMs = reviewOpenedAtRef.current
      ? Math.max(reviewOpenElapsedMs - reviewHiddenMs, 0)
      : 0;

    return {
      sessionId: sessionIdRef.current,
      uid,
      condition,
      loadMoreClicks,
      reviewPanelViewed: viewedReviews,
      returnUrlPresent: Boolean(returnUrl),
      elapsedSeconds: Math.round(elapsedMs / 1000),
      visibleSeconds: Math.round(visibleMs / 1000),
      hiddenSeconds: Math.round(hiddenMs / 1000),
      reviewOpenElapsedSeconds: Math.round(reviewOpenElapsedMs / 1000),
      reviewVisibleSeconds: Math.round(reviewVisibleMs / 1000),
      maxScrollPercent: Math.round(maxScrollPercentRef.current),
      visibleReviewCount: visibleCount
    };
  };

  const handleViewReviews = async () => {
    if (!reviewOpenedAtRef.current) {
      reviewOpenedAtRef.current = Date.now();
      if (document.hidden) {
        reviewHiddenStartedAtRef.current = Date.now();
      }
    }

    setViewedReviews(true);
    setVisibleCount(REVIEWS_PER_PAGE);

    await trackEvent({
      event: "view_reviews",
      ...getSessionSnapshot(),
      visibleReviewCount: REVIEWS_PER_PAGE
    });
  };

  const handleLoadMore = async () => {
    const nextClicks = loadMoreClicks + 1;
    setLoadMoreClicks(nextClicks);
    setVisibleCount((current) => Math.min(current + REVIEWS_PER_PAGE, REVIEWS.length));

    await trackEvent({
      event: "load_more",
      ...getSessionSnapshot(),
      loadMoreClicks: nextClicks,
      visibleReviewCount: Math.min(visibleCount + REVIEWS_PER_PAGE, REVIEWS.length)
    });
  };

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-4">
      <section className="mb-4 flex gap-6 rounded-lg bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] max-[860px]:flex-col">
        <div className="relative basis-[340px] overflow-hidden rounded-lg border border-[#eee] max-[860px]:basis-auto">
          <div className="relative aspect-square w-full bg-white p-3">
            <Image src="/product-watch.jpg" alt={PRODUCT.name} fill className="object-contain p-2" priority />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="mb-3 text-[24px] font-semibold text-[#111]">{PRODUCT.name}</h1>
          <div className="mb-4 inline-flex items-baseline gap-2 rounded-full bg-[#fff8ec] px-4 py-2 text-[#d68a00]">
            <span className="text-sm font-medium">零售价</span>
            <span className="text-[22px] font-bold text-[#ffa500]">{PRODUCT.price}</span>
          </div>

          <table className="w-full border-collapse text-sm">
            <tbody>
              {PRODUCT.details.map(([label, text]) => {
                let displayText: string = text;

                if (label === "显示与佩戴") {
                  displayText = "1.43英寸高清显示屏，轻量化设计，适合日常佩戴";
                }

                if (label === "健康监测") {
                  displayText = "支持全天候心率、血氧与睡眠分析，提供异常提醒";
                }

                return (
                <tr key={label} className="border-b border-[#eee]">
                  <td className="w-[120px] py-[10px] pr-4 align-top font-medium text-[#888]">{label}</td>
                  <td className="py-[10px] align-top text-[#333]">{displayText}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-[#e0e0e0] border-t-[4px] border-t-[#ffa500] bg-white p-5">
        <div className="mb-3 border-l-4 border-l-[#333] pl-[10px] text-lg font-semibold text-[#333]">
          商品评分
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[20px] text-[#ffa500]">★★★★☆</div>
          <div className="text-lg font-bold">{PRODUCT.averageRating.toFixed(1)} / 5</div>
          <div className="text-sm text-[#666]">基于 {PRODUCT.totalReviews} 位真实用户评价</div>
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-[#e0e0e0] bg-white p-5">
        {condition === "rating" ? (
          <>
            <div className="mb-[15px] border-l-4 border-l-[#ffa500] pl-[10px] text-lg font-semibold text-[#ffa500]">
              评分分布详情
            </div>

            <div className="flex flex-col gap-3">
              {PRODUCT.distribution.map((item) => (
                <div key={item.star} className="flex items-center gap-[10px]">
                  <div className="w-10 text-[13px] text-[#666]">{item.star}星</div>
                  <div className="h-3 flex-1 overflow-hidden rounded-md bg-[#eee]">
                    <div
                      className="h-full bg-[#ffa500]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-[13px] text-[#666]">{item.percent}%</div>
                </div>
              ))}
              <div className="mt-[15px] text-[13px] italic text-[#666]">以上是详细的评分分布。</div>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-[#f3cb88] bg-[linear-gradient(135deg,#fff8ec_0%,#fffdf8_55%,#fff4df_100%)] shadow-[0_10px_22px_rgba(255,165,0,0.1)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#f1d5a1] px-5 py-4 max-[640px]:flex-col max-[640px]:items-start">
              <div className="border-l-4 border-l-[#ffa500] pl-[10px] text-lg font-semibold text-[#333]">
                AI评论总结
              </div>
              <div className="rounded-full border border-[#f0cb87] bg-white/85 px-3 py-1 text-sm text-[#cf8a12]">
                基于用户原始评论生成
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="rounded-[14px] border border-dashed border-[#efc983] bg-white/80 p-[18px] text-base leading-8 text-[#6a5430]">
                {CONDITION_SUMMARIES[condition]}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="my-[30px] text-center">
        {!viewedReviews ? (
          <button
            type="button"
            onClick={handleViewReviews}
            className="cursor-pointer rounded-[25px] border-none bg-[#ffa500] px-10 py-3 text-base font-medium text-white transition hover:bg-[#e69500]"
          >
            查看用户原始评论
          </button>
        ) : null}
      </div>

      <section className={`mb-[30px] rounded-lg bg-white p-[30px] ${viewedReviews ? "block" : "hidden"}`}>
        <div className="mb-[15px] border-l-4 border-l-[#333] pl-[10px] text-lg font-semibold text-[#333]">
          用户评论详情
        </div>

        <div>
          {shownReviews.map((review, index) => (
            <div key={`${review.title}-${index}`} className="border-b border-[#eee] py-5">
              <div className="mb-[5px] text-[#ffa500]">{starString(review.stars)}</div>
              <div className="mb-2 font-semibold">{review.title}</div>
              <div className="text-sm text-[#555]">{review.content}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center">
          {visibleCount < REVIEWS.length ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="cursor-pointer rounded border border-[#ffa500] bg-[#fff8ec] px-5 py-2 font-medium text-[#d68a00] transition hover:bg-[#ffefcc]"
            >
              点击加载更多评论
            </button>
          ) : null}
        </div>
      </section>

      <div className="mb-10 rounded-lg border border-[#f1d7a3] bg-[#fff8eb] px-5 py-4 text-center text-[15px] leading-7 text-[#9b6d17]">
        阅读完成后，请手动关闭当前商品详情页，并返回问卷继续作答。
      </div>

    </div>
  );
}
