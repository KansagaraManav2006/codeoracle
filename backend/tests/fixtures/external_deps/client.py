import requests
import json
from datetime import datetime

def fetch_data():
    r = requests.get("https://api.example.com")
    return r.json()
