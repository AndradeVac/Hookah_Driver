#!/usr/bin/env python
import requests
import json

# API base URL
API_URL = "https://hookah-driver-api.onrender.com"

# Get all brands
brands_response = requests.get(f"{API_URL}/brands")
brands = brands_response.json()
ziggy = next((b for b in brands if b['name'] == 'Ziggy'), None)

if not ziggy:
    print("Ziggy brand not found!")
    exit(1)

print(f"Found Ziggy brand: {ziggy['id']}")

# List of Ziggy flavors that should exist (from the images we have)
all_ziggy_flavors = [
    "Banana",
    "Berry",
    "Berry 2",
    "Burleymint",
    "Cherry",
    "Coffecream Instagram",
    "Coffeecream",
    "Cornmagic",
    "Fresh66",
    "Freshlemon",
    "Freshmelon",
    "Frutasamarelas",
    "Grape",
    "Manga",
    "Melão",
    "Menta",
    "Mix Duasgoiabas",
    "Mix Duasmacas",
    "Mix Frutasroxas",
    "Mix Frutasverdes",
    "Mix Morangoelaranja",
    "Mix Morangoelaranja 02",
    "Morango",
    "Pistache",
    "Sorvetedelimao",
    "Watermelon",
    "Yogurt",
]

# Get current flavors
flavors_response = requests.get(f"{API_URL}/flavors")
flavors = flavors_response.json()
ziggy_flavors = [f['name'] for f in flavors if f['brand_id'] == ziggy['id']]

print(f"\nCurrent Ziggy flavors in API: {len(ziggy_flavors)}")
print(f"Expected Ziggy flavors: {len(all_ziggy_flavors)}")

# Find missing flavors
missing = [f for f in all_ziggy_flavors if f not in ziggy_flavors]
print(f"\nMissing flavors: {len(missing)}")
for f in missing:
    print(f"  - {f}")

# Since we can't authenticate to create flavors via this script,
# print instructions for manual creation or note that admin needs to add them
if missing:
    print(f"\n⚠️  {len(missing)} flavors are missing from production!")
    print("These need to be added manually via the admin interface or an authenticated request.")
