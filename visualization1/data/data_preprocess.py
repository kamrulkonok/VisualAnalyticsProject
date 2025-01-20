import pandas as pd
import numpy as np

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
        "ConvertedCompYearly": "Annual Salary",   # Annual salary
        "JobSat": "Job Satisfaction",             # Job satisfaction
        "AISent": "AI Sentiment",                 # AI sentiment column
        "Country": "Country",                     # Country for filtering
        "Industry": "Industry"                    # Industries
    }
    cleaned_data = data[list(columns_to_keep.keys())].rename(columns=columns_to_keep)
    print(f"Columns selected and renamed: {list(columns_to_keep.values())}")

    # Drop rows with any missing values
    print(f"Initial dataset size: {cleaned_data.shape[0]} rows.")
    cleaned_data = cleaned_data.dropna().reset_index(drop=True)
    print(f"Dataset size after dropping missing values: {cleaned_data.shape[0]} rows.")

    # Exclude rows with zero salary
    print("Excluding rows with zero salary...")
    cleaned_data = cleaned_data[cleaned_data["Annual Salary"] > 0].reset_index(drop=True)
    print(f"Dataset size after excluding zero salaries: {cleaned_data.shape[0]} rows.")

    # Apply capping method for realistic annual salary range
    min_cap = 10000
    max_cap = 150000
    print(f"Capping salaries to the range: {min_cap} - {max_cap}")
    cleaned_data["Annual Salary"] = cleaned_data["Annual Salary"].clip(lower=min_cap, upper=max_cap)
    print(f"Dataset size after capping salaries: {cleaned_data.shape[0]} rows.")

    # Map AI Sentiment to numeric values
    sentiment_mapping = {
        "Very favorable": 5,
        "Favorable": 4,
        "Indifferent": 3,
        "Unsure": 2,
        "Unfavorable": 1,
        "Very unfavorable": 0
    }
    print("Mapping AI Sentiment values...")
    cleaned_data["AI Sentiment"] = cleaned_data["AI Sentiment"].map(sentiment_mapping).fillna(0).astype(int)

    # Drop duplicates
    print(f"Dataset size before dropping duplicates: {cleaned_data.shape[0]} rows.")
    cleaned_data = cleaned_data.drop_duplicates().reset_index(drop=True)
    print(f"Dataset size after dropping duplicates: {cleaned_data.shape[0]} rows.")

    return cleaned_data

def calculate_additional_metrics(df):
    # Calculate metrics: average salary, AI sentiment, and job satisfaction by job role and industry
    print("Calculating additional metrics...")
    metrics = df.groupby(["Industry", "Job Role", "Country"]).agg(
        Average_Salary_By_Country=("Annual Salary", "mean")
    ).reset_index()

    industry_job_role_metrics = df.groupby(["Industry", "Job Role"]).agg(
        Average_Salary=("Annual Salary", "mean"),
        Average_Job_Satisfaction=("Job Satisfaction", "mean"),
        Average_AI_Sentiment=("AI Sentiment", "mean"),
        Count=("Job Role", "size")
    ).reset_index()

    # Replace unrealistic averages with NaN and re-calculate group means
    metrics.loc[metrics["Average_Salary_By_Country"] < 10000, "Average_Salary_By_Country"] = np.nan
    industry_job_role_metrics.loc[industry_job_role_metrics["Average_Salary"] < 10000, "Average_Salary"] = np.nan

    metrics["Average_Salary_By_Country"] = metrics.groupby(["Industry", "Job Role"])["Average_Salary_By_Country"].transform(lambda x: x.fillna(x.mean()))
    industry_job_role_metrics["Average_Salary"] = industry_job_role_metrics.groupby(["Industry", "Job Role"])["Average_Salary"].transform(lambda x: x.fillna(x.mean()))

    # Round metrics to 2 decimal places
    metrics["Average_Salary_By_Country"] = metrics["Average_Salary_By_Country"].round(2)
    industry_job_role_metrics[["Average_Salary", "Average_Job_Satisfaction", "Average_AI_Sentiment"]] = industry_job_role_metrics[
        ["Average_Salary", "Average_Job_Satisfaction", "Average_AI_Sentiment"]
    ].round(2)

    print("Calculated additional metrics: Average Salary by Country, Industry, and Job Role.")
    return metrics, industry_job_role_metrics

def merge_metrics_with_data(df, country_metrics, industry_metrics):
    print("Merging aggregated metrics into the dataset...")
    df = df.merge(country_metrics, on=["Industry", "Job Role", "Country"], how="left")
    df = df.merge(industry_metrics, on=["Industry", "Job Role"], how="left")
    print("Merged aggregated metrics into the dataset.")
    return df

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

# Calculate additional metrics
country_metrics, industry_metrics = calculate_additional_metrics(cleaned_data)

# Splitting columns into separate rows for specified categories
columns_to_split = [
    "Programming Languages", "Databases", "Platforms", 
    "Web Frameworks", "AI Tools", "IDE Collaboration Tools", "Office Stack Tools", "Industry"
]
final_cleaned_data = split_columns_to_rows(cleaned_data, columns_to_split)

# Merge metrics back into the final dataset for use in visualization
final_cleaned_data = merge_metrics_with_data(final_cleaned_data, country_metrics, industry_metrics)

# Remove rows with missing aggregated metrics
required_columns = ["Average_Salary_By_Country", "Average_Salary", "Average_Job_Satisfaction", "Average_AI_Sentiment", "Count"]
final_cleaned_data = final_cleaned_data.dropna(subset=required_columns).reset_index(drop=True)

# Save the final cleaned data
output_file = "circular_pack_dataset.csv"
final_cleaned_data.to_csv(output_file, index=False)
print(f"Data cleaning and transformation complete. Saved to {output_file}.")
