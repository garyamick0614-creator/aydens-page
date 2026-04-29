// playground/components/ScrollyTeller.js
// Phase 4: Intersection-Observer-driven scroll storytelling. Below the fold,
// reveal a narrated walkthrough of what the playground IS — first-time
// visitors discover the mechanics by scrolling, not by reading docs.
// Each section animates in independently. Pure CSS transforms; no React state
// per scroll event.

const { useEffect, useRef } = window.React;
const h = window.React.createElement;

const STEPS = [
  {
    icon: '👋',
    title: 'You are a cursor',
    body: 'Move your mouse. The colored halo tracks you. Everyone here sees that halo in real time.',
  },
  {
    icon: '🎨',
    title: 'Particles paint your trail',
    body: 'Movement leaves a particle burst. Speed = brighter trail. Stop = fade out. All on your local canvas.',
  },
  {
    icon: '🔥',
    title: 'Tap an emoji to share',
    body: 'The bottom emoji palette broadcasts to every connected friend. They see it float up from your cursor.',
  },
  {
    icon: '💥',
    title: 'Click anything to blast',
    body: 'A click anywhere drops a 💥 burst at that spot. Other players see it land where you clicked.',
  },
  {
    icon: '🔊',
    title: 'Procedural soundscape',
    body: 'Tap "AUDIO ON" (top right) and the playground hums a chord that gets richer when more friends join. Move your mouse fast — it brightens the high end.',
  },
  {
    icon: '🌈',
    title: 'Shared theme',
    body: 'Pick a theme from the top-left. The background recolors instantly for everyone in the room.',
  },
  {
    icon: '🚀',
    title: 'It\'s a real-time room',
    body: 'No login. No setup. Open this URL on a second device or send it to a friend — you\'ll see each other within a second.',
  },
];

export function ScrollyTeller() {
  const wrapRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const sections = wrap.querySelectorAll('.st-step');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('st-visible');
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  return h('section', {
      ref: wrapRef, className: 'scrollyteller',
      style: {
        position: 'relative', zIndex: 5, marginTop: '90vh',
        paddingTop: 60, paddingBottom: 200, pointerEvents: 'auto',
      },
    },
    h('style', null,
      `.scrollyteller .st-step{
         max-width: 580px; margin: 0 auto 40vh; padding: 28px 30px;
         background: rgba(0,0,0,.55);
         border: 1px solid rgba(168,85,247,.4); border-radius: 18px;
         backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
         opacity: 0; transform: translateY(40px) scale(.96);
         transition: opacity .8s ease, transform .8s ease;
         color: #f1f4ff; font-family: 'Russo One','Rubik',system-ui,sans-serif;
         box-shadow: 0 10px 40px rgba(0,0,0,.4), 0 0 18px rgba(168,85,247,.18);
       }
       .scrollyteller .st-step.st-visible { opacity: 1; transform: translateY(0) scale(1); }
       .scrollyteller .st-icon { font-size: 56px; line-height: 1; margin-bottom: 12px;
         font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',emoji,sans-serif; }
       .scrollyteller .st-title { font-size: 26px; letter-spacing: .04em;
         text-transform: uppercase; color: #00f0ff; text-shadow: 0 0 12px rgba(0,240,255,.5); margin: 0 0 10px; }
       .scrollyteller .st-body { font-size: 15px; line-height: 1.6; color: #cbd5e1; }
       @media (max-width: 600px) {
         .scrollyteller .st-step { padding: 20px 18px; margin: 0 14px 30vh; }
         .scrollyteller .st-title { font-size: 20px; }
       }`,
    ),
    ...STEPS.map((s, i) => h('article', { key: i, className: 'st-step' },
      h('div', { className: 'st-icon' }, s.icon),
      h('h2',  { className: 'st-title' }, s.title),
      h('p',   { className: 'st-body' }, s.body),
    )),
    h('article', { className: 'st-step', style: { borderColor: 'rgba(255,208,0,.5)' } },
      h('div', { className: 'st-icon' }, '✨'),
      h('h2',  { className: 'st-title', style: { color: '#ffd000', textShadow: '0 0 12px rgba(255,208,0,.5)' } }, 'You\'re caught up'),
      h('p',   { className: 'st-body' }, 'Scroll back up + start playing. Or send the URL to a friend and see who joins first.'),
      h('a',   { href: '#top', style: { display: 'inline-block', marginTop: 14, color: '#ffd000', textDecoration: 'none', border: '1px solid #ffd000', padding: '7px 14px', borderRadius: 99, fontSize: 12, letterSpacing: '.14em' } },
        '↑ BACK TO TOP'),
    ),
  );
}
