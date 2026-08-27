# Generating demo complaints

The fastest way to get 30+ realistic complaints (including every required
edge case) is to log in as a customer account and submit them through the
app's **Submit Complaint** form — each one will be classified, scored, and
given a real SLA deadline automatically, exactly as it would in a live demo.

To make this fast, here are 30 ready-to-paste descriptions covering every
edge case the brief asks for. Paste each into the form as its own complaint
(vary the "Title" a little each time):

**High priority**
1. "My ₹5,000 payment was deducted but the transaction failed and I haven't received my refund."
2. "Urgent — unauthorized transaction on my account, I did not make this payment."
3. "App crashes immediately on login, I cannot access my account at all, urgent."

**Low priority, will approach SLA breach naturally over time**
4. "The packaging was slightly torn but the product inside is fine."
5. "Minor UI glitch on the settings page, not blocking anything."
6. "Would like to know if bulk order discounts are available."

**SLA breach test (create these first — pick a Critical-classified complaint and just wait ~4h, or manually edit `sla_deadline` in Supabase to a past timestamp)**
7. "Money deducted twice for the same order, need this fixed immediately, urgent."

**Reopened**
8. "Refund not received after 10 days." — submit, then as an agent mark RESOLVED, then log back in as the customer and click "Reopen."

**Critical**
9. "Fraud alert — someone accessed my account and changed my password without permission."

**Missing/ambiguous category**
10. "" (leave description blank to test the Other/low-confidence fallback)
11. "Not happy with the service."

**Duplicate complaints from the same customer**
12 & 13. Submit "Package delivery delayed by 4 days, tracking not updating" twice from the same account.

**Multiple complaints, same customer**
14-16. Submit 3 different complaints from one customer account.

**Department unavailable**
17. In Supabase Table Editor, set `departments.is_available = false` for "Logistics", then submit a delivery complaint and note it in the UI/demo narration.

**Everyday spread across all categories (18-30)**
18. "Subscription auto-renewed even though I cancelled last month."
19. "Received a broken product, box was damaged in transit."
20. "Can't reset my password, reset link isn't working."
21. "Delivery courier marked as delivered but I never received the package."
22. "Charged in the wrong currency for my order."
23. "Product quality is much lower than advertised."
24. "Technical error when checking out, payment page keeps freezing."
25. "Account locked after too many login attempts, need it unlocked."
26. "Refund approved but money hasn't arrived after a week."
27. "Wrong item delivered, ordered a medium but got a small."
28. "Subscription billing amount changed without notice."
29. "Support agent hasn't responded in 3 days, following up."
30. "App is very slow to load, technical issue on the home screen."

## Fast-forwarding SLA states for a live demo

Timers are real, so a freshly-submitted Critical complaint takes 4 real
hours to breach. To demo breach/escalation behavior immediately without
waiting:

1. Submit the complaint normally so it gets classified and scored.
2. In Supabase → Table Editor → `complaints`, edit that row's `sla_deadline`
   to a timestamp a few minutes in the past (or a few minutes in the future
   to watch it flip from APPROACHING to BREACHED live).
3. Open the complaint detail page (or the agent/manager dashboard) — the
   countdown ring, SLA badge, and escalation flag update within 15 seconds.
