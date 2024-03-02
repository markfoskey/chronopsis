import argparse
import csv
from dateutil import parser as date_parser
from mediawiki import MediaWiki
from pprint import pprint
from fetch_utils import extract_leaf

def process_row(row, keys, wiki_wiki):
    url = row['page_url']
    print(url)
    link = extract_leaf(url)
    page = wiki_wiki.page(link, auto_suggest=False)
    content = page.html
    row['article_length'] = len(content.split())
    return [row.get(key) for key in keys]

def process_file(input_filename, output_filename):
    try:
        wiki_wiki = MediaWiki()
        with open(input_filename, 'r', newline='', encoding='utf-8') as infile:
            rows = csv.DictReader(infile)
            if not rows:
                return

            with open(output_filename, 'a', newline='', encoding='utf-8') as outfile:
                writer = csv.writer(outfile)
                
                fieldnames = []
                for row in rows:
                    if not fieldnames:
                        fieldnames = list(row.keys())
                        fieldnames.insert(-1, 'article_length')
                        writer.writerow(fieldnames)
                    try:
                        new_row = process_row(row, fieldnames, wiki_wiki)
                    except:
                        continue
                    if new_row:
                        print(new_row)
                        writer.writerow(new_row)

    except FileNotFoundError:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Look up the Wikipedia article for each row and add the word count to the row.")
    parser.add_argument("input_file", help="csv file to modify.")
    parser.add_argument("output_file", help="output file.")
    args = parser.parse_args()

    process_file(args.input_file, args.output_file)
