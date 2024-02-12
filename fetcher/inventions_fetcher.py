import requests
from bs4 import BeautifulSoup
import csv

# Function to scrape the Wikipedia article and extract relevant information
def scrape_timeline_of_inventions(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the list items containing the inventions
    invention_items = soup.find_all('li')
    
    # Initialize a list to store scraped data
    inventions_data = []
    
    # Iterate over each list item
    for item in invention_items:
        # Extract the date
        date_tag = item.find('b')
        if not date_tag:
            continue  # Skip this iteration if 'b' tag is not found
        date = date_tag.text.strip()        # Extract the description
        
        # Extract the description
        description = item.text.strip().replace(date, '').strip()
        
        # Extract the URL if available
        url_tag = item.find('a', href=True)
        if url_tag:
            url = 'https://en.wikipedia.org' + url_tag['href']
        else:
            url = None
        
        # Append the data to the list
        inventions_data.append({'Date': date, 'Description': description, 'URL': url})
    
    return inventions_data

# Function to write data to CSV file
def write_to_csv(data, filename):
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['Date', 'Description', 'URL'])
        writer.writeheader()
        for row in data:
            writer.writerow(row)

# URL of the Wikipedia article
wiki_url = 'https://en.wikipedia.org/wiki/Timeline_of_historic_inventions'

# Scrape the data
inventions_data = scrape_timeline_of_inventions(wiki_url)

# Write data to CSV file
csv_filename = 'historic_inventions.csv'
write_to_csv(inventions_data, csv_filename)

print(f'Data has been successfully scraped and saved to {csv_filename}')
