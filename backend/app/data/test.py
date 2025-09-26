import pandas as pd

df = pd.read_parquet("hex_features_ext.parquet")
print(df.head())
print(df.columns)
