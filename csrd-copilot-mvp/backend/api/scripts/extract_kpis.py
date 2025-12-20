import json
import os
import re

def extract_kpis():
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    js_path = os.path.join(base_dir, "frontend", "src", "data", "kpis.js")
    output_path = os.path.join(base_dir, "backend", "api", "data", "kpis.json")
    
    print(f"Reading from: {js_path}")
    
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Extract the array content
        # Look for [ ... ]
        match = re.search(r"export const kpis = (\[.*\])", content, re.DOTALL)
        if not match:
            # Try finding the first [ and last ]
            start = content.find('[')
            end = content.rfind(']')
            if start != -1 and end != -1:
                json_str = content[start:end+1]
            else:
                print("Could not find KPI array in file")
                return
        else:
            json_str = match.group(1)
            
        # JS might have trailing commas which JSON doesn't like
        # Simple regex to remove trailing commas before ] or }
        json_str = re.sub(r',(\s*[\]}])', r'\1', json_str)
        
        data = json.loads(json_str)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully extracted {len(data)} KPIs to {output_path}")
        
    except Exception as e:
        print(f"Error extracting KPIs: {e}")

if __name__ == "__main__":
    extract_kpis()
