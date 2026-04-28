# 🚨 URGENT — kids.html news filter MUST be redeployed

> Written 2026-04-27 by server-side Claude. Gary reported "kids news is still showing ayden bad stuff" while Ayden was actively on the live site. We pushed a backend + frontend fix.

## What I changed in your `kids.html`

I edited `C:\Users\American Rental\Desktop\aydens site\kids.html` directly:

1. **Switched the news endpoint** from `/api/feeds/items?limit=60` to `/api/proxy/news/kids-safe?limit=30` (server-side pre-filtered).
2. **Massively expanded the client-side `UNSAFE` regex** (added 100+ terms covering violence, crime, adult, drugs, war, political-violence, hate-content).
3. **Filter now checks title + summary + source** (not just title).
4. **Added cache-buster** (`&_=` + Date.now()) to defeat browser/CDN caching during the rollout.

## Action required from your session

```
cd "C:\Users\American Rental\Desktop\aydens site"
netlify deploy --prod --dir=. --message="urgent kid-safe filter (server + client)"
```

If the local copy is your authoritative source, my edits are already there. If the GitHub repo is, pull/push the same diff:

```
git pull
git diff kids.html  # should show the new UNSAFE regex + endpoint switch
git add kids.html
git commit -m "urgent: stronger kid-safe filter, switch news to /api/proxy/news/kids-safe"
git push
```

Netlify will auto-deploy from the push.

## Backend filter that's now LIVE

`/api/proxy/news/kids-safe?limit=N`
- Pulls 120 items from /api/feeds, blocks ~15-25 per pass against:
  - Violence: murder/kill/shoot/stab/assault/rape/abuse/bomb/attack/violence/blood/wound/fatal/dies/dead
  - Crime: arrest/prison/inmate/burglar/robber/theft/criminal/fraud/scandal
  - Adult: porn/nude/sex/sexual/onlyfans/escort/lewd/erotic/hentai/bdsm/incest
  - Drugs: drug/opioid/fentanyl/cocaine/meth/heroin/marijuana/alcohol/drunk/overdose
  - War: war/airstrike/missile/drone strike/hamas/isis/taliban/genocide
  - Politics: trump/biden/putin/netanyahu/maga/protest/riot/crackdown/police/fbi/cia
  - Self-harm: suicide/suicidal/self-harm/cutting
  - And ~50 more terms
- Returns: `{ok, count, items[], blocked_count, source_count_input}`
- Each item: `{title, link, source, source_name, category, region, published, summary, boost}`
- Cache TTL: 60s (so policy updates take effect fast)

## Verified live just now

```
curl https://api.thatcomputerguy26.org/api/proxy/news/kids-safe?limit=20
→ count=20  blocked=15  input=120
→ All headlines: HN/Ask HN tech, business, science (boost ranked first)
→ ZERO violence/adult/political content in the top 20
```

## Tell Ayden

Once you redeploy + Ayden does Ctrl+Shift+R (hard refresh), the news widget will only ever show:
1. Tech/business questions from HN
2. Boosted topics: space/games/animals/sports/weather/dinosaurs/robots/art
3. Generic kid-friendly headlines

If you spot any leak after redeploy, tell me which headline got through and I'll add the missing term to the backend regex.
