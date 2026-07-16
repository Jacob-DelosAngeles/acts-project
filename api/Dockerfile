# Build from the repo root: docker build -f api/Dockerfile .
# (needs core/ in the build context since api/ depends on it locally)
FROM python:3.10-slim

WORKDIR /app

COPY core/ /core/
COPY api/ /app/

RUN pip install --no-cache-dir /core \
    && pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 8080

CMD ["flask", "--app", "main", "run", "--host=0.0.0.0", "--port=8080"]
