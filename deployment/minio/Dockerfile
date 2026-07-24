FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

ARG MINIO_RELEASE=RELEASE.2025-09-07T16-13-09Z
RUN curl -sSL -o /usr/local/bin/minio \
      "https://dl.min.io/server/minio/release/linux-amd64/archive/minio.${MINIO_RELEASE}" && \
    chmod +x /usr/local/bin/minio

EXPOSE 9000 9001

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
