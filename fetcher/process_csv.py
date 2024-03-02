import argparse
import csv
from dateutil import parser as date_parser
from mediawiki import MediaWiki
from pprint import pprint

global_count = 0
found_urls = set()

def get_row_headers():
    return ['title', 'author', 'year', 'day_in_year', 'pubdate', 'genre', 'country', 'in_links', 'article_length', 'page_url']

def process_row(row):
    if not (row['author'] and row['title'] and row['pubdate']):
        return None
    
    keys = get_row_headers()
    result = [row.get(key) for key in keys]
    return [row.get(key) for key in keys]

def process_file(input_filename, output_filename):
    try:
        with open(input_filename, 'r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            with open(output_filename, 'a', newline='', encoding='utf-8') as outfile:
                fieldnames = get_row_headers()
                writer = csv.writer(outfile)
                
                # Append headers if the file is empty
                if outfile.tell() == 0:
                    print('tell')
                    writer.writerow(fieldnames)

                for row in reader:
                    new_row = process_row(row)
                    if new_row:
                        print(new_row)
                        writer.writerow(new_row)

    except FileNotFoundError:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Template for tweaking csv file.")
    parser.add_argument("input_file", help="csv file to modify.")
    parser.add_argument("output_file", help="output file.")
    args = parser.parse_args()

    process_file(args.input_file, args.output_file)
