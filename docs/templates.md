# Default AST templates (Login & Blog)

Demo page trees live as JSON under `packages/shared/src/templates/`. They are loaded via `loadTemplate("login" | "blog")` and validated with `astRootSchema` (Zod).

## Files

| Template | Path | `root.props.page` |
|----------|------|-------------------|
| Login | [`login-template.json`](../packages/shared/src/templates/login-template.json) | `login` |
| Blog feed | [`blog-template.json`](../packages/shared/src/templates/blog-template.json) | `blog` |

## Login page structure

- `section` (page shell)
  - `nav` — branding + link to blog demo
  - `main` — centered card
    - `form`
      - `label` + `input` (`type: email`, `name: email`)
      - `label` + `input` (`type: password`, `name: password`)
      - `button` (`dataDemo: login-submit`) — wired by compiled `demo-app.js`
  - `footer`

## Blog feed structure

- `section` (page shell)
  - `nav` — title + anchor links (New post, Login)
  - `main`
    - `newPostForm` (`dataDemo: new-post`) — title `input` + Publish button
    - `blogFeed` (`dataDemo: blog-feed`) — **mapping container** for posts
      - `blogCard` × N (`dataDemo: blog-card`) — template cloned per API post
        - `h3` (`dataDemo: card-title`)
        - `p` (`dataDemo: card-body`)
  - `footer`

## IDE usage

Header → **Load template…** → Login page / Blog feed. Compile/export produces HTML + `demo-app.js` for [`apps/demo-runtime`](../apps/demo-runtime/) and E2E on port **4010**.

## Validation

```bash
pnpm --filter @pqc/shared test
```

Tests in [`templates.test.ts`](../packages/shared/src/templates.test.ts) parse both JSON files through `astRootSchema`.
