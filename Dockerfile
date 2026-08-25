# syntax=docker/dockerfile:1

### Dev Stage
FROM openmrs/openmrs-core:2.8.x-dev-amazoncorretto-21 AS dev
WORKDIR /openmrs_distro

ARG MVN_ARGS="-s /usr/share/maven/ref/settings-docker.xml -U -P distro"
ARG MVN_COMMAND="install"

# Build locationbasedaccess from our fork and install it into the local Maven repo, so
# distro/pom.xml can depend on it as a plain artifact (org.openmrs.module:locationbasedaccess-omod)
# without vendoring a copy of its source into custom-modules/. The owa submodule is skipped: its
# build tooling is unmaintained/broken on modern JDKs and this deployment doesn't use its
# OWA/uiframework UI anyway (see the module's own config.xml for why).
ARG LOCATIONBASEDACCESS_REPO=https://github.com/PHCC-Openmrs/openmrs-module-locationbasedaccess.git
ARG LOCATIONBASEDACCESS_REF=master
# BuildKit compares the bytes an ADD <url> downloads against what it fetched last time it built
# this stage, and invalidates this layer (plus everything after it) when they differ - so fetching
# the branch's commit feed here auto-busts the git clone below whenever LOCATIONBASEDACCESS_REF
# moves, with no manual --build-arg needed. Using the .atom feed (rather than the api.github.com
# REST API) avoids GitHub's stricter, easily-exhausted unauthenticated API rate limit.
ADD https://github.com/PHCC-Openmrs/openmrs-module-locationbasedaccess/commits/${LOCATIONBASEDACCESS_REF}.atom /tmp/locationbasedaccess-head.atom
RUN --mount=type=secret,id=m2settings,target=/usr/share/maven/ref/settings-docker.xml \
    git clone --branch ${LOCATIONBASEDACCESS_REF} --depth 1 ${LOCATIONBASEDACCESS_REPO} /tmp/locationbasedaccess && \
    cd /tmp/locationbasedaccess && \
    mvn -s /usr/share/maven/ref/settings-docker.xml -DskipTests -pl api,omod -am install && \
    rm -rf /tmp/locationbasedaccess

# Build patientdocuments from our fork and install it into the local Maven repo, so
# distro/pom.xml can depend on it as a plain artifact (org.openmrs.module:patientdocuments-omod)
# without vendoring a copy of its source into custom-modules/ - same approach as
# locationbasedaccess above.
ARG PATIENTDOCUMENTS_REPO=https://github.com/PHCC-Openmrs/openmrs-module-patientdocuments.git
ARG PATIENTDOCUMENTS_REF=main
ADD https://github.com/PHCC-Openmrs/openmrs-module-patientdocuments/commits/${PATIENTDOCUMENTS_REF}.atom /tmp/patientdocuments-head.atom
RUN --mount=type=secret,id=m2settings,target=/usr/share/maven/ref/settings-docker.xml \
    git clone --branch ${PATIENTDOCUMENTS_REF} --depth 1 ${PATIENTDOCUMENTS_REPO} /tmp/patientdocuments && \
    cd /tmp/patientdocuments && \
    mvn -s /usr/share/maven/ref/settings-docker.xml -DskipTests -pl api,omod -am install && \
    rm -rf /tmp/patientdocuments

# Copy build files
COPY pom.xml ./
COPY custom-modules ./custom-modules/
COPY distro ./distro/

ARG CACHE_BUST
# Build the distro, but only deploy from the amd64 build
RUN --mount=type=secret,id=m2settings,target=/usr/share/maven/ref/settings-docker.xml \
    if [ "$(arch)" != "x86_64" ]; then MVN_ARGS="$MVN_ARGS -Dmaven.deploy.skip=true"; fi && \
    mvn $MVN_ARGS $MVN_COMMAND

RUN cp /openmrs_distro/distro/target/sdk-distro/web/openmrs_core/openmrs.war /openmrs/distribution/openmrs_core/

RUN cp /openmrs_distro/distro/target/sdk-distro/web/openmrs-distro.properties /openmrs/distribution/
RUN cp -R /openmrs_distro/distro/target/sdk-distro/web/openmrs_modules /openmrs/distribution/openmrs_modules/
RUN cp -R /openmrs_distro/distro/target/sdk-distro/web/openmrs_owas /openmrs/distribution/openmrs_owas/
RUN cp -R /openmrs_distro/distro/target/sdk-distro/web/openmrs_config /openmrs/distribution/openmrs_config/

# Clean up after copying needed artifacts
RUN mvn $MVN_ARGS clean

### Run Stage
# Replace '2.7.x' with the exact version of openmrs-core built for production (if available)
FROM openmrs/openmrs-core:2.8.x-amazoncorretto-21

# Do not copy the war if using the correct openmrs-core image version
COPY --from=dev /openmrs/distribution/openmrs_core/openmrs.war /openmrs/distribution/openmrs_core/

COPY --from=dev /openmrs/distribution/openmrs-distro.properties /openmrs/distribution/
COPY --from=dev /openmrs/distribution/openmrs_modules /openmrs/distribution/openmrs_modules
COPY --from=dev /openmrs/distribution/openmrs_owas /openmrs/distribution/openmrs_owas
COPY --from=dev  /openmrs/distribution/openmrs_config /openmrs/distribution/openmrs_config

# Merge in our own custom config (locations, concepts, etc.) alongside the content-package config above
COPY configuration/ /openmrs/distribution/openmrs_config/
