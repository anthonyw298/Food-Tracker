from typing import List, Dict

def calculate_macros(entries: List[Dict]) -> Dict[str, float]:
    """Calculate total macros from food entries"""
    totals = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fats": 0.0
    }
    
    for entry in entries:
        totals["calories"] += float(entry.get("calories", 0))
        totals["protein"] += float(entry.get("protein", 0))
        totals["carbs"] += float(entry.get("carbs", 0))
        totals["fats"] += float(entry.get("fats", 0))
    
    return totals

