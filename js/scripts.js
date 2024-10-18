// js/scripts.js

let items = [];

// Fetch items from items.json
async function loadItems() {
  try {
    const response = await fetch('../data/items.json');
    items = await response.json();
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Function to format numbers as currency with two decimal places
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2, // Always show two decimal places
    maximumFractionDigits: 2,
  });
}

// Update the national debt display
function updateDebtDisplay(nationalDebt) {
  const debtDisplay = document.getElementById('debt-display');
  debtDisplay.textContent = formatCurrency(nationalDebt);
}

// Generate a random item and calculate quantity
function showRandomItem() {
  if (items.length === 0) {
    console.error('Item list is empty.');
    return;
  }

  // Hide other elements
  document.getElementById('item-list').style.display = 'none';
  document.getElementById('shop-btn').style.display = 'none';
  document.getElementById('receipt').style.display = 'none';

  const item = items[Math.floor(Math.random() * items.length)];
  const nationalDebt = window.getNationalDebt();
  const quantity = Math.floor(nationalDebt / item.price);

  const itemCard = document.getElementById('item-card');
  itemCard.innerHTML = `
    <div class="item-card">
      <h2>You could buy ${quantity.toLocaleString()} ${item.name}${quantity > 1 ? 's' : ''}!</h2>
      <img src="${item.image}" alt="${item.name}">
    </div>
  `;
}

// Show item selection for shopping
function chooseItems() {
  // Hide other elements
  document.getElementById('item-card').innerHTML = '';
  document.getElementById('receipt').style.display = 'none';

  const itemListDiv = document.getElementById('item-list');
  itemListDiv.style.display = 'flex';
  document.getElementById('shop-btn').style.display = 'inline-block';

  displayItemList();
}

let selectedItems = [];

// Display the list of items as selectable cards
function displayItemList() {
  const itemListDiv = document.getElementById('item-list');
  itemListDiv.innerHTML = ''; // Clear existing content
  items.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shopping-item';
    itemDiv.dataset.index = index;

    itemDiv.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>Price: ${formatCurrency(item.price)}</p>
    `;

    itemDiv.addEventListener('click', function() {
      toggleItemSelection(itemDiv);
    });

    itemListDiv.appendChild(itemDiv);
  });
}

// Toggle selection of a shopping item
function toggleItemSelection(itemDiv) {
  const index = itemDiv.dataset.index;
  const item = items[index];
  const selectedIndex = selectedItems.indexOf(item);

  if (selectedIndex === -1) {
    // Item is not selected, select it
    selectedItems.push(item);
    itemDiv.classList.add('selected');
    const badge = document.createElement('div');
    badge.className = 'selected-badge';
    badge.textContent = 'Selected';
    itemDiv.appendChild(badge);
  } else {
    // Item is already selected, deselect it
    selectedItems.splice(selectedIndex, 1);
    itemDiv.classList.remove('selected');
    const badge = itemDiv.querySelector('.selected-badge');
    if (badge) {
      itemDiv.removeChild(badge);
    }
  }
}

// Calculate and display the shopping receipt
function goShopping() {
  if (selectedItems.length === 0) {
    alert('Please select at least one item.');
    return;
  }

  const nationalDebt = window.getNationalDebt();
  const totalItems = selectedItems.length;

  // Generate random allocations for each item
  let allocations = [];
  let minAllocation = nationalDebt / totalItems / 2; // Minimum allocation per item
  let totalAllocated = 0;

  // First, allocate the minimum amount to each item
  for (let i = 0; i < totalItems; i++) {
    allocations[i] = minAllocation;
    totalAllocated += minAllocation;
  }

  // Remaining amount to be allocated
  let remainingAmount = nationalDebt - totalAllocated;

  // Generate random weights for each item
  let weights = [];
  for (let i = 0; i < totalItems; i++) {
    weights.push(Math.random());
  }

  // Calculate the sum of weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Allocate the remaining amount based on weights
  for (let i = 0; i < totalItems; i++) {
    let additionalAllocation = (weights[i] / totalWeight) * remainingAmount;
    allocations[i] += additionalAllocation;
  }

  // Initialize quantities and total spent
  let quantities = [];
  let totalSpent = 0;

  // Calculate initial quantities based on allocations
  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    const allocatedAmount = allocations[i];
    const quantity = Math.floor(allocatedAmount / item.price);
    quantities[i] = quantity;
    const totalCost = quantity * item.price;
    totalSpent += totalCost;
  }

  let leftoverDebt = nationalDebt - totalSpent;

  // Use leftoverDebt to buy more items if possible
  let itemsCanBePurchased = true;
  while (
    leftoverDebt >= Math.min(...selectedItems.map(item => item.price)) &&
    itemsCanBePurchased
  ) {
    itemsCanBePurchased = false;
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (leftoverDebt >= item.price) {
        quantities[i] += 1;
        totalSpent += item.price;
        leftoverDebt -= item.price;
        itemsCanBePurchased = true;
      }
    }
  }

  // Build the receipt
  let receiptHTML = '<div class="receipt-header">';
  receiptHTML += '<h3>STD Receipt</h3>';
  receiptHTML += '<p>Date: ' + new Date().toLocaleString() + '</p>';
  receiptHTML += '</div>';
  receiptHTML += '<div class="receipt-body">';
  receiptHTML += '<table>';
  receiptHTML += '<tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>';

  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    const quantity = quantities[i];
    const totalCost = quantity * item.price;
    receiptHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${quantity.toLocaleString()}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(totalCost)}</td>
      </tr>
    `;
  }

  leftoverDebt = nationalDebt - totalSpent;

  receiptHTML += '</table>';
  receiptHTML += '</div>';
  receiptHTML += '<div class="receipt-footer">';
  receiptHTML += `<p>Subtotal: ${formatCurrency(totalSpent)}</p>`;
  receiptHTML += `<p>Tax (0%): ${formatCurrency(0)}</p>`;
  receiptHTML += `<p><strong>Total: ${formatCurrency(totalSpent)}</strong></p>`;
  receiptHTML += `<p>Change: ${formatCurrency(leftoverDebt)}</p>`;
  receiptHTML += '</div>';

  const receiptDiv = document.getElementById('receipt');
  receiptDiv.innerHTML = receiptHTML;
  receiptDiv.style.display = 'block'; // Show the receipt
}

// Event listeners
document.getElementById('random-item-btn').addEventListener('click', showRandomItem);
document.getElementById('choose-item-btn').addEventListener('click', chooseItems);
document.getElementById('shop-btn').addEventListener('click', goShopping);

// Expose updateDebtDisplay globally so it can be accessed by lib/debt-fetch.js
window.updateDebtDisplay = updateDebtDisplay;

// Initial function calls
loadItems();
