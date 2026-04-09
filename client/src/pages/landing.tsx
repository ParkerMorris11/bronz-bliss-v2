import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import {
  Star,
  Clock,
  DollarSign,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { Service, BusinessSettings } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  name: string;
  text: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const REVIEWS: Review[] = [
  {
    name: "Tess",
    text: "I have never had so much fun getting a spray tan before! Izzy made me feel so comfortable and gave me lots of options+extras (stickers? Setting powder with sparkles? Absolutely yes). Her before care and after care instructions were so so helpful. Finally, my tan turned out SO GOOD! I can't put into words how much I love it and how perfect it turned out. I got exactly the right shade I wanted and I feel on top of the world. I will 100% be going back to her soon, and referring all my friends too!",
  },
  {
    name: "Kapri",
    text: "She is absolutely the sweetest girl ever! and i trusted her fully and i'm in love with my spray tan! exactly what i wanted",
  },
  {
    name: "Madi",
    text: "I love this tan! It is very natural looking and will be perfect for my wedding day!",
  },
  {
    name: "Rainy",
    text: "This was the best first spray tan experience OMG! Her house is so well put together and she is so nice :) She answered all of my questions and helped me pose for optimal results. HIGHLY RECOMMEND",
  },
  {
    name: "Katie",
    text: "I got to try Izzy's new tanning solution and it is PHENOMENAL! I am so happy with how dark it is. And it looks so natural, there's no orange hues at all! This is by far my favorite spray tan I've ever got, I'm obsessed!!",
  },
];

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-amber-400 text-amber-400"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ServiceCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 space-y-3 bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 animate-pulse">
      <div className="h-5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-2/3" />
      <div className="h-3 bg-amber-100/60 dark:bg-amber-900/20 rounded-full w-full" />
      <div className="h-3 bg-amber-100/60 dark:bg-amber-900/20 rounded-full w-4/5" />
      <div className="flex gap-4 pt-2">
        <div className="h-4 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-16" />
        <div className="h-4 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-16" />
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, #fef3c7 0%, #fde68a 25%, #fbbf24 55%, #f59e0b 80%, #d97706 100%)",
      }}
      aria-label="Hero"
    >
      {/* Blur orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(253,186,116,0.9) 0%, rgba(251,191,36,0.3) 60%, transparent 100%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(217,119,6,0.8) 0%, rgba(245,158,11,0.2) 60%, transparent 100%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -bottom-16 left-1/4 w-[360px] h-[360px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.8) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
        {/* Glass shimmer overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.08) 100%)",
          }}
        />
      </div>

      {/* Logo mark */}
      <div className="relative z-10 mb-6">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 32px rgba(217,119,6,0.2)",
          }}
          aria-hidden="true"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-label="BRONZ Bliss logo mark"
          >
            {/* Sun rays */}
            <circle cx="16" cy="16" r="6" fill="rgba(180,83,9,0.9)" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="rgba(180,83,9,0.5)" strokeWidth="1.5" strokeDasharray="3 3" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 16 + 10 * Math.cos(rad);
              const y1 = 16 + 10 * Math.sin(rad);
              const x2 = 16 + 13 * Math.cos(rad);
              const y2 = 16 + 13 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(180,83,9,0.8)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Headline */}
      <div className="relative z-10 px-6 max-w-4xl mx-auto">
        <div
          className="inline-block text-xs font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-5"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "rgba(120,53,15,0.9)",
          }}
        >
          Cedar City's Premier Spray Tan Studio
        </div>

        <h1
          className="font-black leading-none mb-4 text-amber-950"
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: "clamp(3.5rem, 10vw, 8rem)",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 20px rgba(120,53,15,0.15)",
          }}
        >
          BRONZ
          <span
            className="block italic font-light"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
              color: "rgba(120,53,15,0.7)",
              letterSpacing: "0.05em",
            }}
          >
            Bliss
          </span>
        </h1>

        <p
          className="text-amber-900/80 mb-10 mx-auto"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            maxWidth: "52ch",
            lineHeight: 1.7,
          }}
        >
          Custom airbrush tanning that looks natural, feels luxurious, and lasts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#/book"
            data-testid="link-hero-book"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, rgba(120,53,15,0.9) 0%, rgba(146,64,14,0.95) 100%)",
              boxShadow:
                "0 4px 20px rgba(120,53,15,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              fontSize: "1rem",
            }}
          >
            <Calendar className="w-4 h-4" />
            Book Now
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#/onboard/start"
            data-testid="link-hero-quiz"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "rgba(120,53,15,0.95)",
              boxShadow: "0 4px 16px rgba(120,53,15,0.1)",
              fontSize: "1rem",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Take the Quiz
          </a>
        </div>
      </div>

      {/* Scroll nudge */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-60"
        aria-hidden="true"
      >
        <span className="text-xs text-amber-900 tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-amber-800/60 to-transparent" />
      </div>
    </section>
  );
}

