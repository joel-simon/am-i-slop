#!/usr/bin/env python3
"""
Calculate perplexity of a string using GPT-2 small model.
Returns total perplexity and per-token breakdown.
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import math

# Use CPU by default due to MPS compatibility issues with some operations
# Change to "mps" if you want to try GPU acceleration (may have issues)
device = "cpu"
print(f"Using device: {device}")


def calculate_perplexity(text: str, model_name: str = "gpt2") -> dict:
    """
    Calculate perplexity of input text.

    Args:
        text: Input string to analyze
        model_name: HuggingFace model name (default: "gpt2" - smallest GPT-2)

    Returns:
        Dictionary with total_perplexity and by_token breakdown
    """
    # Load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.eval()
    model.to(device)

    # Tokenize input
    encodings = tokenizer(text, return_tensors="pt")
    input_ids = encodings.input_ids.to(device)

    # Get model predictions
    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
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
        token_string = tokenizer.decode([target_token_id])

        by_token.append(
            {
                "token": token_string,
                "perplexity": token_perplexity,
                "probability": token_probability,
            }
        )

    return {"total_perplexity": total_perplexity, "by_token": by_token}


if __name__ == "__main__":
    import sys
    import json

    # Get input from command line or use default
    if len(sys.argv) > 1:
        input_text = " ".join(sys.argv[1:])
    else:
        input_text = "I went to the store"

    print(f"Calculating perplexity for: '{input_text}'\n")

    result = calculate_perplexity(input_text)

    print(f"Total Perplexity: {result['total_perplexity']:.4f}\n")
    print("Per-token breakdown:")
    for item in result["by_token"]:
        token = item["token"]
        ppl = item["perplexity"]
        prob = item["probability"]
        print(f"  {repr(token):20s} -> PPL: {ppl:7.4f}  Prob: {prob:.4f}")

    print("\nJSON output:")
    print(json.dumps(result, indent=2))
