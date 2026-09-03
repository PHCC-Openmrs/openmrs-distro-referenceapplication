# syntax=docker/dockerfile:1.7
#--------------------------------------------
# openmrs-esm-core source, cloned from git by default. To build against a
# local checkout instead (e.g. to test changes before pushing them), pass
# --build-context esm-core-local=<path-to-checkout> and set the
# ESM_CORE_SOURCE build arg below to "esm-core-local-aliased" -- see
# docker-compose.override.yml, which does exactly this for local dev builds.
# BuildKit only builds a stage if something actually depends on it, so
# esm-core-remote (and its network calls) is skipped entirely when a local
# checkout is used instead.
#
# COPY --from=$ARG does not support resolving $ARG to a stage/context name
# (a long-standing BuildKit limitation: moby/buildkit#2374). FROM $ARG,
# however, IS supported -- so ESM_CORE_SOURCE selects between the two
# candidate stages below via FROM, and every COPY --from= elsewhere in this
# file then references the single, fixed "esm-core-source" name that
# resolves to, whichever candidate was actually selected. The ARG must be
# declared here, before the first FROM, for FROM $ARG to see it at all.
#--------------------------------------------
ARG ESM_CORE_SOURCE=esm-core-remote

FROM alpine/git:latest AS esm-core-remote
ARG ESM_CORE_REPO=https://github.com/PHCC-Openmrs/openmrs-esm-core.git
ARG ESM_CORE_REF=main
ADD https://api.github.com/repos/PHCC-Openmrs/openmrs-esm-core/commits/${ESM_CORE_REF} /tmp/esm-core-commit.json
WORKDIR /repo
RUN git clone --branch ${ESM_CORE_REF} --depth 1 ${ESM_CORE_REPO} .

# Aliases the "esm-core-local" additional build context (see above) to the
# same /repo path esm-core-remote uses, so the two candidates are
# interchangeable from esm-core-source's perspective below.
FROM scratch AS esm-core-local-aliased
COPY --from=esm-core-local . /repo

FROM ${ESM_CORE_SOURCE} AS esm-core-source

#--------------------------------------------
# Dev Stage - Assembles and Builds Frontend
#--------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine as dev

# Pinned to the stable release rather than the `next` prerelease tag, which
# republishes multiple times a day and can ship breaking changes with no
# warning -- a `next` build once shipped an app-shell src/ requiring the
# Module Federation runtime to be published (experiments.provideExternalRuntime)
# while this repo's esm-core rspack.config.js (copied over that package's own
# config below) didn't set that flag, leaving the runtime unpublished so no
# lazily-loaded frontend module -- including every patient-chart dashboard
# tab -- could start.
ARG APP_SHELL_VERSION=latest

RUN apk add --no-cache git

RUN mkdir -p /app
WORKDIR /app

COPY spa-assemble-config.json .
COPY spa-build-config.json .
COPY esm-labtestreport-app ./esm-labtestreport-app/
COPY esm-stock-management-app-patched ./esm-stock-management-app-patched/

RUN cd esm-labtestreport-app && npm install && npm run build && npm pack --pack-destination /app

RUN corepack enable && \
    cd esm-stock-management-app-patched && \
    yarn install && \
    yarn build && \
    yarn pack --out /app/esm-stock-management-app-patched.tgz

# Build @openmrs/esm-patient-registration-app, @openmrs/esm-patient-list-management-app,
# @openmrs/esm-service-queues-app, @openmrs/esm-appointments-app AND
# @openmrs/esm-bed-management-app from our fork instead of the published "next"
# package, so fixes to any of them ship as soon as they land on main.
ARG PATIENT_MANAGEMENT_REPO=https://github.com/PHCC-Openmrs/openmrs-esm-patient-management.git
ARG PATIENT_MANAGEMENT_REF=main
# ADD from a URL is revalidated against its ETag/Last-Modified on every build,
# so this layer (and every RUN after it) is invalidated automatically whenever
# the branch moves -- no need to remember a manual cache-bust build-arg.
ADD https://api.github.com/repos/PHCC-Openmrs/openmrs-esm-patient-management/commits/${PATIENT_MANAGEMENT_REF} /tmp/patient-management-commit.json
RUN git clone --branch ${PATIENT_MANAGEMENT_REF} --depth 1 ${PATIENT_MANAGEMENT_REPO} openmrs-esm-patient-management && \
    corepack enable && \
    cd openmrs-esm-patient-management && \
    yarn install && \
    yarn workspace @openmrs/esm-patient-registration-app run build && \
    yarn workspace @openmrs/esm-patient-list-management-app run build && \
    yarn workspace @openmrs/esm-service-queues-app run build && \
    yarn workspace @openmrs/esm-appointments-app run build && \
    yarn workspace @openmrs/esm-bed-management-app run build && \
    (cd packages/esm-patient-registration-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-list-management-app && npm pack --pack-destination /app) && \
    (cd packages/esm-service-queues-app && npm pack --pack-destination /app) && \
    (cd packages/esm-appointments-app && npm pack --pack-destination /app) && \
    (cd packages/esm-bed-management-app && npm pack --pack-destination /app)

