// main.js

function showTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    activeTab.style.display = 'block';

    // Update nav active state
    const navItems = document.querySelectorAll('nav ul li');
    navItems.forEach(item => item.classList.remove('active'));
    const linkItem = document.querySelector(`nav ul li a[href="#${tabId}"]`)?.parentElement;
    if (linkItem) linkItem.classList.add('active');

    // "Refresh" data when switching tabs:
    if (tabId === 'saved') {
      displaySavedApartments();
    } else if (tabId === 'maps') {
      // If map is ready, re-run initial search to refresh apartment listings
      if (window.map && window.map.getCenter) {
        initialSearch(window.map.getCenter());
      }
    }
  }
}

window.showTab = showTab;

function initHomeAutocomplete() {
  const homeInput = document.getElementById('homeCityInput');
  const homeAutocomplete = new google.maps.places.Autocomplete(homeInput, {});

  homeAutocomplete.addListener('place_changed', () => {
    const place = homeAutocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;
    // Store the location for later use in searchCity
    sessionStorage.setItem('initialCenterLat', place.geometry.location.lat());
    sessionStorage.setItem('initialCenterLng', place.geometry.location.lng());
  });
}

window.searchCity = async function() {
  const lat = sessionStorage.getItem('initialCenterLat');
  const lng = sessionStorage.getItem('initialCenterLng');

  if (!lat || !lng) {
    alert("Please select a location from the suggestions first.");
    return;
  }

  // Go to maps tab
  showTab('maps');
};

// Wrap the original initMap so we can run initHomeAutocomplete after the map initializes
window.initMap = (function(originalInitMap) {
  return function() {
    originalInitMap();
    initHomeAutocomplete();
  };
})(window.initMap || function() {});
