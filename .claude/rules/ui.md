# UI Conventions — Bronz Bliss

## Design identity
- **Brand:** warm, glowing, luxe-but-approachable tanning salon
- **Primary color:** amber/bronze — maps to Tailwind `primary` (configured in CSS variables)
- **Fonts:** Cabinet Grotesk for headings (`style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}`), Satoshi for body
- **Surfaces:** `bg-stone-50` for page backgrounds, `bg-white` for cards
- **Muted text:** `text-stone-400` or `text-muted-foreground` — never `text-stone-950` for secondary text (that's near-black)
- **Borders:** `border-stone-200` default, `border-primary/20` for branded accents

## shadcn/ui usage
- Use shadcn primitives from `@/components/ui/*` for all interactive elements
- Never build custom inputs, buttons, selects, dialogs — extend shadcn instead
- Prefer composition (`CardHeader`, `CardContent`, `CardTitle`) over raw divs for card layouts
- Use `Skeleton` for loading states, not spinners

## Tailwind patterns
```
Page wrapper:        max-w-2xl mx-auto px-4 py-8 space-y-6
Card section:        Card > CardHeader + CardContent
Form field:          div.space-y-1.5 > Label + Input
Muted description:   text-xs text-muted-foreground
Section heading:     text-xl font-bold (Cabinet Grotesk)
Badge accents:       bg-primary/5 border-primary/20 text-primary
Icon + title row:    flex items-center gap-2
```

## Color usage
```
Primary action:      bg-primary text-white
Primary accent:      bg-primary/5 border-primary/20 text-primary
Success:             bg-emerald-100 text-emerald-600
Warning/deposit:     text-amber-600 bg-amber-50 border-amber-200
Destructive:         text-destructive (red)
Muted:               text-stone-400, text-muted-foreground
Disabled/past:       text-stone-300
```

## Public-facing pages (booking, onboarding, landing)
- Max width: `max-w-lg mx-auto` (mobile-first, narrower than admin)
- Background: `bg-stone-50 min-h-screen`
- Header: `bg-white border-b` with logo icon + business name
- Rounded cards: `rounded-xl` (admin uses `rounded-lg` from shadcn defaults)
- Buttons: full-width `w-full` on mobile flows

## Admin pages (dashboard, calendar, clients, etc.)
- Max width: `max-w-2xl mx-auto` for settings-style pages
- Use shadcn `Card` components consistently
- Sticky save button at bottom for long forms
- Data tables: plain `div` lists with `border-b` separators, not full `<table>` elements unless truly tabular

## Icons
- Library: Lucide React only (`lucide-react`)
- Size: `w-4 h-4` inline, `w-5 h-5` for standalone/decorative
- Always pair with a label or aria-label — no icon-only buttons without tooltip

## Animations
- Framer Motion is available but use sparingly — only for meaningful transitions
- Loading pulses: `animate-pulse bg-stone-100 rounded`
- Hover: `hover:bg-primary/10 transition-colors` — keep transitions short

## Do not
- Use arbitrary Tailwind values (`w-[347px]`) — use scale values
- Mix `stone` and `gray` color families — stick to `stone`
- Apply Cabinet Grotesk to body text — headings only
- Add emojis to UI unless explicitly requested
