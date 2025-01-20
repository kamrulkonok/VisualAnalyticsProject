import json
import pandas as pd


def prepare_hierarchical_json_with_country(data, country_col="Country"):
    """
    Prepares a hierarchical JSON structure for a circular packing chart,
    including country data in tooltips.

    Args:
    - data (DataFrame): The cleaned dataset.
    - country_col (str): The column containing country information.

    Returns:
    - dict: Hierarchical JSON structure.
    """
    # Extract unique countries for filtering
    unique_countries = sorted(data[country_col].dropna().unique().tolist())
    unique_countries.insert(0, "All Countries")  # Add "All Countries" option

    industries = []

    for industry_name, industry_group in data.groupby("Industry"):
        # Replace missing country values with "Unknown"
        industry_group[country_col] = industry_group[country_col].fillna("Unknown")

        # Level 1: Industry
        industry_node = {
            "name": industry_name,
            "children": [],
            "size": int(industry_group["Count"].sum()),
            "tooltip": {
                "Industry": industry_name,
                "Average Job Satisfaction": round(industry_group["Average_Job_Satisfaction"].mean(), 2),
                "Average AI Sentiment": round(industry_group["Average_AI_Sentiment"].mean(), 2),
            }
        }

        for job_role_name, job_role_group in industry_group.groupby("Job Role"):
            job_role_group[country_col] = job_role_group[country_col].fillna("Unknown")

            # Level 2: Job Role
            job_role_node = {
                "name": job_role_name,
                "children": [],
                "size": int(job_role_group["Count"].sum()),
                "tooltip": {
                    "Industry": industry_name,
                    "Job Role": job_role_name,
                    "Average Salary (All Countries)": round(job_role_group["Average_Salary"].mean(), 2),
                    "Average Salary By Country": {
                        country: round(group["Average_Salary_By_Country"].mean(), 2)
                        for country, group in job_role_group.groupby(country_col)
                    },
                    "Average Job Satisfaction": round(job_role_group["Average_Job_Satisfaction"].mean(), 2),
                    "Average AI Sentiment": round(job_role_group["Average_AI_Sentiment"].mean(), 2),
                }
            }

            # Level 3 and Level 4: Tools
            tools_columns = [
                "Programming Languages", "Databases", "Platforms",
                "Web Frameworks", "AI Tools", "IDE Collaboration Tools", "Office Stack Tools"
            ]
            for tool_col in tools_columns:
                if tool_col in job_role_group.columns:
                    tool_group = job_role_group[tool_col].dropna().value_counts()
                    if not tool_group.empty:
                        tool_node = {
                            "name": tool_col,
                            "children": []
                        }
                        for tool_name, count in tool_group.items():
                            # Level 4: Individual Tool
                            tool_node["children"].append({
                                "name": tool_name,
                                "size": int(count),
                                "tooltip": {
                                    "Job Role": job_role_name,
                                    "Tool Name": tool_name,
                                    "Country": job_role_group[country_col].unique().tolist()
                                }
                            })
                        if tool_node["children"]:  # Remove empty tool categories
                            job_role_node["children"].append(tool_node)

            if job_role_node["children"]:  # Remove empty job roles
                industry_node["children"].append(job_role_node)

        if industry_node["children"]:  # Remove empty industries
            industries.append(industry_node)

    hierarchical_json = {
        "name": "Industries",
        "children": industries,
        "countries": unique_countries  # Add the unique countries for filtering
    }

    return hierarchical_json


# Reload the dataset
data_path = "circular_pack_dataset.csv"
data = pd.read_csv(data_path)

# Generate the revised JSON
hierarchical_data_with_country = prepare_hierarchical_json_with_country(data)

# Save the revised JSON to a file
output_path = "circular_packing_chart.json"
with open(output_path, "w") as json_file:
    json.dump(hierarchical_data_with_country, json_file, indent=4)

print(f"Hierarchical JSON with country information saved to {output_path}")
