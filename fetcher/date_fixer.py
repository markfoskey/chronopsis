import argparse
import pandas as pd
import re
from dateutil import parser as date_parser

arg_parser = argparse.ArgumentParser(description='Parser date fixer.')
arg_parser.add_argument('infile', type=str)
arg_parser.add_argument('outfile', type=str)

args = arg_parser.parse_args()

infile = args.infile
outfile = args.outfile

# Read the CSV file, treating 'year' column as strings
df = pd.read_csv(infile, dtype={'year': str})

# Function to extract the first contiguous four digits from a string
def extract_year(date_string):
    match = re.search(r'(?:^|\D)(\d{4})(?=.|$)', str(date_string))
    return int(match.group(1)) if match else None

def parse_date_fuzzy(date_string):
    try:
        match = re.search(r'\|(\d{4}-\d{2}-\d{2})\|')
        if match:
            date_string = match.group(1)
        parsed_date = date_parser.parse(date_string, fuzzy=True)
        year = parsed_date.year
        day_in_year = parsed_date.timetuple().tm_yday
        return year, day_in_year
    except Exception as e:
        print(f"Fuzzy parse exception for {date_string}")
        return None
    
def get_isolated_year(date_string):
    if date_string.isdigit() and 1500 <= int(date_string) <= 2100:
        return int(date_string), 183
    else:
        return None

def get_date(date_string):
    year, day_in_year = get_isolated_year(date_string)
    if (year):
        return year, day_in_year
    extracted_year = extract_year(date_string)
    year, day_in_year = parse_date_fuzzy(date_string)
    if year != extracted_year:
        year = extracted_year
        day_in_year = 183
    return year, day_in_year

# Function to update the "Year" column
def update_year(row):
    date = str(row['year'])
    if date is None or date.isdigit() and 1500 <= int(date) <= 2100:
        return row  # No modification needed for valid years or None
    return pd.Series({'author': row['author'], 'title': row['title'], 'article_length': row['article_length'],
                      'year': extract_year(date), 'pubdate': date})

# 'title', 'author', 'year', 'day_in_year', 'pubdate', 'genre', 'country', 'in_links', 'article_length', 'page_url'

# Apply the update_year function to each row and create a new DataFrame
# df_updated = df.apply(lambda row: update_year(row), axis=1)
df_updated = df.apply(update_year, axis=1)

# Reorder columns
df_updated = df_updated[['author', 'title', 'year', 'article_length', 'pubdate']]

# Save the updated DataFrame to a new CSV file
df_updated.to_csv(outfile, index=False, encoding='utf-8')
