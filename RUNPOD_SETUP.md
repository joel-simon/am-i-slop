# RunPod Perplexity Integration Setup

## Environment Variables

Add these to your `.env` file:

```bash
RUNPOD_API_KEY=your_runpod_api_key_here
ENDPOINT_ID=your_endpoint_id_here
```

### Where to Find These Values

1. **RUNPOD_API_KEY**:

    - Go to https://www.runpod.io/console/user/settings
    - Create or copy your API key

2. **ENDPOINT_ID**:
    - Deploy your endpoint on RunPod (see `scripts/README_RUNPOD.md`)
    - Find it in your endpoint URL: `https://api.runpod.ai/v2/{ENDPOINT_ID}/...`
    - Or copy it from the endpoint details page

## Testing the Integration

1. Make sure your RunPod endpoint is deployed and running
2. Add the environment variables to `.env`
3. Start your dev server: `npm run dev`
4. Navigate to: http://localhost:5173/perplexity
5. Enter text and click "Calculate Perplexity"

## API Endpoints

### POST `/api/perplexity`

Calculate perplexity for a given text.

**Request:**

```json
{
    "text": "I went to the store"
}
```

**Response:**

```json
{
    "total_perplexity": 28.39,
    "by_token": [
        {
            "token": " went",
            "perplexity": 1121.21,
            "probability": 0.000892
        },
        {
            "token": " to",
            "perplexity": 2.56,
            "probability": 0.390448
        }
    ]
}
```

## UI Features

The perplexity test page (`/perplexity`) includes:

- ✅ Text input with sample texts
- ✅ Total perplexity display with color coding
- ✅ Per-token breakdown with:
    - Individual token display
    - Perplexity score per token
    - Probability percentage per token
    - Visual probability bars
- ✅ Terminal-style theme matching your app

## Troubleshooting

### "RunPod API not configured" error

- Make sure `RUNPOD_API_KEY` and `ENDPOINT_ID` are in your `.env` file
- Restart your dev server after adding environment variables

### Timeout errors

- Check that your RunPod endpoint is running
- Verify the endpoint has active workers
- Increase timeout in `/api/perplexity/+server.ts` if needed

### "Failed to calculate perplexity" error

- Check your RunPod endpoint logs in the console
- Verify your API key is correct
- Ensure the endpoint is deployed with the correct Docker image
