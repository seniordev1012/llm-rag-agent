import json
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

def append_meta(request, text, metadata_only = False):
  meta = {
    'url': request.url,
    'title': request.html.find('title', first=True).text if len(request.html.find('title')) != 0 else '',
    'description': request.html.find('meta[name="description"]', first=True).attrs.get('content') if  request.html.find('meta[name="description"]', first=True) != None else '',
    'published':request.html.find('meta[property="article:published_time"]', first=True).attrs.get('content') if request.html.find('meta[property="article:published_time"]', first=True) != None else datetime.today().strftime('%Y-%m-%d %H:%M:%S'),
    'wordCount': len(text.split(' ')),
  }
  return "Article JSON Metadata:\n"+json.dumps(meta)+"\n\n\nText Content:\n" + text if metadata_only == False else meta
