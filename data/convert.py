import os
import csv
import json

# Function to read the .csv file and convert to JSON format
def convert_csv_to_json(csv_filename, json_filename):
    items = []
    
    # Read the .csv file
    with open(csv_filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            product_name = row['product_name'].strip()
            price = row['price'].strip()
            referral_link = row['referral_link'].strip()

            # Format the price (remove the dollar sign and convert to float)
            formatted_price = float(price.replace('$', ''))
            
            # Build the item dictionary
            item = {
                "name": product_name,
                "price": formatted_price,
                "image": f"../assets/images/{product_name.replace(' ', '_')}.jpg"
            }
            
            items.append(item)

    # Read the existing JSON file if it exists
    if os.path.exists(json_filename):
        with open(json_filename, 'r', encoding='utf-8') as json_file:
            existing_items = json.load(json_file)
    else:
        existing_items = []

    # Append the new items to the existing JSON data
    existing_items.extend(items)

    # Save the updated JSON data back to the file
    with open(json_filename, 'w', encoding='utf-8') as json_file:
        json.dump(existing_items, json_file, indent=2)

    print(f"Data has been successfully added to {json_filename}")

# Example usage
convert_csv_to_json('product_data.csv', 'items.json')
