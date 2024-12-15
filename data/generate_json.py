import pandas as pd
import json

file_path = "d3_data.csv"
data = pd.read_csv(file_path)

# Function to create a hierarchical JSON structure
def create_hierarchy(data):
    hierarchy = {"name": "All Respondents", "children": []}

    # Group by Industry
    industry_group = data.groupby("Industry")

    for industry, industry_data in industry_group:
        industry_node = {"name": industry, "children": []}

        # Group by Job Role within each industry
        job_role_group = industry_data.groupby("Job Role")

        for job_role, job_role_data in job_role_group:
            job_role_node = {"name": job_role, "children": []}

            # Add categories (Programming Language, Databases, etc.)
            categories = {
                "Programming Languages": "Programming Languages",
                "Databases": "Databases",
                "Platforms": "Platforms",
                "Web Frameworks": "Web Frameworks",
                "AI Tools": "AI Tools",
                "IDE Collaboration Tools": "IDE Collaboration Tools",
                "Office Stack Tools": "Office Stack Tools",
            }

            for column, category_name in categories.items():
                if column in job_role_data.columns:
                    category_data = job_role_data[column].value_counts()

                    category_node = {"name": category_name, "children": []}

                    for tool, count in category_data.items():
                        category_node["children"].append({"name": tool, "value": count})

                    if category_node["children"]:
                        job_role_node["children"].append(category_node)

            if job_role_node["children"]:
                industry_node["children"].append(job_role_node)

        if industry_node["children"]:
            hierarchy["children"].append(industry_node)

    return hierarchy

# Create the hierarchy
hierarchy = create_hierarchy(data)

output_file = "d3_data.json"
with open(output_file, "w") as f:
    json.dump(hierarchy, f, indent=4)

print(f"Hierarchy JSON file has been saved to {output_file}.")
