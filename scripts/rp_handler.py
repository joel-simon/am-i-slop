#!/usr/bin/env python3
"""
RunPod Serverless handler for calculating text perplexity using GPT-2.
Uses RunPod's cached models feature for faster cold starts.
"""

import runpod
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import math
import os

# Determine device (GPU if available, otherwise CPU)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Initializing model on device: {device}")

# RunPod cached model settings
CACHE_DIR = "/runpod-volume/huggingface-cache/hub"
DEFAULT_MODEL = "gpt2"


def find_model_path(model_name):
    """
    Find the path to a cached model in RunPod's cache directory.

    Args:
        model_name: The model name from Hugging Face (e.g., 'gpt2')

    Returns:
        The full path to the cached model, or None if not found
    """
    # Convert model name format: "Org/Model" -> "models--Org--Model"
    cache_name = model_name.replace("/", "--")
    snapshots_dir = os.path.join(CACHE_DIR, f"models--{cache_name}", "snapshots")

    # Check if the model exists in cache
    if os.path.exists(snapshots_dir):
        snapshots = os.listdir(snapshots_dir)
        if snapshots:
            # Return the path to the first (usually only) snapshot
            return os.path.join(snapshots_dir, snapshots[0])

    return None


# Try to use cached model, fall back to downloading if not available
print(f"Loading model: {DEFAULT_MODEL}")
model_path = find_model_path(DEFAULT_MODEL)

if model_path:
    print(f"Using cached model from: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    model = AutoModelForCausalLM.from_pretrained(model_path, local_files_only=True)
else:
    print("Cached model not found, downloading from HuggingFace...")
    tokenizer = AutoTokenizer.from_pretrained(DEFAULT_MODEL)
    model = AutoModelForCausalLM.from_pretrained(DEFAULT_MODEL)

model.eval()
model.to(device)
print("Model loaded successfully")


def calculate_perplexity(text: str, model_to_use=None, tokenizer_to_use=None) -> dict:
    """
    Calculate perplexity of input text.

    Args:
        text: Input string to analyze
        model_to_use: Pre-loaded model to use
        tokenizer_to_use: Pre-loaded tokenizer to use

    Returns:
        Dictionary with total_perplexity and by_token breakdown
    """
    # Use provided model/tokenizer or fall back to global
    current_model = model_to_use or model
    current_tokenizer = tokenizer_to_use or tokenizer

    # Tokenize input
    encodings = current_tokenizer(text, return_tensors="pt")
    input_ids = encodings.input_ids.to(device)

    # Get model predictions
    with torch.no_grad():
        outputs = current_model(input_ids, labels=input_ids)
        # outputs.loss is the average negative log-likelihood per token
        loss = outputs.loss

        # Get logits for per-token calculation
        logits = outputs.logits

    # Calculate total perplexity
    total_perplexity = torch.exp(loss).item()

    # Calculate per-token perplexity
    by_token = []

    # For each token (starting from token 1, since we predict it from token 0)
    for i in range(1, input_ids.shape[1]):
        # Get the logits for predicting token i (from position i-1)
        token_logits = logits[0, i - 1, :]

        # Get the actual token that appeared
        target_token_id = input_ids[0, i].item()

        # Calculate log probability of the actual token
        log_probs = torch.nn.functional.log_softmax(token_logits, dim=-1)
        token_log_prob = log_probs[target_token_id].item()

        # Convert to perplexity (exp of negative log prob)
        token_perplexity = math.exp(-token_log_prob)

        # Convert to probability (exp of log prob) - ranges 0-1, intuitive!
        token_probability = math.exp(token_log_prob)

        # Decode the token to get its string representation
        token_string = current_tokenizer.decode([target_token_id])

        by_token.append(
            {
                "token": token_string,
                "perplexity": token_perplexity,
                "probability": token_probability,
            }
        )

    return {"total_perplexity": total_perplexity, "by_token": by_token}


def handler(job):
    """
    RunPod handler function to process incoming requests.

    Expected input format:
    {
        "input": {
            "text": "Text to analyze",
            "model_name": "gpt2"  # Optional, defaults to gpt2
        }
    }

    Returns:
    {
        "total_perplexity": float,
        "by_token": [
            {
                "token": str,
                "perplexity": float,
                "probability": float
            },
            ...
        ]
    }
    """
    try:
        job_input = job["input"]

        # Validate input
        if "text" not in job_input:
            return {"error": "Input must contain 'text' field"}

        text = job_input["text"]
        model_name = job_input.get("model_name", DEFAULT_MODEL)

        print(f"Processing text: '{text[:50]}{'...' if len(text) > 50 else ''}'")
        print(f"Using model: {model_name}")

        # If a different model is requested, load it
        if model_name != DEFAULT_MODEL:
            print(f"Loading custom model: {model_name}")

            # Try to use cached model first
            custom_model_path = find_model_path(model_name)

            if custom_model_path:
                print(f"Using cached model from: {custom_model_path}")
                custom_tokenizer = AutoTokenizer.from_pretrained(
                    custom_model_path, local_files_only=True
                )
                custom_model = AutoModelForCausalLM.from_pretrained(
                    custom_model_path, local_files_only=True
                )
            else:
                print("Cached model not found, downloading from HuggingFace...")
                custom_tokenizer = AutoTokenizer.from_pretrained(model_name)
                custom_model = AutoModelForCausalLM.from_pretrained(model_name)

            custom_model.eval()
            custom_model.to(device)

            result = calculate_perplexity(text, custom_model, custom_tokenizer)

            # Clean up custom model
            del custom_model
            del custom_tokenizer
            if device == "cuda":
                torch.cuda.empty_cache()
        else:
            result = calculate_perplexity(text)

        print(f"Perplexity calculated: {result['total_perplexity']:.4f}")
        return result

    except Exception as e:
        print(f"Error processing job: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    print("Starting RunPod Serverless worker...")
    runpod.serverless.start({"handler": handler})
