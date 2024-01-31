from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    return __name__

if __name__ == '__main__':
    app.run(host="localhost", port=5500, debug=True)

