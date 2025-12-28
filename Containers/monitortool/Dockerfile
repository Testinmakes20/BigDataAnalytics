FROM python:3.11-slim

WORKDIR /app
RUN pip install pymongo

COPY monitor.py .
CMD ["python", "monitor.py"]
