# RunPod Serverless Worker - Text Perplexity Calculator

This RunPod worker calculates the perplexity of text using GPT-2 or other causal language models from HuggingFace.

## Files

- `rp_handler.py` - Main handler function for RunPod
- `Dockerfile` - Container configuration for deployment
- `requirements.txt` - Python dependencies
- `test_input.json` - Sample input for local testing
- `main.py` - Original standalone script (for reference)

## Local Testing

### 1. Create and activate a virtual environment

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Test the handler locally

Using the test input file:

```bash
python rp_handler.py
```

Or with custom input:

```bash
python rp_handler.py --test_input '{"input": {"text": "The quick brown fox jumps over the lazy dog"}}'
```

## Docker Deployment

### 1. Build the Docker image

Replace `[YOUR_USERNAME]` with your Docker Hub username:

```bash
docker build --platform linux/amd64 --tag [YOUR_USERNAME]/perplexity-worker:latest .
```

### 2. Test locally with Docker (optional)

```bash
docker run --rm [YOUR_USERNAME]/perplexity-worker:latest
```

### 3. Push to Docker Hub

```bash
docker push [YOUR_USERNAME]/perplexity-worker:latest
```

## RunPod Deployment

1. Go to [RunPod Serverless](https://www.console.runpod.io/serverless)
2. Click **New Endpoint**
3. Click **Import from Docker Registry**
4. Enter your Docker image URL: `docker.io/[YOUR_USERNAME]/perplexity-worker:latest`
5. Click **Next**
6. Configure your endpoint:
    - Set **Endpoint Type** to **Queue**
    - Select GPU configuration (16 GB+ recommended)
    - **IMPORTANT: Under "Model", enter `gpt2`** (enables cached model for faster cold starts)
    - Adjust worker count and timeout as needed
7. Click **Deploy Endpoint**

### Using Cached Models (Recommended)

This worker is designed to use RunPod's cached model feature, which provides:

- **Faster cold starts** (seconds instead of minutes)
- **No cost** for model download time
- **Smaller Docker images**

Simply enter `gpt2` in the **Model** field when creating your endpoint. RunPod will automatically cache the model on the host machines, dramatically reducing startup time.

## API Usage

### Request Format

```json
{
    "input": {
        "text": "Your text to analyze",
        "model_name": "gpt2" // Optional, defaults to gpt2
    }
}
```

### Response Format

```json
{
    "total_perplexity": 25.6789,
    "by_token": [
        {
            "token": " I",
            "perplexity": 12.3456,
            "probability": 0.0809
        },
        {
            "token": " went",
            "perplexity": 8.9012,
            "probability": 0.1124
        }
    ]
}
```

### Example cURL Request

```bash
curl -X POST https://api.runpod.ai/v2/[ENDPOINT_ID]/runsync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_API_KEY]" \
  -d '{
    "input": {
      "text": "I went to the store"
    }
  }'
```

## Supported Models

You can use any causal language model from HuggingFace by specifying the `model_name` parameter:

- `gpt2` (default) - 124M parameters
- `gpt2-medium` - 355M parameters
- `gpt2-large` - 774M parameters
- `gpt2-xl` - 1.5B parameters
- `EleutherAI/gpt-neo-125M`
- `EleutherAI/gpt-neo-1.3B`
- `EleutherAI/gpt-neo-2.7B`
- And many more...

**Note:** Larger models require more GPU memory and will take longer to load on first use.

## Performance Tips

1. **Use the default model when possible** - GPT-2 small is pre-loaded and ready to go
2. **Batch requests** - Process multiple texts in a single job if needed
3. **Configure worker count** - Adjust based on your expected load
4. **Set appropriate timeouts** - Larger models and longer texts need more time

## Cost Optimization

- Start with 1-2 workers and scale based on demand
- Use GPUs with sufficient VRAM (16 GB for most models)
- Set reasonable idle timeout to avoid paying for unused capacity
- Monitor your usage in the RunPod console

## Troubleshooting

### Model loading fails

- Ensure sufficient GPU memory for the selected model
- Check that the model name is valid on HuggingFace

### Timeout errors

- Increase the timeout setting in your endpoint configuration
- Consider using a smaller model
- Reduce the input text length

### Out of memory errors

- Use a GPU with more VRAM
- Reduce batch size if processing multiple texts
- Use a smaller model

## Support

For issues or questions:

- RunPod Documentation: https://docs.runpod.io
- RunPod Discord: https://discord.gg/runpod
- HuggingFace Transformers: https://huggingface.co/docs/transformers
