<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Leads are written only via server functions using the admin client; the leads table has no public policies — keeps contact data private.
- Scheduling reads free/busy and creates events on the connected Google Calendar (primary) through the connector gateway — no external booking tools.
- Tracking events go through `track()` (dataLayer + fbq if present) — one place to wire analytics.
