import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer

def clean_stack_overflow_data(file_path):
    # Load the dataset
    print("Loading dataset...")
    data = pd.read_csv(file_path)
    print(f"Dataset loaded with {data.shape[0]} rows and {data.shape[1]} columns.")

    # Select and rename relevant columns
    columns_to_keep = {
        "DevType": "Job Role",                     # Developer types (Job roles)
        "LanguageHaveWorkedWith": "Programming Languages",  # Programming languages
        "DatabaseHaveWorkedWith": "Databases",    # Databases
        "PlatformHaveWorkedWith": "Platforms",    # Platforms
        "WebframeHaveWorkedWith": "Web Frameworks",  # Web frameworks
        "AISearchDevHaveWorkedWith": "AI Tools",  # AI tools
        "NEWCollabToolsHaveWorkedWith": "IDE Collaboration Tools",  # Collaboration tools
        "OfficeStackAsyncHaveWorkedWith": "Office Stack Tools",  # Office stack tools
        "Industry": "Industry"                    # Industries
    }
    cleaned_data = data[list(columns_to_keep.keys())].rename(columns=columns_to_keep)
    print(f"Columns selected and renamed: {list(columns_to_keep.values())}")

    # Drop rows with null values in critical columns
    critical_columns = ["Job Role", "Programming Languages", "Industry", "IDE Collaboration Tools", "Office Stack Tools"]
    print(f"Dropping rows with null values in critical columns: {critical_columns}")
    cleaned_data = cleaned_data.dropna(subset=critical_columns).reset_index(drop=True)
    print(f"Dataset size after removing critical null values: {cleaned_data.shape[0]} rows.")

    # Columns to impute with KNN
    columns_to_impute = ["Databases", "Platforms", "Web Frameworks", "AI Tools"]
    print(f"Imputing missing values for columns: {columns_to_impute}")

    # Convert "Unknown" values to NaN for KNN imputation
    knn_data = cleaned_data.copy()
    for col in columns_to_impute:
        knn_data[col] = knn_data[col].replace("Unknown", np.nan)
    print("Converted 'Unknown' values to NaN for KNN imputation.")

    # Factorize columns for imputation
    factorized_data = knn_data[columns_to_impute].apply(lambda col: pd.factorize(col)[0])
    print("Data factorized for KNN imputation.")

    # Apply KNN Imputation
    imputer = KNNImputer(n_neighbors=10, weights="uniform")
    imputed_values = imputer.fit_transform(factorized_data)
    imputed_data = pd.DataFrame(imputed_values, columns=columns_to_impute)
    print("KNN imputation complete.")

    # Map imputed values back to original categories
    for col in columns_to_impute:
        original_categories = pd.factorize(knn_data[col])[1]
        imputed_data[col] = imputed_data[col].round().astype(int).map(lambda x: original_categories[x] if x < len(original_categories) else "Unknown")
    print("Mapped imputed data back to original categories.")

    # Replace original columns with imputed values
    cleaned_data[columns_to_impute] = imputed_data
    print("Replaced columns with imputed values.")

    return cleaned_data

def split_columns_to_rows(df, columns):
    df = df.copy()
    for col in columns:
        # Remove brackets, strip whitespace, split values by comma, and limit to 3 values
        df[col] = df[col].apply(
            lambda x: x.strip("[]").replace("'", "").split(", ")[:2] if isinstance(x, str) else []
        )
    # Explode each column individually to ensure consistency
    for col in columns:
        df = df.explode(col, ignore_index=True)
    print(f"Split and exploded columns: {columns}")
    return df

# Example usage
file_path = "stack_overflow_survey_2024.csv"
print("Starting data cleaning process...")
cleaned_data = clean_stack_overflow_data(file_path)

# Splitting columns into separate rows for specified categories
columns_to_split = [
    "Programming Languages", "Databases", "Platforms", 
    "Web Frameworks", "AI Tools", "IDE Collaboration Tools", "Office Stack Tools", "Industry"
]
final_cleaned_data = split_columns_to_rows(cleaned_data, columns_to_split)

final_cleaned_data = final_cleaned_data.sample(frac=0.1, random_state=42).reset_index(drop=True)
print(f"Sampled dataset size: {final_cleaned_data.shape[0]} rows.")

# Save the final cleaned data
output_file = "d3_data.csv"
final_cleaned_data.to_csv(output_file, index=False)
print(f"Data cleaning and transformation complete. Saved to {output_file}.")
