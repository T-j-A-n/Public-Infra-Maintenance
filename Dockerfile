FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy models and backend code
COPY models/ ./models/
COPY backend/ ./backend/

# Expose port (Railway/Render will set PORT env var)
EXPOSE 8000

# Start the API
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
