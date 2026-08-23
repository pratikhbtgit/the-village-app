import json

with open("frontend/src/assets/skus.json", "r") as f:
    skus = json.load(f)

skus["0502B"] = "Bedding - Blanket 0-5T"
skus["0503B"] = "Bedding - Weighted Blanket 0-5T"
skus["0503Y"] = "Bedding - Weighted Blanket"

with open("frontend/src/assets/skus.json", "w") as f:
    json.dump(skus, f, indent=4)
