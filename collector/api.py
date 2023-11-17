import os
from flask import Flask, json, request
from scripts.watch.process_single import process_single
from scripts.watch.filetypes import ACCEPTED_MIMES
from scripts.link import process_single_link
api = Flask(__name__)

WATCH_DIRECTORY = "hotdir"
@api.route('/process', methods=['POST'])
def process_file():
  content = request.json
  target_filename = os.path.normpath(content.get('filename')).lstrip(os.pardir + os.sep)
  print(f"Processing {target_filename}")
  success, reason = process_single(WATCH_DIRECTORY, target_filename)
  return json.dumps({'filename': target_filename, 'success': success, 'reason': reason})

@api.route('/process-link', methods=['POST'])
async def process_link():
  content = request.json
  url = content.get('link')
  print(f"Processing {url}")
  success, reason = await process_single_link(url)
  return json.dumps({'url': url, 'success': success, 'reason': reason})


@api.route('/accepts', methods=['GET'])
def get_accepted_filetypes():
  return json.dumps(ACCEPTED_MIMES)

@api.route('/', methods=['GET'])
def root():
  return "<p>Use POST /process with filename key in JSON body in order to process a file. File by that name must exist in hotdir already.</p>"