import pandas as pd

# Load the dataset
data_path = "survey_results_public.csv"  
data = pd.read_csv(data_path)

# Relevant columns
columns = ["MainBranch", "AISearchDevHaveWorkedWith", "AISearchDevWantToWorkWith"]
filtered_data = data[columns].dropna(subset=["AISearchDevHaveWorkedWith", "AISearchDevWantToWorkWith"], how="all")

# Map respondent types
def map_main_branch(main_branch):
    if main_branch == "I am a developer by profession":
        return "Professional Developers"
    elif main_branch == "I am learning to code":
        return "Learning to Code"
    else:
        return "Other Coders"

# Create source-target pairs
def create_source_target(df):
    rows = []
    for _, row in df.iterrows():
        if pd.notna(row["AISearchDevHaveWorkedWith"]) and pd.notna(row["AISearchDevWantToWorkWith"]):
            sources = row["AISearchDevHaveWorkedWith"].split(";")
            targets = row["AISearchDevWantToWorkWith"].split(";")
            for source in sources:
                for target in targets:
                    rows.append({
                        "Source": source.strip(),
                        "Target": target.strip(),
                        "RespondentType": map_main_branch(row["MainBranch"])
                    })
    return pd.DataFrame(rows)

# Generate source-target pairs
source_target_data = create_source_target(filtered_data)

# Aggregate connection counts
aggregated_data = (
    source_target_data.groupby(["Source", "Target", "RespondentType"])
    .size()
    .reset_index(name="ConnectionCount")
)

all_respondents = aggregated_data.groupby(["Source", "Target"]).sum(numeric_only=True).reset_index()
all_respondents["RespondentType"] = "All Respondents"

combined_data = pd.concat([aggregated_data, all_respondents], ignore_index=True)

combined_file_path = "chord_data.csv"
combined_data.to_csv(combined_file_path, index=False)
print(f"Combined data saved to {combined_file_path}")
