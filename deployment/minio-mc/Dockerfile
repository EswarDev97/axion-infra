FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
RUN curl -sSL -o /usr/local/bin/mc \
      "https://dl.min.io/client/mc/release/linux-amd64/archive/mc.${MC_RELEASE}" && \
    chmod +x /usr/local/bin/mc

ENTRYPOINT ["mc"]
