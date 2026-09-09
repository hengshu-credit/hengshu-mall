FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app/src DISPLAY=:99
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    chromium xvfb x11-utils x11vnc novnc websockify fonts-noto-cjk tini ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 crawler \
    && mkdir -p /app /data/chromium && chown -R crawler:crawler /app /data
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=crawler:crawler . .
RUN chmod +x /app/entrypoint.sh
USER crawler
EXPOSE 8091 6080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["python", "/app/healthcheck.py"]
ENTRYPOINT ["/usr/bin/tini", "--", "python", "-m", "jd_crawler.bootstrap"]
