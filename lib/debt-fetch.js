const apiUrl =
  'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny';

let nationalDebt = 0;
let lastUpdateTime = Date.now();
let debtIncreasePerMillisecond = 0;

// Load saved values from localStorage
if (localStorage.getItem('nationalDebt')) {
  nationalDebt = parseFloat(localStorage.getItem('nationalDebt'));
}
if (localStorage.getItem('lastUpdateTime')) {
  lastUpdateTime = parseInt(localStorage.getItem('lastUpdateTime'));
}

// Function to format date to YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Function to fetch debt data for a given date, adjusting if necessary
async function fetchDebtForDate(date) {
  while (date >= new Date('1990-01-01')) {
    const dateStr = formatDate(date);
    console.log(`Fetching debt data for ${dateStr}`);
    const response = await fetch(
      `${apiUrl}?filter=record_date:eq:${dateStr}&format=json&page[number]=1&page[size]=1`
    );
    const data = await response.json();

    if (data && data.data && data.data.length > 0) {
      return data.data[0];
    } else {
      // If no data, adjust date backward by one day
      date.setDate(date.getDate() - 1);
    }
  }
  throw new Error('No debt data available after adjusting dates.');
}

// Function to fetch the latest national debt and historical data
async function fetchNationalDebt() {
  try {
    // Get today's date and date from 12 months ago
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch the latest debt value (adjusting date if necessary)
    const latestDebtEntry = await fetchDebtForDate(new Date(today));
    const latestDebt = parseFloat(
      latestDebtEntry.tot_pub_debt_out_amt.replace(/,/g, '')
    );
    const latestDate = new Date(latestDebtEntry.record_date);

    // Fetch the debt value from 12 months ago (adjusting date if necessary)
    const previousDebtEntry = await fetchDebtForDate(new Date(oneYearAgo));
    const previousDebt = parseFloat(
      previousDebtEntry.tot_pub_debt_out_amt.replace(/,/g, '')
    );
    const previousDate = new Date(previousDebtEntry.record_date);

    console.log('Latest Debt:', latestDebt, 'on', latestDate);
    console.log('Previous Debt:', previousDebt, 'on', previousDate);

    // Calculate total increase and time difference
    const totalIncrease = latestDebt - previousDebt;
    const timeDiffInMilliseconds = latestDate - previousDate;

    // Ensure positive time difference
    if (timeDiffInMilliseconds <= 0) {
      console.error('Invalid time difference between debt records.');
      return;
    }

    // Calculate debt increase per millisecond
    debtIncreasePerMillisecond = totalIncrease / timeDiffInMilliseconds;

    console.log('Total Increase:', totalIncrease);
    console.log('Time Difference (ms):', timeDiffInMilliseconds);
    console.log('Debt Increase Per Millisecond:', debtIncreasePerMillisecond);

    // Set the latest debt as the starting point
    nationalDebt = latestDebt;

    // Adjust the debt based on the time that has passed since the last recorded update
    const millisecondsSinceLatestUpdate = Date.now() - latestDate.getTime();
    nationalDebt += debtIncreasePerMillisecond * millisecondsSinceLatestUpdate;

    console.log(
      `Debt adjusted with ${millisecondsSinceLatestUpdate} ms since last update`
    );

    // Update lastUpdateTime to now
    lastUpdateTime = Date.now();
  } catch (error) {
    console.error('Error fetching national debt:', error);
  }
}

// Function to update the national debt
function updateNationalDebt() {
  const now = Date.now();
  const millisecondsSinceLastUpdate = now - lastUpdateTime;

  // Continuously add the increase to the debt based on time passed
  nationalDebt += debtIncreasePerMillisecond * millisecondsSinceLastUpdate;
  lastUpdateTime = now;

  // Update the display
  if (typeof window.updateDebtDisplay === 'function') {
    window.updateDebtDisplay(nationalDebt);
  }

  // Save current values to localStorage
  localStorage.setItem('nationalDebt', nationalDebt);
  localStorage.setItem('lastUpdateTime', lastUpdateTime);

  // Continue updating
  requestAnimationFrame(updateNationalDebt);
}

// Expose a function to get the current national debt
function getNationalDebt() {
  return nationalDebt;
}

// Initial fetch and start updating
fetchNationalDebt().then(() => {
  // Start updating the debt value using requestAnimationFrame
  updateNationalDebt();
});

// Fetch the latest debt once a day
setInterval(fetchNationalDebt, 24 * 60 * 60 * 1000);

// Expose the getNationalDebt function globally
window.getNationalDebt = getNationalDebt;
