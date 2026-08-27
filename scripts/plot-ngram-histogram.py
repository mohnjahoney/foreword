import json
import sys

import matplotlib.pyplot as plt
import numpy as np


if len(sys.argv) != 4:
    raise SystemExit("usage: python scripts/plot-ngram-histogram.py NGRAMS.json LABELS.json OUTPUT.png")

input_path, labels_path, output_path = sys.argv[1:]
with open(input_path, encoding="utf-8") as file:
    data = json.load(file)
with open(labels_path, encoding="utf-8") as file:
    labels = json.load(file)["labels"]

categories = ["common", "familiar", "unusual", "obscure"]
colors = ["#355c7d", "#6c8e5e", "#c49a52", "#936b8d"]
label_by_word = {item["word"]: item["category"] for item in labels}
means_by_category = {category: [] for category in categories}
for word in data["words"]:
    frequencies = [frequency for frequency in word["frequencies"].values() if frequency is not None]
    if frequencies:
        means_by_category[label_by_word[word["word"]]].append(np.mean(frequencies))

all_means = np.concatenate([values for values in means_by_category.values() if values])
bins = np.logspace(np.log10(all_means.min()), np.log10(all_means.max()), 18)

fig, axes = plt.subplots(2, 2, figsize=(10, 7), sharex=True, sharey=True)
for axis, category, color in zip(axes.flat, categories, colors):
    values = means_by_category[category]
    axis.hist(values, bins=bins, color=color, edgecolor="#f3eedf", linewidth=1.0)
    axis.set_xscale("log")
    axis.set_title(f"{category.title()} ({len(values)} words)")
    axis.grid(axis="y", color="#d8d2c4", linewidth=0.8)
    axis.set_ylabel("Number of words")
    axis.set_xlabel("Mean normalized frequency (%) — logarithmic scale")
fig.suptitle("Google Ngram frequency by blind familiarity category")
fig.tight_layout()
fig.savefig(output_path, dpi=180)
print(f"Wrote four histograms for {len(all_means)} words with Ngram data to {output_path}")