function ServicesSection() {
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/public/services"],
    queryFn: () => apiRequest("GET", "/api/public/services").then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <section
      id="services"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(180deg, #fffbeb 0%, #fef9f0 60%, #fffdf7 100%)",
      }}
      aria-label="Services"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <span
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-3"
          >
            What We Offer
          </span>
          <h2
            className="font-black text-amber-950 leading-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            Services & Pricing
          </h2>
          <p className="mt-3 text-amber-800/70 mx-auto" style={{ maxWidth: "48ch" }}>
            Every session is tailored to your skin tone, your event, and your vibe.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))
            : services && services.length > 0
            ? services.filter((s) => s.isActive).map((service) => (
                <div
                  key={service.id}
                  data-testid={`card-service-${service.id}`}
                  className="group relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,251,235,0.9))",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    boxShadow:
                      "0 2px 16px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}
                >
                  {/* Glass top accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)",
                    }}
                    aria-hidden="true"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className="font-bold text-amber-950 leading-tight"
                        style={{
                          fontFamily: "'Cabinet Grotesk', sans-serif",
                          fontSize: "clamp(1.05rem, 2vw, 1.2rem)",
                        }}
                      >
                        {service.name}
                      </h3>
                      <span
                        className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(251,191,36,0.15)",
                          color: "rgba(120,53,15,0.9)",
                          border: "1px solid rgba(251,191,36,0.3)",
                        }}
                      >
                        {service.category}
                      </span>
                    </div>

                    {service.description && (
                      <p className="text-sm text-amber-800/70 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-100/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                        {service.price % 1 === 0
                          ? service.price.toFixed(0)
                          : service.price.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-amber-700/70">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {service.duration} min
                      </span>
                    </div>
                    <a
                      href="#/book"
                      data-testid={`link-book-service-${service.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-xl transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.2))",
                        color: "rgba(120,53,15,0.95)",
                        border: "1px solid rgba(251,191,36,0.35)",
                      }}
                    >
                      Book This
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            : (
              // Fallback when no services loaded
              <div className="col-span-full text-center py-12 text-amber-700/60">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>Services coming soon. <a href="#/book" className="underline">Book a consultation</a>.</p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  return (
    <section
      id="reviews"
      className="py-24 px-6 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #fef3c7 0%, #fde68a 40%, #fef3c7 100%)",
      }}
      aria-label="Client Reviews"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-amber-700 mb-3">
            Real Clients, Real Results
          </span>
          <h2
            className="font-black text-amber-950 leading-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            What They're Saying
          </h2>
        </div>

        {/* Horizontal scroll on mobile, 3-col grid on desktop */}
        <div
          className="flex lg:grid lg:grid-cols-3 gap-5 overflow-x-auto pb-4 lg:overflow-x-visible lg:pb-0 snap-x snap-mandatory lg:snap-none"
          style={{ scrollbarWidth: "none" }}
        >
          {REVIEWS.map((review, idx) => (
            <div
              key={idx}
              data-testid={`card-review-${idx}`}
              className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-auto snap-start rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow:
                  "0 4px 24px rgba(217,119,6,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              {/* Giant quote mark */}
              <div
                className="text-5xl font-black leading-none select-none"
                style={{ color: "rgba(245,158,11,0.3)", fontFamily: "Georgia, serif" }}
                aria-hidden="true"
              >
                "
              </div>

              <p
                className="text-amber-900/80 leading-relaxed flex-1 -mt-4"
                style={{ fontSize: "clamp(0.875rem, 1.5vw, 0.95rem)" }}
              >
                {review.text}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-amber-200/50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-amber-900"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(251,191,36,0.4), rgba(245,158,11,0.3))",
                      border: "1px solid rgba(251,191,36,0.4)",
                    }}
                    aria-hidden="true"
                  >
                    {review.name[0]}
                  </div>
                  <span
                    className="font-semibold text-amber-950"
                    style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
                  >
                    {review.name}
                  </span>
                </div>
                <StarRow />
              </div>
            </div>
          ))}
        </div>

        {/* Scroll hint on mobile */}
        <p className="text-center text-xs text-amber-700/50 mt-4 lg:hidden" aria-hidden="true">
          Swipe to see more →
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Book Online",
      description:
        "Choose your service, pick a time that works for you, and you're set. Booking takes under two minutes.",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      number: "02",
      title: "Get Bronzed",
      description:
        "Arrive at Izzy's private studio in Cedar City. She'll consult on your ideal shade, customize the formula, and airbrush you to perfection.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Glow Confidently",
      description:
        "Walk out with a flawless, natural-looking tan. Full aftercare instructions included so your color lasts beautifully.",
      icon: <Sparkles className="w-6 h-6" />,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 px-6"
      style={{ background: "#fffdf7" }}
      aria-label="How It Works"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-3">
            Simple Process
          </span>
          <h2
            className="font-black text-amber-950 leading-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            How It Works
          </h2>
          <p className="mt-3 text-amber-800/70 mx-auto" style={{ maxWidth: "50ch" }}>
            A private, comfortable experience designed entirely around you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden md:block absolute top-12 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(251,191,36,0.4) 20%, rgba(245,158,11,0.5) 50%, rgba(251,191,36,0.4) 80%, transparent)",
            }}
            aria-hidden="true"
          />

          {steps.map((step, i) => (
            <div
              key={i}
              data-testid={`step-${i + 1}`}
              className="relative flex flex-col items-center text-center md:items-center"
            >
              {/* Step circle */}
              <div
                className="relative z-10 w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-6 text-amber-900 transition-transform duration-300 hover:scale-105"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(251,191,36,0.3), rgba(245,158,11,0.2))",
                  border: "1.5px solid rgba(251,191,36,0.45)",
                  boxShadow:
                    "0 4px 20px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                {step.icon}
                <span
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: "rgba(120,53,15,0.85)" }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              </div>

              <h3
                className="font-bold text-amber-950 mb-2"
                style={{
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: "1.15rem",
                }}
              >
                {step.title}
              </h3>
              <p className="text-sm text-amber-800/70 leading-relaxed" style={{ maxWidth: "28ch", margin: "0 auto" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA nudge */}
        <div className="flex justify-center mt-14">
          <a
            href="#/book"
            data-testid="link-how-it-works-book"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]"
            style={{
              background:
                "linear-gradient(135deg, #b45309, #d97706)",
              boxShadow: "0 4px 16px rgba(180,83,9,0.25)",
              fontSize: "0.95rem",
            }}
          >
            <Calendar className="w-4 h-4" />
            Book Your Session
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function LocationSection() {
  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/public/settings"],
    queryFn: () => apiRequest("GET", "/api/public/settings").then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  });

  let parsedHours: Record<string, { open: string; close: string } | null> | null = null;
  if (settings?.operatingHours) {
    try {
      parsedHours = JSON.parse(settings.operatingHours);
    } catch {
      parsedHours = null;
    }
  }

  const address = "668 E Fiddlers Cove Dr Unit 60, Cedar City, UT 84721";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section
      id="location"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(160deg, #fef9f0 0%, #fffbeb 100%)",
      }}
      aria-label="Location and Hours"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-3">
            Come Find Us
          </span>
          <h2
            className="font-black text-amber-950 leading-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            Location & Hours
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Address card */}
          <div
            className="rounded-2xl p-8 flex flex-col gap-5"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(251,191,36,0.2)",
              boxShadow: "0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))",
                  border: "1px solid rgba(251,191,36,0.3)",
                }}
              >
                <MapPin className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-amber-600 mb-1">
                  Studio Address
                </p>
                <p
                  className="font-semibold text-amber-950 leading-snug"
                  style={{ fontSize: "1rem" }}
                  data-testid="text-address"
                >
                  668 E Fiddlers Cove Dr<br />
                  Unit 60<br />
                  Cedar City, UT 84721
                </p>
              </div>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-maps"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open in Google Maps
              <ChevronRight className="w-3.5 h-3.5" />
            </a>

            {/* Map placeholder */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ height: "180px", background: "linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.08))", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col items-center justify-center gap-2 text-amber-700/60 hover:text-amber-700 transition-colors"
                aria-label="View on Google Maps"
              >
                <MapPin className="w-8 h-8 opacity-40" />
                <span className="text-sm font-medium">Cedar City, Utah</span>
                <span className="text-xs opacity-60">Click to view on map</span>
              </a>
            </div>
          </div>

          {/* Hours card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(251,191,36,0.2)",
              boxShadow: "0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))",
                  border: "1px solid rgba(251,191,36,0.3)",
                }}
              >
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase text-amber-600">
                Operating Hours
              </p>
            </div>

            {parsedHours ? (
              <ul className="space-y-2.5" data-testid="list-hours">
                {DAY_ORDER.map((day) => {
                  const hours = parsedHours![day];
                  return (
                    <li
                      key={day}
                      className="flex items-center justify-between py-2 border-b border-amber-100/60 last:border-0"
                      data-testid={`hours-${day}`}
                    >
                      <span className="text-sm font-medium text-amber-900">
                        {DAY_LABELS[day]}
                      </span>
                      <span className="text-sm text-amber-800/70">
                        {hours
                          ? `${formatTime(hours.open)} – ${formatTime(hours.close)}`
                          : <span className="text-amber-500/70 italic">Closed</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="space-y-2.5">
                {/* Skeleton while loading */}
                {DAY_ORDER.map((day) => (
                  <div key={day} className="flex justify-between py-2 border-b border-amber-100/60 last:border-0">
                    <div className="h-4 bg-amber-100/80 rounded-full w-24 animate-pulse" />
                    <div className="h-4 bg-amber-100/80 rounded-full w-28 animate-pulse" />
                  </div>
                ))}
                <p className="text-xs text-amber-600/60 mt-2 italic">
                  Loading hours… or contact Izzy directly to book!
                </p>
              </div>
            )}

            {settings?.phone && (
              <a
                href={`tel:${settings.phone}`}
                data-testid="link-phone"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                <span>📞</span>
                {settings.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section
      className="relative py-28 px-6 overflow-hidden text-center"
      style={{
        background:
          "linear-gradient(145deg, #fbbf24 0%, #f59e0b 35%, #d97706 70%, #b45309 100%)",
      }}
      aria-label="Call to Action"
    >
      {/* Decorative orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)", filter: "blur(50px)" }}
        />
        <div
          className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.15em] uppercase mb-6"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.35)",
            color: "rgba(120,53,15,0.95)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Cedar City's Favorite Spray Tan
        </div>

        <h2
          className="font-black text-amber-950 mb-4"
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: "clamp(2.2rem, 6vw, 4rem)",
            letterSpacing: "-0.025em",
            textShadow: "0 2px 12px rgba(255,255,255,0.3)",
          }}
        >
          Ready to Glow?
        </h2>

        <p
          className="text-amber-900/80 mb-10 mx-auto"
          style={{ maxWidth: "42ch", fontSize: "clamp(1rem, 2vw, 1.15rem)" }}
        >
          Book your session today and walk out feeling like the most confident version of yourself.
        </p>

        <a
          href="#/book"
          data-testid="link-footer-book"
          className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-amber-800 transition-all duration-200 hover:scale-[1.04] hover:shadow-2xl active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow:
              "0 8px 32px rgba(120,53,15,0.25), inset 0 1px 0 rgba(255,255,255,0.95)",
            fontSize: "1.05rem",
          }}
        >
          <Calendar className="w-5 h-5" />
          Book Your Appointment
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="py-8 px-6 text-center"
      style={{ background: "#1c1009" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span
          className="font-black text-amber-400 tracking-tight"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "1.1rem" }}
        >
          BRONZ Bliss
        </span>
        <p className="text-xs text-amber-100/40">
          © 2026 BRONZ Bliss. Cedar City, UT.
        </p>
        <div className="flex items-center gap-4 text-xs text-amber-100/40">
          <a href="#/book" className="hover:text-amber-400 transition-colors">
            Book Now
          </a>
          <span aria-hidden="true">·</span>
          <a href="#/onboard/start" className="hover:text-amber-400 transition-colors">
            New Client Quiz
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: "rgba(255,251,235,0.75)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(251,191,36,0.2)",
      }}
      aria-label="Primary navigation"
    >
      <a
        href="#/"
        className="font-black text-amber-950 tracking-tight hover:opacity-80 transition-opacity"
        style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "1.15rem" }}
        aria-label="BRONZ Bliss home"
      >
        BRONZ <span className="font-light italic text-amber-700">Bliss</span>
      </a>

      <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-amber-800/80">
        <a
          href="#services"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:text-amber-950 transition-colors"
        >
          Services
        </a>
        <a
          href="#reviews"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:text-amber-950 transition-colors"
        >
          Reviews
        </a>
        <a
          href="#location"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("location")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:text-amber-950 transition-colors"
        >
          Location
        </a>
      </div>

      <a
        href="#/book"
        data-testid="link-nav-book"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg, #b45309, #d97706)",
          boxShadow: "0 2px 10px rgba(180,83,9,0.3)",
        }}
      >
        <Calendar className="w-3.5 h-3.5" />
        Book Now
      </a>
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="min-h-screen font-sans"
      style={{ overflowX: "hidden" }}
      data-testid="page-landing"
    >
      {/* Cabinet Grotesk from Fontshare */}
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800,900&display=swap');
      `}</style>

      <LandingNav />

      <main>
        <HeroSection />
        <ServicesSection />
        <ReviewsSection />
        <HowItWorksSection />
        <LocationSection />
        <FooterCTA />
      </main>

      <Footer />
    </div>
  );
}
