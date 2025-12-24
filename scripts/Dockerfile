# Use NVIDIA CUDA base image for GPU support
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Set working directory
WORKDIR /app

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip3 install --no-cache-dir --upgrade pip

# Install Python dependencies
# NOTE: Model is NOT included in the image - it will be cached by RunPod
RUN pip3 install --no-cache-dir \
    runpod \
    torch \
    transformers \
    accelerate

# Copy handler file
COPY rp_handler.py /app/

# Start the container
CMD ["python3", "-u", "rp_handler.py"]

