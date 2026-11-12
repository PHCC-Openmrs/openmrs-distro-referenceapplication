# Onprem deployment via doco-cd (GitOps)

> **Deployment branch:** doco-cd follows the branch in `DOCO_CD_BRANCH`, which Azure
> VMs read from the Key Vault secret `openmrs-vm-deploy-branch`. Read `main` below
> as that branch for git changes. Images still use the `:main` tag, which CI builds
> from `main`.

[doco-cd](https://doco.cd) runs on the onprem VM, polls this repo's `main`
branch, and whenever `main` moves it deploys the stack described in
[`../../.doco-cd.yml`](../../.doco-cd.yml) -- the same way Argo CD syncs a
cluster to git. Nothing calls into the VM; doco-cd only makes outbound
requests to GitHub and GHCR.

## Architecture

```
 developer ── git push ──▶ GitHub: PHCC-Openmrs/openmrs-distro-referenceapplication (main)
                                   ▲
                                   │ git fetch every 60s (outbound)
 ┌─ Onprem VM ─────────────────────┼──────────────────────────────────────┐
 │                                 │                                      │
 │  doco-cd container (compose project "doco-cd")                         │
 │    main moved?  ── no ──▶ wait for next poll                           │
 │        │ yes                                                           │
 │        ▼                                                               │
 │    read .doco-cd.yml                                                   │
 │    env = /config/stack.env (VM .env) + IMAGE_PREFIX/TAG                │
 │    docker compose pull   (ghcr.io/phcc-openmrs/*:main)                 │
 │    docker compose up -d --remove-orphans                               │
 │    prune unused images                                                 │
 │        │                                                               │
 │        ▼                                                               │
 │  stack "openmrs-distro-referenceapplication"                           │
 │    caddy (TLS) · nginx · gateway · frontend · backend · monitoring     │
 │    (existing volumes reused)                                           │
 └────────────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|---|---|
| `dococd-docker-compose.yml` | Runs doco-cd itself, as its own compose project (`doco-cd`). |
| `.env` (create on the VM, **don't commit**) | Optional secrets for `dococd-docker-compose.yml`. |
| [`../../.doco-cd.yml`](../../.doco-cd.yml) | What doco-cd deploys and how. |

## One-time VM setup

1. **Check the project name.** `.doco-cd.yml` sets
   `name: openmrs-distro-referenceapplication` so doco-cd takes over the
   running stack and its volumes. Confirm it matches:
   ```
   docker compose ls
   ```
   If the running project is named differently, change `name` in
   `.doco-cd.yml` before starting doco-cd, otherwise it starts a second stack
   with an **empty** `openmrs-data` volume (and fails on the already-taken
   ports 80/443).

2. **The stack's settings are in the repo's `.env`, encrypted with SOPS.**
   doco-cd decrypts it with the private age key. The public key is in
   `.sops.yaml`. To change a value, with the private key available locally:
   ```
   SOPS_AGE_KEY_FILE=<path-to-private-key> sops edit .env
   ```

3. **Create `ops/doco-cd/.env`** (Azure VMs read these from Key Vault instead, and need no file):
   ```
   # read-only PAT:
   GIT_ACCESS_TOKEN=<PAT>
   # private age key that decrypts the repo's .env:
   SOPS_AGE_KEY=<private-age-key>
   # branch to deploy:
   DOCO_CD_BRANCH=<branch>
   # Key Vault with the MySQL secrets, and an identity that can read them:
   SECRET_PROVIDER_VAULT_URL=https://<key-vault-name>.vault.azure.net
   AZURE_CLIENT_ID=<identity-client-id>
   # ghcr.io/phcc-openmrs packages are private:
   DOCKER_AUTH_CONFIG={"auths":{"ghcr.io":{"auth":"<base64 of user:read-packages-PAT>"}}}
   # default 60 (seconds):
   POLL_INTERVAL=60
   ```
   `chmod 600 .env`. It's gitignored, and must never be committed.

4. **Stop the old deployer** so the two don't fight over the stack:
   ```
   sudo systemctl disable --now webhook
   ```

5. **Start doco-cd**. Its image, `ghcr.io/phcc-openmrs/doco-cd`, is private, so run
   `docker login ghcr.io` first:
   ```
   cd /home/openmrsdev/openmrsdev/openmrs-distro-referenceapplication/ops/doco-cd
   docker compose -f dococd-docker-compose.yml up -d
   docker logs -f doco-cd
   ```
   The first poll deploys the current `main`.

## What triggers a deploy

| Change | What happens |
|---|---|
| Compose files, `configuration/`, `nginx-proxy/`, `caddy/`, `.doco-cd.yml` pushed to `main` | Deployed on the next poll (≤ 60s). |
| New image pushed to `ghcr.io/phcc-openmrs/*:main` (via `Deploy to Onprem VM`) | Picked up at the **next commit to `main`**, since doco-cd watches git, not the registry (see Caveats). |
| `Deploy to Prod` run on the `PROD_DEPLOY_BRANCH` branch | Builds the selected images, commits their `<branch>-<sha>` tags to `.env`, and that commit is deployed on the next poll. |

## Deploy to Prod pipeline

[`.github/workflows/deploy-prod.yml`](../../.github/workflows/deploy-prod.yml) is
run by hand (Actions → **Deploy to Prod** → pick `all`, `backend`, `frontend`
or `gateway`). It:

1. Builds and pushes the selected images as `<branch>` and `<branch>-<sha>` (with any `/` in the branch name turned into `-`),
   like `Deploy to Onprem VM`.
2. In the `prod` environment, runs `sops set` to write `<branch>-<sha>` into
   `.env` as `BACKEND_TAG`, `FRONTEND_TAG` and/or `GATEWAY_TAG`. Only the
   services built in that run are updated.
3. Commits `.env` back to the branch as `github-actions[bot]`. doco-cd sees
   the commit and deploys exactly those images.

`docker-compose-prod.yaml` uses `${<SERVICE>_TAG:-${TAG}}`, so a service whose
tag was never pinned still runs the floating `TAG`.

The tag step updates `.env` only when the pipeline runs on the branch named by
the `prod` environment variable `PROD_DEPLOY_BRANCH`, and commits there. Keep it
the same as Key Vault `openmrs-vm-deploy-branch`, which is the branch doco-cd
deploys from (`feature/doco-cd-prod-pipeline` while testing, `main` later).
Runs on any other branch still build and push images but leave `.env` alone.
It needs:

- A GitHub environment `prod` with the variable `PROD_DEPLOY_BRANCH` and the
  secret `SOPS_AGE_KEY`: the age private key for the recipient in
  [`.sops.yaml`](../../.sops.yaml).
- Workflow permissions that let `GITHUB_TOKEN` write contents, and branch
  protection on `main` that allows `github-actions[bot]` to push.

## Rollback

`git revert` the bad commit on `main`; doco-cd deploys the revert on its next
poll. To pin images to a known-good build, `sops edit .env` and set
`BACKEND_TAG` / `FRONTEND_TAG` / `GATEWAY_TAG` to `main-<good-full-sha>`, then push.

## Caveats

- **Image-only updates.** `TAG` is the floating `main` tag, which isn't in
  git, so a new `:main` image pushed by `Deploy to Onprem VM` isn't seen until
  the next commit. Use `Deploy to Prod` instead: it commits the immutable
  `main-<sha>` tags, so git describes exactly what runs.
- `reconciliation` is disabled. Otherwise doco-cd restarts the backend while
  it's still booting and reporting unhealthy.
- The `nginx` service's `./nginx-proxy/nginx.conf` bind mount resolves into
  doco-cd's per-revision checkout, so `nginx` is recreated on every deploy
  (a brief blip on 80/443).
- **TLS.** In `docker-compose-prod.yaml`, Caddy holds ports 80/443, gets and
  renews the Let's Encrypt certificate for carepalestine.com
  ([`caddy/Caddyfile`](../../caddy/Caddyfile)), and forwards plain HTTP to
  `nginx:80`. nginx publishes no host ports. Like nginx, Caddy is recreated on
  every deploy because of its bind mount. The certificate is kept in the
  `caddy-data` volume, so a deploy doesn't request a new one. DNS for the
  domain must point at the VM before the first deploy, or issuance fails.
- `docker-compose.override.yml` is not used (it's for local builds).
