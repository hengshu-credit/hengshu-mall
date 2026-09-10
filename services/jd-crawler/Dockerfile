ARG PYTHON_IMAGE=python:3.12-slim-bookworm
FROM ${PYTHON_IMAGE}

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app/src DISPLAY=:99
ARG DEBIAN_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/debian
ARG DEBIAN_SECURITY_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/debian-security
RUN sed -i \
    -e "s|http://deb.debian.org/debian-security|${DEBIAN_SECURITY_MIRROR}|g" \
    -e "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
    && rm -f /etc/apt/apt.conf.d/docker-clean \
    && printf 'Binary::apt::APT::Keep-Downloaded-Packages "true";\nAcquire::Retries "3";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' > /etc/apt/apt.conf.d/99-crawler-downloads
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    chromium xvfb x11-utils x11vnc novnc websockify fonts-noto-cjk tini ca-certificates \
    && useradd --create-home --uid 1000 crawler \
    && mkdir -p /app /data/chromium && chown -R crawler:crawler /app /data
WORKDIR /app
COPY requirements.txt ./
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --disable-pip-version-check --prefer-binary --timeout 30 --retries 3 \
    --index-url "${PIP_INDEX_URL}" -r requirements.txt
COPY --chown=crawler:crawler entrypoint.sh healthcheck.py LICENSE.upstream UPSTREAM.md ./
RUN chmod +x /app/entrypoint.sh
COPY --chown=crawler:crawler src/ ./src/
USER crawler
EXPOSE 8091 6080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["python", "/app/healthcheck.py"]
ENTRYPOINT ["/usr/bin/tini", "--", "python", "-m", "jd_crawler.bootstrap"]
