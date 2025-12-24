# RunPod Integration Summary

## What Changed

### New API Endpoint: `/api/analyze`
Located at: `src/routes/api/analyze/+server.ts`

**Purpose:** Single endpoint that does everything:
1. Receives text and questionId
2. Calls RunPod API to calculate perplexity
3. Stores result in database
4. Calculates user placement (percentile, rank)
5. Gets neighboring submissions
6. Returns complete analysis data

**Request:**
```json
{
  "text": "user's input text",
  "questionId": 0
}
```

**Response:**
```json
{
  "perplexity": 28.39,
  "by_token": [
    {
      "token": " went",
      "perplexity": 1121.21,
      "probability": 0.000892
    },
    ...
  ],
  "placement": {
    "percentile": 75.5,
    "rank": 42,
    "total": 100
  },
  "neighbors": {
    "lower": [
      { "text": "...", "perplexity": 25.3 },
      { "text": "...", "perplexity": 27.1 }
    ],
    "higher": [
      { "text": "...", "perplexity": 29.8 },
      { "text": "...", "perplexity": 31.2 }
    ]
  },
  "histogram": {
    "bins": [...],
    "counts": [...]
  },
  "submission_id": 123
}
```

### Updated Main Page: `src/routes/+page.svelte`

**Changes:**
1. ✅ Removed client-side `SlopAnalyzer` usage
2. ✅ Now calls `/api/analyze` endpoint instead
3. ✅ Added fake progressive animation for token display
   - Animates tokens appearing one-by-one even though server sends all at once
   - Configurable speed (faster for longer texts)
4. ✅ Updated progress messages:
   - "Sending text to RunPod for analysis..."
   - "Calculating perplexity on GPU..."
   - "Processing results..."
   - "Analysis complete! Rank: X/Y (Zth percentile)"
5. ✅ Old client-side code left in place (commented out) for reference

### Benefits

1. **Server-side processing**
   - More powerful GPU on RunPod
   - No model download needed on client
   - Faster analysis
   - Consistent results

2. **Single API call**
   - Client makes one request
   - Server handles everything (calculate + store + analyze)
   - Cleaner code

3. **Better UX**
   - Progress indicators
   - Fake progressive animation (feels responsive)
   - Shows placement immediately

4. **Database integration**
   - Automatic storage
   - Duplicate detection (via text hash)
   - Placement calculation
   - Neighboring submissions

## How It Works

### Flow:
```
User enters text
    ↓
Click "Analyze"
    ↓
POST /api/analyze
    ↓
RunPod calculates perplexity
    ↓
Store in database
    ↓
Calculate placement & neighbors
    ↓
Return complete results
    ↓
Animate display progressively
    ↓
Show placement, histogram, neighbors
```

### Questions Array
The questions are defined in both places:
- `src/routes/+page.svelte` (line 23-28)
- `src/routes/api/analyze/+server.ts` (helper function)

Make sure to keep them in sync!

## Testing

1. Start dev server: `npm run dev`
2. Go to http://localhost:5173
3. Enter text and click "Analyze"
4. Should see:
   - Progress bar
   - Animated token display
   - Perplexity score
   - Placement information
   - Histogram
   - Neighboring submissions

## Troubleshooting

### "RunPod API not configured"
- Check `.env` file has `RUNPOD_API_KEY` and `ENDPOINT_ID`
- Restart dev server after adding variables

### Slow response
- RunPod cold start can take 30-60 seconds first time
- Subsequent requests should be fast (~2-5 seconds)

### Database errors
- Check database is running
- Run migrations: `npm run migrate`

### Analysis fails
- Check RunPod endpoint is deployed and running
- Check endpoint has workers
- Check API key is valid
- Check endpoint logs on RunPod console

## Next Steps

Optional enhancements:
1. Add loading skeleton for token display
2. Cache results on client to avoid re-analysis
3. Add ability to select different models
4. Add rate limiting
5. Add authentication
6. Add share functionality (share your results)

