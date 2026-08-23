import json

with open("frontend/src/assets/skus.json", "r") as f:
    skus = json.load(f)

# Update Babies
skus["0502B"] = "Babies - Blanket 0-5T"
skus["0503B"] = "Babies - Weighted Blanket 0-5T"

# Update Youth/Adult
skus["0502Y"] = "Youth/Adult - Blanket"
skus["0503Y"] = "Youth/Adult - Weighted Blanket"

with open("frontend/src/assets/skus.json", "w") as f:
    json.dump(skus, f, indent=4)
