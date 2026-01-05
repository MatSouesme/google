import pandas as pd
import os

csv_path = r'd:\google\csrd-copilot-mvp\data\demo\g1_demo_data.csv'
xlsx_path = r'd:\google\csrd-copilot-mvp\data\demo\g1_demo_data.xlsx'

try:
    print(f"Reading {csv_path}...")
    # Try reading with default encoding (utf-8)
    try:
        df = pd.read_csv(csv_path)
    except UnicodeDecodeError:
        # Fallback to latin-1 if utf-8 fails
        df = pd.read_csv(csv_path, encoding='latin-1')
    
    print(f"Writing to {xlsx_path}...")
    df.to_excel(xlsx_path, index=False)
    print(f"✅ Successfully created {xlsx_path}")

except Exception as e:
    print(f"❌ Failed to convert: {e}")
