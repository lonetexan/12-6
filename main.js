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

    if (tabId === 'saved') {
      displaySavedApartments();
    }
  }
}

window.showTab = showTab;

function initHomeAutocomplete() {
  const homeInput = document.getElementById('homeCityInput');

  if (!homeInput) {
    console.error("homeCityInput not found");
    return;
  }

  console.log("Initializing home autocomplete...");
  const homeAutocomplete = new google.maps.places.Autocomplete(homeInput, {
    types: ['(cities)'],
    fields: ['geometry', 'name', 'formatted_address']
    // If you want to restrict to a certain country, uncomment below:
    // componentRestrictions: { country: 'us' }
  });

  homeAutocomplete.addListener('place_changed', () => {
    const place = homeAutocomplete.getPlace();
    console.log("Place changed on home input:", place);
    if (!place.geometry || !place.geometry.location) {
      sessionStorage.removeItem('initialCenterLat');
      sessionStorage.removeItem('initialCenterLng');
      alert("Please select a city from the autocomplete suggestions.");
      return;
    }

    // Store selected city coordinates
    sessionStorage.setItem('initialCenterLat', place.geometry.location.lat());
    sessionStorage.setItem('initialCenterLng', place.geometry.location.lng());

    // Automatically navigate to maps tab
    console.log("City selected. Navigating to maps tab...");
    showTab('maps');

    // Recenter the map
    if (typeof recenterMap === 'function') {
      recenterMap(place.geometry.location.lat(), place.geometry.location.lng());
    } else {
      console.error("recenterMap function not defined in map.js");
    }
  });
}

window.searchCity = function() {
  const lat = sessionStorage.getItem('initialCenterLat');
  const lng = sessionStorage.getItem('initialCenterLng');

  if (!lat || !lng) {
    alert("Please select a city from the suggestions before searching.");
    return;
  }

  showTab('maps');

  // Recenter the map
  if (typeof recenterMap === 'function') {
    recenterMap(parseFloat(lat), parseFloat(lng));
  } else {
    console.error("recenterMap function not defined in map.js");
  }
};

window.initMap = (function(originalInitMap) {
  return function() {
    if (typeof originalInitMap === 'function') {
      originalInitMap();
    }
    initHomeAutocomplete();
  };
})(window.initMap || function() {});
