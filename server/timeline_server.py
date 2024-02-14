import csv
import codecs

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

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
    # location_min = float(request.args.get('location_min', 0))
    # location_max = float(request.args.get('location_max', float('inf')))
    max_events = int(request.args.get('max_events', 10))

    # Filter events based on parameters
    filtered_events = sorted([
        event for event in event_data
        if start_date <= event['year'] <= end_date
        #and location_min <= float(event['location']) <= location_max
    ], key=lambda x: -int(x['article_length']))[:max_events]

    return jsonify(filtered_events)

novels_file = 'BritishAndAmericanNovels.csv'
# novels_file = 'BritishNovels.csv'
# novels_file = 'test.csv'

print("Reading data... ")
with codecs.open(novels_file, 'r', encoding='utf-8-sig') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    event_data = list(csv_reader)
print("Done.")

if __name__ == '__main__':
    app.run(host="localhost", port=5500, debug=True)

