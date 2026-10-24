// 1. Map Initialization (Islamabad & Rawalpindi Coordinates)
const map = L.map("map").setView([33.6844, 73.0479], 12);

// 2. Base Tile Layer (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Layer Group for dynamic marker management
const markersLayer = L.layerGroup().addTo(map);

// Global Variables & DOM Elements
let facilitiesData = [];
const statusPanel = document.getElementById("status-panel");
const statusMessage = document.getElementById("status-message");
const spinner = document.getElementById("loading-spinner");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const infoContent = document.getElementById("info-content");

// 3. Overpass API Endpoint (Twin Cities Bounding Box: [South, West, North, East])
const overpassQuery = `
  [out:json][timeout:25];
  (
    node["amenity"~"hospital|clinic|pharmacy"](33.50,72.90,33.78,73.20);
    way["amenity"~"hospital|clinic|pharmacy"](33.50,72.90,33.78,73.20);
  );
  out center;
`;
const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

// 4. Fetch Spatial Data using JavaScript fetch()
function fetchHealthcareData() {
  showLoading("Fetching healthcare facilities from Overpass API...");

  fetch(overpassUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.elements || data.elements.length === 0) {
        showError("No facilities found for the specified study area.");
        return;
      }

      // Parse JSON elements and store formatted objects
      facilitiesData = data.elements.map((el) => {
        const lat = el.lat || (el.center ? el.center.lat : null);
        const lon = el.lon || (el.center ? el.center.lon : null);
        return {
          id: el.id,
          lat: lat,
          lon: lon,
          name: (el.tags && el.tags.name) ? el.tags.name : "Unnamed Facility",
          type: (el.tags && el.tags.amenity) ? el.tags.amenity.toLowerCase() : "unknown",
          operator: (el.tags && el.tags.operator) ? el.tags.operator : "Not Available",
          healthcare: (el.tags && el.tags.healthcare) ? el.tags.healthcare : "General",
          tags: el.tags || {}
        };
      }).filter((item) => item.lat !== null && item.lon !== null);

      hideStatus();
      renderMarkers(facilitiesData);
    })
    .catch((err) => {
      console.error(err);
      showError("Failed to load spatial data. Please check your network connection.");
    });
}

// 5. Marker Rendering Function with Interactive Popups
function renderMarkers(items) {
  markersLayer.clearLayers();

  items.forEach((facility) => {
    const marker = L.circleMarker([facility.lat, facility.lon], {
      radius: facility.type === "hospital" ? 7 : 5,
      color: getMarkerColor(facility.type),
      fillColor: getMarkerColor(facility.type),
      fillOpacity: 0.8,
      weight: 1.5
    });

    // Leaflet Popup in English
    const popupHtml = `
      <div style="font-size: 13px;">
        <strong style="color: #1a365d;">${facility.name}</strong><br/>
        <b>Category:</b> ${facility.type.toUpperCase()}<br/>
        <b>Operator:</b> ${facility.operator}
      </div>
    `;
    marker.bindPopup(popupHtml);

    // Feature Selection -> Update Sidebar Panel in English
    marker.on("click", () => {
      infoContent.innerHTML = `
        <strong>Name:</strong> ${facility.name}<br/>
        <strong>Category:</strong> ${facility.type.toUpperCase()}<br/>
        <strong>Coordinates:</strong> ${facility.lat.toFixed(5)}, ${facility.lon.toFixed(5)}<br/>
        <strong>Operator:</strong> ${facility.operator}<br/>
        <strong>OSM ID:</strong> ${facility.id}
      `;
    });

    markersLayer.addLayer(marker);
  });
}

// Helper: Color based on amenity category
function getMarkerColor(type) {
  switch (type) {
    case "hospital":
      return "#e53e3e"; // Red
    case "clinic":
      return "#3182ce";   // Blue
    case "pharmacy":
      return "#38a169"; // Green
    default:
      return "#718096";
  }
}

// 6. User Interaction: Filtering and Search Logic
function filterAndSearch() {
  const selectedCategory = categoryFilter.value.toLowerCase();
  const searchKeyword = searchInput.value.toLowerCase().trim();

  const filtered = facilitiesData.filter((item) => {
    const matchesCategory = (selectedCategory === "all") || (item.type === selectedCategory);
    const matchesSearch = item.name.toLowerCase().includes(searchKeyword);
    return matchesCategory && matchesSearch;
  });

  renderMarkers(filtered);
}

// Event Listeners for Controls
categoryFilter.addEventListener("change", filterAndSearch);
searchInput.addEventListener("input", filterAndSearch);

// Helper: Status Management
function showLoading(msg) {
  statusPanel.classList.remove("status-error");
  statusPanel.style.display = "flex";
  spinner.style.display = "block";
  statusMessage.textContent = msg;
}

function showError(msg) {
  statusPanel.classList.add("status-error");
  statusPanel.style.display = "flex";
  spinner.style.display = "none";
  statusMessage.textContent = msg;
}

function hideStatus() {
  statusPanel.style.display = "none";
}

// Execute initial data fetch
fetchHealthcareData();