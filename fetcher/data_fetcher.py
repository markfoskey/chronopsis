import argparse
import csv
import inspect
import re
import requests
import time
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from mediawiki import MediaWiki
from pprint import pprint

global_count = 0
found_urls = set()

def print_object_members(obj):
    members = inspect.getmembers(obj)
    for name, member in members:
        print(name)

def get_row_headers():
    return ['title', 'author', 'year', 'day_in_year', 'pubdate', 'genre', 'country', 'in_links', 'article_length','pagename','page_url']

def num_inbound_links(page_title):
    api_url = f"https://linkcount.toolforge.org/api/?page={page_title}&project=en.wikipedia.org"

    try:
        response = requests.get(api_url)
        response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes

        data = response.json()

        # Extract the value after "all" from the "wikilinks" section
        wikilinks_all = data.get("wikilinks", {}).get("all", None)

        return wikilinks_all

    except requests.exceptions.RequestException as e:
        print(f"Error making the request: {e}")
        return None
    
# Function to extract the first contiguous four digits from a string
def extract_year(s):
    match = re.search(r'(?:^|\D)(\d{4})(?=.|$)', str(s))
    return int(match.group(1)) if match else None

def get_page_info(page):
    title = page.title
    # print_object_members(page)
    content = page.html  # Use page.html instead of page.content

    soup = BeautifulSoup(content, 'html.parser')

    # Extracting author information from the infobox
    infobox = soup.find('table', {'class': 'infobox'})
    # print(infobox)

    try:
        title_from_infobox = infobox.find('caption').get_text(strip=True)
    except Exception as e:
        print(f"Could not get title from caption for {title}: {e}")
        title_from_infobox = None

    if title_from_infobox and title_from_infobox != title:
        print(f"Replacing page title '{title}' with title '{title_from_infobox}' from caption.")
        title = title_from_infobox

    try:
        author = infobox.find('th', string='Author').find_next('td').get_text(separator='; ', strip=True)
    except Exception as e:
        print(f"Error getting author for {title}: {e}")
        author = ''

    try:
        pubdate = infobox.find('th', string=re.compile('(Publication date|Published)')).find_next('td').get_text(separator='|', strip=False)
    except Exception as e:
        print(f"Error getting publication date for {title}: {e}")

    try:
        genre = infobox.find('th', string='Genre').find_next('td').get_text(separator='; ',strip=True)
    except Exception as e:
        print(f"Error getting genre for {title}: {e}")
        genre = ''

    try:
        country = infobox.find('th', string='Country').find_next('td').get_text(separator='; ',strip=True)
    except Exception as e:
        print(f"Error getting country for {title}: {e}")
        country = ''

    if not (title and pubdate):
        return []

    try:
        parsed_date = date_parser.parse(pubdate, fuzzy=True)
        year = parsed_date.year
        day_in_year = parsed_date.timetuple().tm_yday
    except Exception as e:
        print(f"Problem parsing pubdate for {title}; grabbing first four digit string")
        year = extract_year(pubdate)
        day_in_year = 1

    article_length = len(content.split())  # Simple word count
    
    page_title = page.url.split('/')[-1]
    print(page_title)
    in_links = num_inbound_links(page_title)
    print(in_links)

    return [title, author, year, day_in_year, pubdate, genre, country, in_links, article_length, page.title, page.url]
    
def scrape_listed_pages(links, completed_links, wiki_wiki, csv_writer):
    for link in links:
        if link in completed_links:
            print(f"link {link} already processed")
            continue

        print(f"trying link {link}")
        try:
            page = wiki_wiki.page(link, auto_suggest=False)

            row = get_page_info(page)
            if row:
                global global_count
                global_count = global_count + 1
                print(f"{row[0]}, {row[3]}, {global_count}")
                csv_writer.writerow(row)
            else:
                csv_writer.writerow(['', '', '', '', '', '', '', '', '', link, ''])
        except Exception as e:
            print(f"Error fetching or processing page for {link}: {e}")
            csv_writer.writerow(['', '', '', '', '', '', '', '', '', link, ''])

        completed_links.add(link)


def scrape_pages_from_file_list(wiki_wiki, input_file_name, existing_csv_file, depth=5):
    # Read the existing CSV file to extract completed links
    completed_links = set()
    try:
        with open(existing_csv_file, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                completed_links.add(row['pagename'])
    except FileNotFoundError:
        pass

    # Open the CSV file in append mode and create a CSV writer
    with open(existing_csv_file, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = get_row_headers()
        writer = csv.writer(csvfile)
        
        # Append headers if the file is empty
        if csvfile.tell() == 0:
            writer.writerow(fieldnames)

        # Read the input file containing links to scrape
        with open(input_file_name, 'r') as file:
            links = file.read().splitlines()
            scrape_listed_pages(links, completed_links, wiki_wiki, writer)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Wikipedia pages.")
    parser.add_argument("input_file", help="Path to the file containing a list of Wikipedia links to scrape.")
    parser.add_argument("existing_csv_file", help="Path to the existing CSV file to append to.")
    args = parser.parse_args()

    # Create a MediaWiki object
    wiki_wiki = MediaWiki()

    # Scrape pages from the file list
    scrape_pages_from_file_list(wiki_wiki, args.input_file, args.existing_csv_file)
