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
    return ['title', 'author', 'year', 'day_in_year', 'pubdate', 'genre', 'country', 'in_links', 'article_length','page_url']

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

    return [title, author, year, day_in_year, pubdate, genre, country, in_links, article_length, page.url]

def traverse_category(wiki_wiki, category_name, depth=5):
    print("starting category_tree")
    start_time = time.time()
    category_tree = wiki_wiki.categorytree(category_name, depth=depth)
    end_time = time.time()
    print(f"categorytree took {end_time - start_time} seconds")
    return category_tree

# List of leaves of the tree (page titles - e.g., "Dune (novel)")
def save_category_tree(wiki_wiki, category_name, depth=5):
    category_tree = traverse_category(wiki_wiki, category_name, depth)

    def process_category_tree(tree, file, curr_depth):
        for category, details in tree.items():
            print(f"Processing category {category} at current depth {curr_depth}.")

            if details is None:
                return

            if 'links' in details:
                for link in details['links']:
                    file.write(f"{link}\n")

            if 'sub-categories' in details:
                process_category_tree(details['sub-categories'], file, curr_depth + 1)

    output_filename = f'{category_name}_novels_links.txt'
    with open(output_filename, 'w', newline='', encoding='utf-8') as file:
        process_category_tree(category_tree, file, 0)

    print(f"Data written to '{output_filename}'")

    return 

def scrape_category_recursive(wiki_wiki, category_name, depth=5):
    category_tree = traverse_category(wiki_wiki, category_name, depth)

    def process_category_tree(tree, csv_writer, curr_depth):
        for category, details in tree.items():
            print(f"Processing category {category} at current depth {curr_depth}.")

            if details is None:
                return

            if 'links' in details:
                for link in details['links']:
                    # Fetch information for each novel
                    print(f"trying link {link}")
                    try:
                        page = wiki_wiki.page(link, auto_suggest=False)
                        page_url = page.url
                        global found_urls
                        if page_url in found_urls:
                            continue
                        found_urls.add(page_url)

                        row = get_page_info(page)
                        if row:
                            global global_count
                            global_count = global_count + 1
                            print(f"{row[0]}, {row[3]}, category {category}, {global_count}")
                            csv_writer.writerow(row)
                    except Exception as e:
                        print(f"Error fetching or processing page for {link}: {e}")
                        continue  # Skip to the next iteration or handle the error as needed

            if 'sub-categories' in details:
                # Recursively fetch data from subcategories
                process_category_tree(details['sub-categories'], csv_writer, curr_depth + 1)

    output_filename = f'{category_name}_novels_data.csv'
    with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        # Writing header
        csv_writer.writerow(get_row_headers())

        process_category_tree(category_tree, csv_writer, 0)

    print(f"Data written to '{output_filename}'")

    return 

def write_to_csv(data, filename):
    filename += ".csv"
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        # Writing header
        csv_writer.writerow(['Title', 'Author', 'Year', 'Word Count'])
        # Writing data rows
        csv_writer.writerows(data)
    print(f"Data written to '{filename}'")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Parser for novels Wiki scraper.')
    parser.add_argument('category_name', type=str, help='Name of the Wikipedia category')
    args = parser.parse_args()
    category_name = args.category_name
    wikipedia = MediaWiki(user_agent='NovelScraperBot/1.0 (mark.foskey@gmail.com) pymediawiki/0.7.3')
    save_category_tree(wikipedia, category_name, depth=5)
