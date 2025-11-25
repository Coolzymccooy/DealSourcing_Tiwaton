// ======================================================================
// Tiwaton Deal Sourcing – Frontend App
// ======================================================================
//
// Sections:
//   1. Sample Property Data (static demo)
//   2. Backend Integration (load deals from API)
//   3. DOM References & Global State
//   4. Filters & Sorting + Property Card Rendering
//   5. Modal & Calculator (open/close, tabs)
//   6. Calculator Form Rendering & Result Calculations
//   7. Backend Deal Mapping (API → UI model)
//   8. ROI Helper
//   9. Initialisation / Event Wiring
//
// ======================================================================


// ======================================================================
// 1. Sample Property Data (static demo)
// ======================================================================

let properties = [
    {
        id: 1,
        city: "Manchester",
        strategy: "buy-to-let",
        price: 185000,
        rent: 950,
        renovation: 0,
        flipProfit: 0,
        title: "3 Bed Terrace, Moss Side, Manchester",
        beds: 3,
        baths: 1,
        type: "Terraced",
        estValue: 210000,
        description: "Modern 3 bed terrace close to the city centre."
    },
    {
        id: 2,
        city: "London",
        strategy: "buy-to-flip",
        price: 400000,
        rent: 0,
        renovation: 50000,
        flipProfit: 70000,
        title: "2 Bed Flat, Anfield, London",
        beds: 2,
        baths: 1,
        type: "Flat",
        estValue: 465000,
        description: "Victorian flat with strong uplift potential after renovation."
    },
    {
        id: 3,
        city: "Birmingham",
        strategy: "renovate-sell",
        price: 180000,
        rent: 0,
        renovation: 30000,
        flipProfit: 45000,
        title: "3 Bed Semi-Detached, Birmingham",
        beds: 3,
        baths: 1,
        type: "Semi-Detached",
        estValue: 255000,
        description: "Family semi-detached home with garden."
    },
    {
        id: 4,
        city: "Leeds",
        strategy: "buy-to-let",
        price: 150000,
        rent: 900,
        renovation: 0,
        flipProfit: 0,
        title: "1 Bed Flat near University, Leeds",
        beds: 1,
        baths: 1,
        type: "Flat",
        estValue: 165000,
        description: "High-demand student rental close to the university."
    },
    {
        id: 5,
        city: "Liverpool",
        strategy: "buy-to-let",
        price: 100000,
        rent: 700,
        renovation: 0,
        flipProfit: 0,
        title: "2 Bed Starter Home, Liverpool",
        beds: 2,
        baths: 1,
        type: "Terraced",
        estValue: 120000,
        description: "Affordable starter home in an upcoming area."
    },
    {
        id: 6,
        city: "Manchester",
        strategy: "buy-to-flip",
        price: 250000,
        rent: 0,
        renovation: 40000,
        flipProfit: 60000,
        title: "3 Bed Family House, Outer Manchester",
        beds: 3,
        baths: 2,
        type: "Semi-Detached",
        estValue: 330000,
        description: "Spacious family home in the suburbs."
    },
    {
        id: 7,
        city: "London",
        strategy: "renovate-sell",
        price: 350000,
        rent: 0,
        renovation: 60000,
        flipProfit: 90000,
        title: "2 Bed Flat near Park, London",
        beds: 2,
        baths: 1,
        type: "Flat",
        estValue: 440000,
        description: "Bright flat near a large park; strong resale potential."
    },
    {
        id: 8,
        city: "Birmingham",
        strategy: "buy-to-let",
        price: 120000,
        rent: 800,
        renovation: 0,
        flipProfit: 0,
        title: "2 Bed Flat, Transport Links, Birmingham",
        beds: 2,
        baths: 1,
        type: "Flat",
        estValue: 135000,
        description: "Well-connected flat near transport links."
    }
];


// ======================================================================
// 2. Backend Integration (load deals from API)
// ======================================================================

async function loadBackendDeals() {
    try {
        const response = await fetch("http://localhost:4000/api/deals");
        const data = await response.json();

        const apiDeals = Array.isArray(data.deals) ? data.deals : [];
        const backendProps = apiDeals.map(mapDealToProperty);

        // Merge backend + static demo deals
        properties = [...backendProps, ...properties];

        renderProperties();
    } catch (error) {
        console.error("Error loading backend deals:", error);
        // Fall back to static demo data
        renderProperties();
    }
}


// ======================================================================
// 3. DOM References & Global State
// ======================================================================

// Deals list / cards
const propertyListEl = document.getElementById("property-list");

