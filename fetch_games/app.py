import requests, boto3, os

from bs4 import BeautifulSoup
from datetime import date

s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    
    urls = ['https://boardgamegeek.com/browse/boardgame']
    
    for i in range(2,6):
        urls.append('https://boardgamegeek.com/browse/boardgame/page/' + str(i))
        
    data_lines = ["rank;name;link"]
    
    for url in urls:
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
    
        rows = soup.find_all('tr', id=lambda x: x and x.startswith('row_'))
    
    
        for row in rows:
            rank = row.find('td', class_='collection_rank').get_text(strip=True)
            
            # The game name and link are within the first <a> tag inside the 'collection_objectname' class td
            game_link_tag = row.find('td', class_='collection_objectname').find('a', class_='primary', href=True)
            game_name = game_link_tag.get_text(strip=True)
            game_link = game_link_tag['href']
            
            data_lines.append(f"{rank};{game_name};{game_link}")
    
    file_content = '\n'.join(data_lines)
    file_name = f"{date.today().isoformat()}.txt"
    
    response = s3.put_object(Bucket=bucket_name, Key=file_name, Body=file_content)
    
    return response