# Build @openmrs/esm-patient-chart-app, @openmrs/esm-patient-programs-app,
# @openmrs/esm-patient-medications-app, @openmrs/esm-patient-orders-app, AND
# @openmrs/esm-patient-conditions-app from our fork instead of the published "next"
# package. esm-patient-chart-app is just the dashboard-shell package -- it does NOT
# depend on the others, so each widget package must be built and packed separately,
# and spa-assemble-config.json must point each at its own tarball (not "next") or
# none of this has any effect on what's actually served.
ARG PATIENT_CHART_REPO=https://github.com/PHCC-Openmrs/openmrs-esm-patient-chart.git
ARG PATIENT_CHART_REF=main
ADD https://api.github.com/repos/PHCC-Openmrs/openmrs-esm-patient-chart/commits/${PATIENT_CHART_REF} /tmp/patient-chart-commit.json
RUN git clone --branch ${PATIENT_CHART_REF} --depth 1 ${PATIENT_CHART_REPO} openmrs-esm-patient-chart && \
    corepack enable && \
    cd openmrs-esm-patient-chart && \
    yarn install && \
    yarn workspace @openmrs/esm-patient-chart-app run build && \
    yarn workspace @openmrs/esm-patient-programs-app run build && \
    yarn workspace @openmrs/esm-patient-medications-app run build && \
    yarn workspace @openmrs/esm-patient-orders-app run build && \
    yarn workspace @openmrs/esm-patient-conditions-app run build && \
    yarn workspace @openmrs/esm-patient-vitals-app run build && \
    yarn workspace @openmrs/esm-patient-allergies-app run build && \
    yarn workspace @openmrs/esm-patient-notes-app run build && \
    yarn workspace @openmrs/esm-patient-immunizations-app run build && \
    (cd packages/esm-patient-chart-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-programs-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-medications-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-orders-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-conditions-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-vitals-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-allergies-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-notes-app && npm pack --pack-destination /app) && \
    (cd packages/esm-patient-immunizations-app && npm pack --pack-destination /app)

# Build @openmrs/esm-dispensing-app from our fork instead of the published "next"
# package, so the auto-complete-on-dispense and dispensed-quantity fixes ship.
ARG DISPENSING_REPO=https://github.com/PHCC-Openmrs/openmrs-esm-dispensing-app.git
ARG DISPENSING_REF=main
ADD https://api.github.com/repos/PHCC-Openmrs/openmrs-esm-dispensing-app/commits/${DISPENSING_REF} /tmp/dispensing-commit.json
RUN git clone --branch ${DISPENSING_REF} --depth 1 ${DISPENSING_REPO} openmrs-esm-dispensing-app && \
    corepack enable && \
    cd openmrs-esm-dispensing-app && \
    yarn install && \
    yarn build && \
    yarn pack --out /app/esm-dispensing-app.tgz

# Build @openmrs/esm-laboratory-app from our fork instead of the published "next"
# package, so the Add test order button's privilege gate ships.
ARG LABORATORY_REPO=https://github.com/PHCC-Openmrs/openmrs-esm-laboratory-app.git
ARG LABORATORY_REF=main
ADD https://api.github.com/repos/PHCC-Openmrs/openmrs-esm-laboratory-app/commits/${LABORATORY_REF} /tmp/laboratory-commit.json
RUN git clone --branch ${LABORATORY_REF} --depth 1 ${LABORATORY_REPO} openmrs-esm-laboratory-app && \
    corepack enable && \
    cd openmrs-esm-laboratory-app && \
    yarn install && \
    yarn build && \
    yarn pack --out /app/esm-laboratory-app.tgz

# Build @openmrs/esm-login-app, @openmrs/esm-app-shell, AND @openmrs/esm-framework
# (which re-exports esm-offline) from our fork instead of the published "next"
# packages. Our fork's main removes the "Built with OpenMRS" footer, clears the
# service worker cache on logout, and fixes stale-content caching bugs in the
# app shell's service worker. esm-app-shell and esm-framework are pinned CLI
# dependencies (not entries in spa-assemble-config.json), so their builds are
# only packed here -- they get spliced into node_modules below.
COPY --from=esm-core-source /repo openmrs-esm-core
# Also build @openmrs/esm-styleguide from this same checkout instead of the
# published version, to fix the redundant/duplicate scrollbar that shows up
# in form workspaces (workspace header used box-sizing: content-box, so its
# 1px border wasn't accounted for in --desktop-workspace-window-height,
# leaving the workspace content 1px taller than its container).
RUN corepack enable && \
    cd openmrs-esm-core && \
    yarn install && \
    npx turbo run build --filter=...@openmrs/esm-login-app --filter=...@openmrs/esm-app-shell --filter=...@openmrs/esm-framework --filter=...@openmrs/esm-styleguide && \
    (cd packages/apps/esm-login-app && npm pack --pack-destination /app)

