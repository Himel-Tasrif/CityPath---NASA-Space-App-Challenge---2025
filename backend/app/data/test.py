import pandas as pd

df = pd.read_parquet("hex_features.parquet")
print(df.head())
print(df.columns)
