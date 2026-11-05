# Onprem deployment via doco-cd (GitOps)

> **Deployment branch:** doco-cd currently follows `feature/doco-cd-deployment`,
> not `main`. Read `main` below as that branch for git changes. Images still use
> the `:main` tag, which CI builds from `main`. To switch branches, change
> `reference` in `.doco-cd.yml` and in `dococd-docker-compose.yml`.

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
 │    gateway · nginx · frontend · backend · db · portainer · monitoring  │
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
   with **empty** `db-data`/`openmrs-data` volumes (and fails on the
   already-taken ports 80/443/3306).

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
| Compose files, `configuration/`, `nginx-proxy/`, `.doco-cd.yml` pushed to `main` | Deployed on the next poll (≤ 60s). |
| New image pushed to `ghcr.io/phcc-openmrs/*:main` (via `Deploy to Onprem VM`) | Picked up at the **next commit to `main`**, since doco-cd watches git, not the registry (see Caveats). |

## Rollback

`git revert` the bad commit on `main`; doco-cd deploys the revert on its next
poll. To pin images to a known-good build, set `TAG: main-<good-full-sha>` in
`.doco-cd.yml` and push.

## Caveats

- **Image-only updates.** `TAG` is the floating `main` tag, which isn't in
  git, so pushing a new `:main` image without a commit isn't seen until the
  next commit. For a true "git describes exactly what runs" setup, CI would
  need to commit the new `main-<sha>` tag after pushing images (the Argo CD
  Image Updater pattern). That requires changes to `deploy-onprem.yml` and
  `docker-compose.yml`, which this setup deliberately leaves untouched.
- `reconciliation` is disabled. Otherwise doco-cd restarts the backend while
  it's still booting and reporting unhealthy.
- The `nginx` service's `./nginx-proxy/nginx.conf` bind mount resolves into
  doco-cd's per-revision checkout, so `nginx` is recreated on every deploy
  (a brief blip on 80/443).
- `docker-compose.override.yml` is not used (it's for local builds).
