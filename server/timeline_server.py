import csv
import codecs

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

import sys
sys.path.insert(1, '../fetcher/')
from fetch_utils import get_date

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return __name__

@app.route('/events')
def get_events():
    print(request.url)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    max_events = int(request.args.get('max_events', 10))

    # Filter events based on parameters
    filtered_events = sorted([
        event for event in event_data
        if start_date <= event['year'] <= end_date
        #and location_min <= float(event['location']) <= location_max
    ], key=lambda x: -int(x['article_length']))[:max_events]

    return jsonify(filtered_events)

event_files = ['BritishAndAmericanNovels.csv', 'historic_inventions.csv']

print("Reading data... ")

event_data = []
for filename in event_files:
    with codecs.open(filename, 'r', encoding='utf-8-sig') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for row in csv_reader:
            if not 'article_length' in row:
                row['article_length'] = 8000
            if 'year' in row:
                event_data.append(row)
            elif 'date' in row:
                year, day_in_year = get_date(row['date'])
                if year:
                    row['year'] = str(year)
                    row['day_in_year'] = str(day_in_year)
                    event_data.append(row)

print("Done.")

if __name__ == '__main__':
    app.run(host="localhost", port=5500, debug=True)