// Modal & calculator
const modalBackdrop = document.getElementById("calculator-modal");
const closeModalBtn = modalBackdrop.querySelector(".close-btn");
const tabs = modalBackdrop.querySelectorAll(".tab");
const calculatorForm = document.getElementById("calculator-form");
const calculatorResult = document.getElementById("calculator-result");
const calculatorTitle = document.getElementById("calculator-title");
const calculatorSubtitle = document.getElementById("calculator-subtitle");
const dealExternalLink = document.getElementById("deal-external-link");

// Filters & sorting
const filterStrategy = document.getElementById("filter-strategy");
const filterLocation = document.getElementById("filter-location");
const filterMinROI = document.getElementById("filter-min-roi");
const filterMaxPrice = document.getElementById("filter-max-price");
const clearFiltersBtn = document.getElementById("clear-filters");
const sortBy = document.getElementById("sort-by");

// App state
let currentProperty = null;
let currentTab = "buy-to-let";


// ======================================================================
// Utility helpers
// ======================================================================

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}


// ======================================================================
// 4. Filters & Sorting + Property Card Rendering
// ======================================================================

function renderProperties() {
    let filtered = [...properties];

    // Strategy filter
    if (filterStrategy && filterStrategy.value !== "all") {
        filtered = filtered.filter(p => p.strategy === filterStrategy.value);
    }

    // Location filter
    if (filterLocation && filterLocation.value !== "all") {
        filtered = filtered.filter(p => p.city === filterLocation.value);
    }

    // Min ROI filter
    const minROIVal = parseFloat(filterMinROI?.value);
    if (!isNaN(minROIVal)) {
        filtered = filtered.filter(p => calculateROI(p, p.strategy) >= minROIVal);
    }

    // Max price filter
    const maxPriceVal = parseFloat(filterMaxPrice?.value);
    if (!isNaN(maxPriceVal)) {
        filtered = filtered.filter(p => p.price <= maxPriceVal);
    }

    // Sorting
    if (sortBy && sortBy.value !== "none") {
        filtered.sort((a, b) => {
            const roiA = calculateROI(a, a.strategy);
            const roiB = calculateROI(b, b.strategy);
            const scoreA = typeof a.dealScore === "number" ? a.dealScore : -1;
            const scoreB = typeof b.dealScore === "number" ? b.dealScore : -1;
            const priceA = a.price || 0;
            const priceB = b.price || 0;

            switch (sortBy.value) {
                case "score-desc":
                    return scoreB - scoreA;
                case "roi-desc":
                    return roiB - roiA;
                case "price-asc":
                    return priceA - priceB;
                case "price-desc":
                    return priceB - priceA;
                default:
                    return 0;
            }
        });
    }

    // Clear current cards
    propertyListEl.innerHTML = "";

    if (!filtered.length) {
        propertyListEl.innerHTML = "<p>No properties found.</p>";
        return;
    }

    // Render each card
    filtered.forEach(property => {
        const card = document.createElement("div");
        card.className = "property-card";

        const roi = calculateROI(property, property.strategy).toFixed(1);

        // Score → badge text & class
        const score = typeof property.dealScore === "number" ? property.dealScore : null;
        let badgeText = "Demo";
        let badgeClass = "badge-demo";

        if (score !== null) {
            badgeText = `Score: ${score}/100`;

            if (score >= 90) badgeClass = "badge-elite";
            else if (score >= 80) badgeClass = "badge-strong";
            else if (score >= 60) badgeClass = "badge-good";
            else badgeClass = "badge-weak";
        }

        card.innerHTML = `
      <div class="card-top">
        <div class="card-type">
          ${property.city} · ${capitalize(property.strategy.replace(/-/g, " "))}
        </div>
        <div class="card-badge ${badgeClass}">${badgeText}</div>
        <div class="card-top-center-text">
          ${property.title || ""}
        </div>
      </div>

      <div class="card-bottom">
        <div class="price">£${(property.price || 0).toLocaleString()}</div>
        <div class="title">${property.description || ""}</div>

        <div class="meta-row">
          ${property.source ? `<span>Source: ${property.source}</span>` : ""}
          ${property.tags?.length ? `<span>Tags: ${property.tags.join(", ")}</span>` : ""}
        </div>

        <div class="roi-panel">
          <div class="roi-left">
            <div class="roi-label">Best Strategy</div>
            <div class="roi-value">${roi}% ROI</div>
          </div>

          <div class="roi-right">
            <div class="roi-sub">
              <span class="sub-label">Monthly Rent</span>
              <span class="sub-value">£${(property.rent || 0).toLocaleString()}</span>
            </div>
            <div class="roi-sub">
              <span class="sub-label">Est. Value</span>
              <span class="sub-value">
                £${(property.estValue || property.price).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

        card.addEventListener("click", () => openCalculator(property));
        propertyListEl.appendChild(card);
    });
}


// ======================================================================
// 5. Modal & Calculator (open/close, tabs)
// ======================================================================

function openCalculator(property) {
    currentProperty = property;
    currentTab = "buy-to-let";

    if (calculatorTitle) {
        calculatorTitle.textContent =
            property.title || property.city || "Investment Calculator";
    }

    // External link in modal ("View full listing →")
    if (dealExternalLink) {
        if (property.link) {
            dealExternalLink.style.display = "inline-flex";
            dealExternalLink.href = property.link;
        } else {
            dealExternalLink.style.display = "none";
            dealExternalLink.href = "#";
        }
    }

    updateTabs();
    modalBackdrop.classList.add("active");
}

function closeCalculator() {
    modalBackdrop.classList.remove("active");
    currentProperty = null;
}

// Tab clicks
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        currentTab = tab.dataset.tab;
        updateTabs();
    });
});

// Close modal (X button + clicking backdrop)
closeModalBtn.addEventListener("click", closeCalculator);
modalBackdrop.addEventListener("click", event => {
    if (event.target === modalBackdrop) {
        closeCalculator();
    }
});

function updateTabs() {
    // Highlight active tab
    tabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === currentTab);
    });

    // Update subtitle
    if (calculatorSubtitle) {
        calculatorSubtitle.textContent =
            currentTab === "buy-to-let"
                ? "Buy-to-Let Calculator"
                : currentTab === "buy-to-flip"
                    ? "Buy-to-Flip Calculator"
                    : "Renovate & Sell Calculator";
    }

    renderForm();
}


// ======================================================================
// 6. Calculator Form Rendering & Result Calculations
// ======================================================================

function renderForm() {
    if (!currentProperty) return;

    let html = "";

    if (currentTab === "buy-to-let") {
        html = `
      <div class="form-grid">
        <div class="form-group">
          <label for="price">Purchase Price (£)</label>
          <input type="number" id="price" value="${currentProperty.price}" min="0" />
        </div>
        <div class="form-group">
          <label for="deposit">Deposit % (25–40%)</label>
          <input type="number" id="deposit" value="25" min="0" max="100" />
        </div>
        <div class="form-group">
          <label for="rent">Monthly Rent (£)</label>
          <input type="number" id="rent" value="${currentProperty.rent || 0}" min="0" />
        </div>
        <div class="form-group">
          <label for="interest">Interest Rate (%)</label>
          <input type="number" id="interest" value="5.5" min="0" max="100" step="0.1" />
        </div>
        <div class="form-group">
          <label for="fees">Monthly Fees (£)</label>
          <input type="number" id="fees" value="150" min="0" />
        </div>
        <div class="form-group">
          <label for="maintenance">Maintenance (£/year)</label>
          <input type="number" id="maintenance" value="1000" min="0" />
        </div>
      </div>
    `;
    } else if (currentTab === "buy-to-flip") {
        html = `
      <div class="form-grid">
        <div class="form-group">
          <label for="price">Purchase Price (£)</label>
          <input type="number" id="price" value="${currentProperty.price}" min="0" />
        </div>
        <div class="form-group">
          <label for="purchaseCosts">Purchase Costs (£)</label>
          <input type="number" id="purchaseCosts" value="3000" min="0" />
        </div>
        <div class="form-group">
          <label for="holdingCosts">Holding Costs (£/month)</label>
          <input type="number" id="holdingCosts" value="800" min="0" />
        </div>
        <div class="form-group">
          <label for="holdingMonths">Holding Period (months)</label>
          <input type="number" id="holdingMonths" value="6" min="0" />
        </div>
        <div class="form-group">
          <label for="expectedSalePrice">Expected Sale Price (£)</label>
          <input type="number" id="expectedSalePrice" value="${currentProperty.estValue || currentProperty.price}" min="0" />
        </div>
        <div class="form-group">
          <label for="sellingCosts">Selling Costs (£)</label>
          <input type="number" id="sellingCosts" value="2500" min="0" />
        </div>
      </div>
    `;
    } else if (currentTab === "renovate-sell") {
        html = `
      <div class="form-grid">
        <div class="form-group">
          <label for="price">Purchase Price (£)</label>
          <input type="number" id="price" value="${currentProperty.price}" min="0" />
        </div>
        <div class="form-group">
          <label for="renovation">Renovation Costs (£)</label>
          <input type="number" id="renovation" value="${currentProperty.renovation}" min="0" />
        </div>
        <div class="form-group">
          <label for="purchaseCosts">Purchase Costs (£)</label>
          <input type="number" id="purchaseCosts" value="3000" min="0" />
        </div>
        <div class="form-group">
          <label for="holdingCosts">Holding Costs (£/month)</label>
          <input type="number" id="holdingCosts" value="1000" min="0" />
        </div>
        <div class="form-group">
          <label for="projectMonths">Project Duration (months)</label>
          <input type="number" id="projectMonths" value="6" min="0" />
        </div>
        <div class="form-group">
          <label for="arv">ARV - After Repair Value (£)</label>
          <input type="number" id="arv" value="${currentProperty.estValue || currentProperty.price}" min="0" />
        </div>
        <div class="form-group">
          <label for="sellingCosts">Selling Costs (£)</label>
          <input type="number" id="sellingCosts" value="2500" min="0" />
        </div>
      </div>
    `;
    }

    calculatorForm.innerHTML = html;

    // Wire live calculation
    const inputs = calculatorForm.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("input", calculateAndDisplayResult);
    });

    calculateAndDisplayResult();
}

function calculateAndDisplayResult() {
    if (!currentProperty || !calculatorResult) return;

    if (currentTab === "buy-to-let") {
        const price = parseFloat(document.getElementById("price").value) || 0;
        const deposit = parseFloat(document.getElementById("deposit").value) || 0;
        const rent = parseFloat(document.getElementById("rent").value) || 0;
        const interest = parseFloat(document.getElementById("interest").value) || 0;
        const fees = parseFloat(document.getElementById("fees").value) || 0;
        const maintenance = parseFloat(document.getElementById("maintenance").value) || 0;

        const depositAmount = price * (deposit / 100);
        const mortgageAmount = price - depositAmount;
        const annualInterest = mortgageAmount * (interest / 100);
        const monthlyInterest = annualInterest / 12;
        const monthlyNetProfit = rent - monthlyInterest - fees - maintenance / 12;
        const annualNetProfit = monthlyNetProfit * 12;
        const rentalYield = price > 0 ? (rent * 12 / price) * 100 : 0;
        const roi = depositAmount > 0 ? (annualNetProfit / depositAmount) * 100 : 0;

        calculatorResult.innerHTML = `
      <div class="summary-panel">
        <div class="summary-row">
          <span class="summary-label">Deposit Required (${deposit.toFixed(0)}%)</span>
          <span class="summary-value">£${depositAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Monthly Mortgage Interest</span>
          <span class="summary-value">£${monthlyInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Monthly Net Profit</span>
          <span class="summary-value">£${monthlyNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Annual Net Profit</span>
          <span class="summary-value">£${annualNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Rental Yield</span>
          <span class="summary-value">${rentalYield.toFixed(2)}%</span>
        </div>
        <div class="summary-row summary-row-total">
          <span class="summary-label summary-label-strong">Return on Investment (ROI)</span>
          <span class="summary-value summary-value-highlight">${roi.toFixed(1)}%</span>
        </div>
      </div>
    `;
    } else if (currentTab === "buy-to-flip") {
        const price = parseFloat(document.getElementById("price").value) || 0;
        const purchaseCosts = parseFloat(document.getElementById("purchaseCosts").value) || 0;
        const holdingCosts = parseFloat(document.getElementById("holdingCosts").value) || 0;
        const holdingMonths = parseFloat(document.getElementById("holdingMonths").value) || 0;
        const expectedSalePrice = parseFloat(document.getElementById("expectedSalePrice").value) || 0;
        const sellingCosts = parseFloat(document.getElementById("sellingCosts").value) || 0;

        const totalHoldingCosts = holdingCosts * holdingMonths;
        const totalInvestment = price + purchaseCosts + totalHoldingCosts;
        const salePrice = expectedSalePrice;
        const netProfit = salePrice - sellingCosts - totalInvestment;
        const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

        calculatorResult.innerHTML = `
      <div class="summary-panel">
        <div class="summary-row">
          <span class="summary-label">Purchase Price</span>
          <span class="summary-value">£${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">
            Total Holding Costs (${holdingMonths.toFixed(0)} months)
          </span>
          <span class="summary-value">
            £${totalHoldingCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Total Investment</span>
          <span class="summary-value">£${totalInvestment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Sale Price</span>
          <span class="summary-value">£${salePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Net Profit</span>
          <span class="summary-value">£${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row summary-row-total">
          <span class="summary-label summary-label-strong">Return on Investment (ROI)</span>
          <span class="summary-value summary-value-highlight">${roi.toFixed(1)}%</span>
        </div>
      </div>
    `;
    } else if (currentTab === "renovate-sell") {
        const price = parseFloat(document.getElementById("price").value) || 0;
        const renovation = parseFloat(document.getElementById("renovation").value) || 0;
        const purchaseCosts = parseFloat(document.getElementById("purchaseCosts").value) || 0;
        const holdingCosts = parseFloat(document.getElementById("holdingCosts").value) || 0;
        const projectMonths = parseFloat(document.getElementById("projectMonths").value) || 0;
        const arv = parseFloat(document.getElementById("arv").value) || 0;
        const sellingCosts = parseFloat(document.getElementById("sellingCosts").value) || 0;

        const totalHoldingCosts = holdingCosts * projectMonths;
        const totalInvestment = price + renovation + purchaseCosts + totalHoldingCosts;
        const afterRepairValue = arv;
        const netProfit = afterRepairValue - sellingCosts - totalInvestment;
        const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

        calculatorResult.innerHTML = `
      <div class="summary-panel">
        <div class="summary-row">
          <span class="summary-label">Purchase Price</span>
          <span class="summary-value">£${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Renovation Costs</span>
          <span class="summary-value">£${renovation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">
            Total Holding Costs (${projectMonths.toFixed(0)} months)
          </span>
          <span class="summary-value">
            £${totalHoldingCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Total Investment</span>
          <span class="summary-value">£${totalInvestment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">After Repair Value (ARV)</span>
          <span class="summary-value">
            £${afterRepairValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Net Profit</span>
          <span class="summary-value">£${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div class="summary-row summary-row-total">
          <span class="summary-label summary-label-strong">Return on Investment (ROI)</span>
          <span class="summary-value summary-value-highlight">${roi.toFixed(1)}%</span>
        </div>
      </div>
    `;
    }
}


// ======================================================================
// 7. Backend Deal Mapping (API → UI model)
// ======================================================================

function mapDealToProperty(deal) {
    let city = "Unknown";
    const text = ((deal.title || "") + " " + (deal.description || "")).toLowerCase();

    if (text.includes("manchester")) city = "Manchester";
    else if (text.includes("london")) city = "London";
    else if (text.includes("birmingham")) city = "Birmingham";
    else if (text.includes("leeds")) city = "Leeds";
    else if (text.includes("liverpool")) city = "Liverpool";

    const tags = Array.isArray(deal.tags) ? deal.tags : [];

    const strategy =
        tags.includes("renovation") ||
            tags.includes("auction") ||
            tags.includes("belowMarketValue")
            ? "buy-to-flip"
            : "buy-to-let";

    return {
        id: deal.id,
        city,
        strategy,
        price: deal.price || 0,
        rent: 0,            // Could be estimated later
        renovation: 0,      // Could be derived from tags later
        flipProfit: 0,      // Calculated later if needed
        title: deal.title,
        description: deal.description,
        estValue: deal.price,
        dealScore: deal.score,
        tags,
        source: deal.source,
        link: deal.link
    };
}


// ======================================================================
// 8. ROI Helper
// ======================================================================

function calculateROI(property, strategy) {
    if (strategy === "buy-to-let") {
        const annualRent = (property.rent || 0) * 12;
        return property.price ? (annualRent / property.price) * 100 : 0;
    }

    const totalCost = property.price + property.renovation;
    return totalCost ? (property.flipProfit / totalCost) * 100 : 0;
}


// ======================================================================
// 9. Initialisation / Event Wiring
// ======================================================================

// Filter changes
if (filterStrategy) {
    filterStrategy.addEventListener("change", renderProperties);
}

if (filterLocation) {
    filterLocation.addEventListener("change", renderProperties);
}

if (filterMinROI) {
    filterMinROI.addEventListener("input", renderProperties);
}

if (filterMaxPrice) {
    filterMaxPrice.addEventListener("input", renderProperties);
}

// Sort dropdown
if (sortBy) {
    sortBy.addEventListener("change", renderProperties);
}

// Clear filters
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
        if (filterStrategy) filterStrategy.value = "all";
        if (filterLocation) filterLocation.value = "all";
        if (filterMinROI) filterMinROI.value = "";
        if (filterMaxPrice) filterMaxPrice.value = "";
        if (sortBy) sortBy.value = "none";

        renderProperties();
    });
} //

// Start: load backend deals, then render
loadBackendDeals();
