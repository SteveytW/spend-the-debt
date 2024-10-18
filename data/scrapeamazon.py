import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from PIL import Image
import requests
from io import BytesIO
import pandas as pd

# Function to set up WebDriver
def setup_driver():
    chrome_driver_path = r'C:\ProgramData\chocolatey\lib\chromedriver\tools\chromedriver-win32\chromedriver.exe'  # Update this to your actual path
    service = Service(chrome_driver_path)
    driver = webdriver.Chrome(service=service)
    return driver

# Function to search products on Amazon by name
def search_amazon(driver, product_name):
    driver.get("https://www.amazon.com/")
    
    # Find the search box and input the product name
    search_box = driver.find_element(By.ID, "twotabsearchtextbox")
    search_box.send_keys(product_name)
    search_box.send_keys(Keys.RETURN)
    
    time.sleep(2)  # Allow the page to load
    
    # Get product results from the search page
    product_elements = driver.find_elements(By.CSS_SELECTOR, ".s-result-item")
    
    products = []
    
    for product in product_elements[:10]:  # Limit to 10 products for demo purposes
        try:
            title = product_name  # Use product_name instead of the scraped title
            price_whole = product.find_element(By.CSS_SELECTOR, ".a-price-whole").text
            price_fraction = product.find_element(By.CSS_SELECTOR, ".a-price-fraction").text
            price = f"${price_whole}.{price_fraction}"
            
            image_url = product.find_element(By.CSS_SELECTOR, "img.s-image").get_attribute("src")
            product_url = product.find_element(By.CSS_SELECTOR, "h2 .a-link-normal").get_attribute("href")
            
            products.append({
                'title': title,
                'price': price,
                'image_url': image_url,
                'product_url': product_url
            })
        except Exception as e:
            print(f"Error scraping product: {e}")
    
    return products

# Function to preview the image without stealing focus
def preview_image(url):
    try:
        response = requests.get(url)
        img = Image.open(BytesIO(response.content))

        # Use a non-focus stealing preview (without holding the window open)
        img.show()
        
        # Let it display briefly and then close the preview
        time.sleep(3)  # Show image for 3 seconds (adjust as necessary)
        for proc in Image._showxv():  # Close the image window
            proc.kill()

    except Exception as e:
        print(f"Error displaying image: {e}")

# Function to download the image and save product data
def download_image_and_save_data(product, affiliate_id, save_dir):
    try:
        response = requests.get(product['image_url'])
        img = Image.open(BytesIO(response.content))
        img = img.convert('RGB')
        
        # Use product name for the file name
        filename = product['title'].replace(" ", "_")[:50]  # Limit filename length
        
        # Save image as .jpg
        img_path = os.path.join(save_dir, f"{filename}.jpg")
        img.save(img_path)
        print(f"Downloaded and saved image: {img_path}")
        
        # Generate referral link
        referral_link = f"{product['product_url']}?tag={affiliate_id}"
        
        # Save product data to CSV
        product_data = pd.DataFrame([{
            'product_name': product['title'],  # Use product_name consistently
            'price': product['price'],
            'referral_link': referral_link
        }])
        
        product_data.to_csv(os.path.join(save_dir, "product_data.csv"), mode='a', header=not os.path.exists(os.path.join(save_dir, "product_data.csv")), index=False)
        print(f"Saved product data for '{product['title']}'")

    except Exception as e:
        print(f"Error downloading image or saving data: {e}")

# Function to load products from file
def load_products_from_file(filename="amazonproducts.txt"):
    with open(filename, 'r', encoding='utf-8') as file:
        content = file.read()
        # Split the product names by commas and remove any excess whitespace
        product_names = [product.strip() for product in content.split(",")]
    return product_names

# Main function to iterate through a list of products
def scrape_multiple_products(product_names, affiliate_id, save_dir="downloaded_products"):
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    driver = setup_driver()

    for product_name in product_names:
        print(f"\n--- Searching for product: {product_name} ---")
        products = search_amazon(driver, product_name)
        
        for product in products:
            print(f"Product: {product['title']}, Price: {product['price']}")
            preview_image(product['image_url'])
            
            user_input = input(f"Is the product '{product_name}' acceptable? (y/n/skip/exit): ").strip().lower()
            if user_input == "y":
                download_image_and_save_data(product, affiliate_id, save_dir)
                break  # Move to the next product name once agreed
            elif user_input == "skip":
                print(f"Skipped product: {product_name}")
                break  # Skip to the next product name
            elif user_input == "exit":
                print("Exiting...")
                driver.quit()
                return

    driver.quit()

# Load products from "amazonproducts.txt" and start scraping
product_list = load_products_from_file("amazonproducts.txt")
affiliate_id = "bdsmbbq-21"  # Replace with your actual Amazon Affiliate ID
scrape_multiple_products(product_list, affiliate_id)
