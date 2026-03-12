# Go-to-Market Plan: First 5 Coffee Shop Customers

**Owner:** COO
**Created:** 2026-03-12
**Goal:** 3–5 founding customers signed up before or at launch
**Target:** Independent coffee shop owners using Square POS who want a premium ordering UX

---

## Target Customer Profile

**Primary persona:** Independent coffee shop owner (1–3 locations)
- Uses Square POS with a Square reader or tablet at the counter
- Has 10–50 menu items, with customization options (size, milk, syrups)
- Frustrated by Square's default ordering UI — it's functional but not premium
- Cares about customer experience and brand presentation
- Not heavily technical, needs a plug-and-play solution

**Disqualifiers:**
- Large chains (they have custom tech)
- Shops that don't use Square
- Shops that primarily sell packaged goods (not customizable drinks)

---

## 1. Target Coffee Shop Identification

**Goal:** Build a list of 20 qualified prospects in the local area.

### How to identify them
1. Walk or drive through commercial areas — look for independent (non-chain) coffee shops
2. Check if they have a Square reader/tablet visible at the counter
3. Look for shops with a visible drink menu with modifiers (sizes, milk options, syrups)
4. Cross-reference with Google Maps search: "coffee shop near me" → filter for independents (no chain branding)
5. Check Yelp for "independent coffee" with Square mentions in reviews

