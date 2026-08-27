import json
import sys

import matplotlib.pyplot as plt
import numpy as np


if len(sys.argv) != 3:
    raise SystemExit("usage: python scripts/plot-ngram-histogram.py INPUT.json OUTPUT.png")

input_path, output_path = sys.argv[1:]
with open(input_path, encoding="utf-8") as file:
    data = json.load(file)

means = np.array([
    np.mean([frequency for frequency in word["frequencies"].values() if frequency is not None])
    for word in data["words"]
])
bins = np.logspace(np.log10(means.min()), np.log10(means.max()), 18)

fig, axis = plt.subplots(figsize=(9, 5.5))
axis.hist(means, bins=bins, color="#71845f", edgecolor="#f3eedf", linewidth=1.2)
axis.set_xscale("log")
axis.set_xlabel("Mean normalized frequency (%) — logarithmic scale")
axis.set_ylabel("Number of words")
axis.set_title("Google Ngram frequency distribution for the first 100 allowed words")
axis.grid(axis="y", color="#d8d2c4", linewidth=0.8)
fig.tight_layout()
fig.savefig(output_path, dpi=180)
print(f"Wrote histogram for {len(means)} words to {output_path}")