ARG CACHE_BUST
# Install the openmrs CLI locally (instead of via npx) so we know exactly
# where it puts its own pinned @openmrs/esm-app-shell, @openmrs/esm-framework,
# and @openmrs/esm-styleguide, and can overwrite them with our patched builds
# above before the shell itself gets compiled. None of these three are
# modules in spa-assemble-config.json -- the app shell is compiled directly
# by `openmrs build` from its own hard-pinned dependencies, so that config
# has no way to override them; this is the only place that actually takes
# effect.
RUN npm install --no-save --legacy-peer-deps openmrs@${APP_SHELL_VERSION:-next} && \
    STYLEGUIDE_DIR=$(find node_modules -type d -path '*@openmrs/esm-styleguide' | head -n1) && \
    echo "Found esm-styleguide at: ${STYLEGUIDE_DIR}" && \
    test -n "${STYLEGUIDE_DIR}" && \
    rm -rf "${STYLEGUIDE_DIR}/dist" && \
    cp -r openmrs-esm-core/packages/framework/esm-styleguide/dist "${STYLEGUIDE_DIR}/dist" && \
    APP_SHELL_DIR=$(find node_modules -type d -path '*@openmrs/esm-app-shell' | head -n1) && \
    echo "Found esm-app-shell at: ${APP_SHELL_DIR}" && \
    test -n "${APP_SHELL_DIR}" && \
    rm -rf "${APP_SHELL_DIR}/dist" "${APP_SHELL_DIR}/tools" "${APP_SHELL_DIR}/src/assets" && \
    cp -r openmrs-esm-core/packages/shell/esm-app-shell/dist "${APP_SHELL_DIR}/dist" && \
    cp -r openmrs-esm-core/packages/shell/esm-app-shell/tools "${APP_SHELL_DIR}/tools" && \
    cp -r openmrs-esm-core/packages/shell/esm-app-shell/src/assets "${APP_SHELL_DIR}/src/assets" && \
    cp openmrs-esm-core/packages/shell/esm-app-shell/src/index.ejs "${APP_SHELL_DIR}/src/index.ejs" && \
    cp openmrs-esm-core/packages/shell/esm-app-shell/rspack.config.js "${APP_SHELL_DIR}/rspack.config.js" && \
    cp openmrs-esm-core/packages/shell/esm-app-shell/dependencies.json "${APP_SHELL_DIR}/dependencies.json" && \
    FRAMEWORK_DIR=$(find node_modules -type d -path '*@openmrs/esm-framework' | head -n1) && \
    echo "Found esm-framework at: ${FRAMEWORK_DIR}" && \
    test -n "${FRAMEWORK_DIR}" && \
    rm -rf "${FRAMEWORK_DIR}/dist" && \
    cp -r openmrs-esm-core/packages/framework/esm-framework/dist "${FRAMEWORK_DIR}/dist" && \
    ROUTES_DIR=$(find node_modules -type d -path '*@openmrs/esm-routes' | head -n1) && \
    echo "Found esm-routes at: ${ROUTES_DIR}" && \
    test -n "${ROUTES_DIR}" && \
    rm -rf "${ROUTES_DIR}/dist" && \
    cp -r openmrs-esm-core/packages/framework/esm-routes/dist "${ROUTES_DIR}/dist"
RUN node_modules/.bin/openmrs assemble --manifest --mode config --config spa-assemble-config.json --target ./spa
RUN node_modules/.bin/openmrs build --build-config spa-build-config.json --target ./spa
RUN if [ ! -f ./spa/index.html ]; then echo 'Build failed. Please check the logs above for details. This may have happened because of an update to a library that OpenMRS depends on.'; exit 1; fi

#--------------------------------------------
# Runtime Stage - Published Image
#--------------------------------------------
FROM nginx:1.31-alpine

RUN apk update && \
    apk upgrade && \
    # add more utils for sponge and envsubst
    apk add --no-cache moreutils

# clear any default files installed by nginx
RUN rm -rf /usr/share/nginx/html/*

COPY startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=dev /app/spa /usr/share/nginx/html
COPY config-core_demo.json /usr/share/nginx/html

CMD ["/usr/local/bin/startup.sh"]