### Qualification checklist
- [ ] Independent (not Starbucks, Peet's, Dutch Bros, etc.)
- [ ] Visible Square hardware at counter
- [ ] Customizable drink menu (not just drip coffee)
- [ ] Open and actively operating

### Prospect tracker template

| Shop Name | Address | Owner/Contact | Square Confirmed | Contacted | Response | Status |
|-----------|---------|--------------|-----------------|-----------|----------|--------|
| Example Café | 123 Main St | Sarah | Yes | 2026-03-15 | Interested | Demo scheduled |

---

## 2. Demo Pitch Deck

**Format:** 5 slides, shown on phone or tablet in-person, or shared as a link.

### Slide 1: The Problem
> "Your customers want to customize their drinks. Square's ordering screen wasn't built for that."
- Photo of a cluttered Square item screen vs. a clean Drink-UX screen
- Pain point: slow ordering, staff errors on customizations, inconsistent experience

### Slide 2: The Solution
> "Drink-UX turns your Square menu into a premium ordering experience — in minutes."
- Screenshot of the Drink-UX drink builder
- Key benefits: beautiful UI, instant customization, Square-native (no double-entry)

### Slide 3: Live Demo
> "Here's what your customers would see."
- Open the live demo at the GitHub Pages URL on a phone
- Walk through: pick a drink → customize → add to cart → checkout
- Show how it maps to their Square menu automatically

### Slide 4: Pricing
> "Simple monthly subscription. Cancel anytime."
- Founding customer rate: **$49/month** (locks in for life)
- Standard rate (post-launch): $79/month
- No setup fee, no per-transaction fees
- 30-day free trial for founding customers

### Slide 5: Getting Started
> "We'll set it up with you. Usually takes under 30 minutes."
- Connect Square → we import your menu automatically
- You customize categories and drink visuals
- Share the link with customers (works on any phone)
- We handle support and updates

---

## 3. Outreach Scripts

### In-Person Introduction (walk-in)
> Best time: mid-morning (10–11am) or mid-afternoon (2–4pm) when the shop is quieter.

**Opening:**
> "Hi, I'm [name] from Drink-UX. We make a drink ordering app that works with Square — it gives your customers a really nice way to customize their drinks right on their phone. Do you have 3 minutes to see it?"

**If yes:** Pull out phone, show the live demo. Offer to schedule a proper demo with the owner if talking to a barista.

**If they have Square but say they're not interested:**
> "Totally fair. Would it be okay if I left a card? We're offering a founding customer rate right now that locks in the price for life — might be worth a look when you have a quiet moment."

**Leave behind:** Business card with drink-ux.com URL and a QR code linking to the demo.

### Email Outreach

**Subject:** Better drink ordering for [Shop Name] — works with your Square setup

**Body:**
```
Hi [Owner name],

I came across [Shop Name] and love what you're doing with your menu.

I'm reaching out because we built Drink-UX — a drink ordering app designed specifically for independent coffee shops using Square. It gives your customers a beautiful way to customize their drinks (size, milk, syrups) and sends orders directly to your Square POS. No double-entry, no new hardware.

Right now we're onboarding founding customers at $49/month (half our planned price, locked in for life).

If you'd like to see a quick demo, I'd love to show you — takes about 15 minutes. Here's a preview of what it looks like: [GitHub Pages URL]

Happy to set it up for free during a trial period so you can see it working with your actual menu.

Best,
[Name]
Drink-UX / SkibbySoft
support@drink-ux.com
```

---

## 4. Demo Setup Requirements

**Before any customer-facing demo, the following must be verified:**

- [ ] GitHub Pages URL loads reliably on mobile (iOS + Android)
- [ ] Demo account shows a realistic drink menu (at least: lattes, cold brews, specialty drinks with size/milk/syrup options)
- [ ] Full E2E flow works: select drink → customize → add to cart → checkout (with Square sandbox)
- [ ] Page load time under 3 seconds on mobile network
- [ ] No broken images or rendering glitches on iPhone Safari and Chrome Android

**Assigned to CTO** — see [SKI-15] for demo readiness verification task.

**Demo URL to use:** [GitHub Pages URL — to be confirmed with CTO]

---

## 5. Onboarding Playbook

For founding customers once they've agreed to sign up:

### Step 1: Account Setup (5 min)
1. Create business account at [drink-ux.com or admin URL]
2. Enter business name, logo upload, primary brand color
3. Receive welcome email with next steps

### Step 2: Connect Square (5 min)
1. In Drink-UX admin: Settings → Connect Square
2. Authorize OAuth with their Square account
3. System imports items from Square catalog automatically

### Step 3: Organize Menu (10–15 min)
1. Review imported items — drag into categories (Espresso, Cold Brew, Specialty, etc.)
2. Mark which items have size/milk/syrup modifier options
3. Hide any items not relevant to drink orders (packaged goods, etc.)

### Step 4: Preview and Go Live (5 min)
1. Use the preview link to test on their phone
2. Share the ordering URL with staff to verify
3. Post the QR code or link in-store (we provide a printable card template)

### Step 5: First Week Check-in
- COO/support reaches out after 7 days: any issues? need menu tweaks?
- Confirm they're comfortable with the Square order flow

---

## 6. Support Channel

**For founding customers:**
- Direct email: support@drink-ux.com (monitored by COO)
- Response time commitment: same business day
- First-month white-glove: proactive check-ins at day 7 and day 30

**Future (post-10-customers):**
- Consider adding a simple chat widget (Crisp or Intercom free tier)
- FAQ page on the marketing site covering: Square connection, menu setup, sharing the ordering link

---

## Execution Timeline

| Week | Action |
|------|--------|
| Week 1 | CTO confirms demo readiness; COO builds prospect list (20 shops) |
| Week 2 | First 10 in-person or email outreach contacts |
| Week 2–3 | Follow up with interested prospects; schedule demos |
| Week 3 | First onboarding calls; aim for 2–3 founding customers |
| Week 4 | Outreach continues; target 5 founding customers total |

---

## Success Metrics

- 20 prospects identified
- 10 outreach attempts made
- 5 demo conversations completed
- **3–5 founding customers signed** (primary goal)
- 0 churn in first 30 days (secondary goal)

---

## Notes

- Coordinate with CTO on demo readiness before outreach begins
- Founding pricing ($49/mo) requires CEO approval — document confirmed
- Legal docs (ToS + Privacy Policy) are live at /terms and /privacy in the app
