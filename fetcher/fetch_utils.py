import re
import inspect
from dateutil import parser as date_parser

from urllib.parse import urlparse

def print_object_members(obj):
    members = inspect.getmembers(obj)
    for name, member in members:
        print(name)

def extract_leaf(url):
    parsed_url = urlparse(url)
    path_components = parsed_url.path.split('/')
    return path_components[-1] if path_components[-1] else path_components[-2]    

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
        return None, None
    
def get_isolated_year(date_string):
    if date_string.isdigit() and 1500 <= int(date_string) <= 2100:
        return int(date_string), 183
    else:
        return None, None

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
