import os, json
from datetime import datetime
from uuid import uuid4

def guid():
  return str(uuid4())

def file_creation_time(path_to_file):
  try:
    if os.name == 'nt':
      return datetime.fromtimestamp(os.path.getctime(path_to_file)).strftime('%Y-%m-%d %H:%M:%S')
    else:
      stat = os.stat(path_to_file)
      return datetime.fromtimestamp(stat.st_birthtime).strftime('%Y-%m-%d %H:%M:%S')
  except AttributeError:
    return datetime.today().strftime('%Y-%m-%d %H:%M:%S')

def move_source(working_dir='hotdir', new_destination_filename='', failed=False, remove=False):
  if remove and os.path.exists(f"{working_dir}/{new_destination_filename}"):
    print(f"{new_destination_filename} deleted from filesystem")
    os.remove(f"{working_dir}/{new_destination_filename}")
    return

  destination = f"{working_dir}/processed" if not failed else f"{working_dir}/failed"
  if os.path.exists(destination) == False:
    os.mkdir(destination)
  
  os.replace(f"{working_dir}/{new_destination_filename}", f"{destination}/{new_destination_filename}")
  return

def write_to_server_documents(data, filename):
  destination = f"../server/storage/documents/custom-documents"
  if os.path.exists(destination) == False: os.makedirs(destination)
  with open(f"{destination}/{filename}.json", 'w', encoding='utf-8') as file:
    json.dump(data, file, ensure_ascii=True, indent=4)
