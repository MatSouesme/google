import os
import pandas as pd

demo_dir = r'd:\google\csrd-copilot-mvp\data\demo'
print(f"Converting CSVs in {demo_dir}...")

for filename in os.listdir(demo_dir):
    if filename.endswith('.csv'):
        csv_path = os.path.join(demo_dir, filename)
        xlsx_path = os.path.join(demo_dir, filename.replace('.csv', '.xlsx'))
        try:
            # Try reading with default encoding (utf-8)
            try:
                df = pd.read_csv(csv_path)
            except UnicodeDecodeError:
                # Fallback to latin-1 if utf-8 fails
                df = pd.read_csv(csv_path, encoding='latin-1')
                
            df.to_excel(xlsx_path, index=False)
            print(f"✅ Converted {filename} -> {os.path.basename(xlsx_path)}")
        except Exception as e:
            print(f"❌ Failed to convert {filename}: {e}")
