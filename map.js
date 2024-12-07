// map.js

let map;
let placesService;
let markers = [];
let infoWindow;
let apartmentsList;
let pagination = null;
let lastSearchCenter = null;
let lastZoomLevel = null;

const radiusInMeters = 16000; // about 10 miles

window.initMap = function() {
  console.log("Initializing map...");
  let initialLat = parseFloat(sessionStorage.getItem('initialCenterLat')) || 30.2672; // Default to Austin, TX
  let initialLng = parseFloat(sessionStorage.getItem('initialCenterLng')) || -97.7431;

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: initialLat, lng: initialLng },
    zoom: 13,
    disableDefaultUI: false,
    gestureHandling: "greedy"
  });

  placesService = new google.maps.places.PlacesService(map);
  apartmentsList = document.getElementById('apartmentsList');
  infoWindow = new google.maps.InfoWindow();

  const input = document.getElementById('pac-input');
  const autocompleteOptions = {
    fields: ["geometry", "name"]
  };
  const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);
  autocomplete.bindTo('bounds', map);

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    console.log("Map search place changed:", place);
    if (!place.geometry || !place.geometry.location) return;
    map.setCenter(place.geometry.location);
    map.setZoom(13);
    maybeSearch();
  });

  map.addListener('idle', () => {
    maybeSearch();
  });

  maybeSearch();
};

// Function to recenter map, called from main.js
window.recenterMap = function(lat, lng) {
  if (!map) {
    console.error("Map not initialized yet.");
    return;
  }

  const newCenter = { lat: lat, lng: lng };
  map.setCenter(newCenter);
  map.setZoom(13);
  maybeSearch();
}

function maybeSearch() {
  if (!map) return;

  const currentCenter = map.getCenter();
  const currentZoom = map.getZoom();

  if (currentZoom < 13) {
    clearApartmentsList();
    clearMarkers();
    return;
  }

  if (shouldSearchAgain(currentCenter, currentZoom)) {
    lastSearchCenter = currentCenter;
    lastZoomLevel = currentZoom;
    initialSearch(currentCenter);
  }
}

function shouldSearchAgain(center, zoom) {
  if (!lastSearchCenter || lastZoomLevel === null) return true;
  if (zoom !== lastZoomLevel) return true;

  const latDiff = Math.abs(center.lat() - lastSearchCenter.lat());
  const lngDiff = Math.abs(center.lng() - lastSearchCenter.lng());
  return (latDiff > 0.005 || lngDiff > 0.005);
}

function initialSearch(center) {
  console.log("Searching apartments at center:", center.toString());
  clearApartmentsList();
  clearMarkers();

  const request = {
    location: center,
    radius: radiusInMeters,
    keyword: 'apartment OR condo OR student housing'
  };

  placesService.nearbySearch(request, handleSearchResults);
}

function handleSearchResults(results, status, pag) {
  console.log("Search results:", results, status);
  if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
    displayApartments(results);
    pagination = pag;
    if (pagination && pagination.hasNextPage) {
      setTimeout(() => pagination.nextPage(), 2000);
    }
  } else {
    console.log("No apartments found in this area.");
    clearApartmentsList();
  }
}

function displayApartments(places) {
  places.forEach((place) => {
    const detailsRequest = {
      placeId: place.place_id,
      fields: ['name', 'photos', 'vicinity', 'website', 'geometry', 'place_id']
    };

    placesService.getDetails(detailsRequest, (details, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && details) {
        addApartmentMarker(details);
        addApartmentToList(details);
      } else {
        // Fallback if details request fails
        addApartmentMarker(place);
        addApartmentToList(place);
      }
    });
  });
}

function addApartmentMarker(details) {
  const marker = new google.maps.Marker({
    position: details.geometry.location,
    map: map,
    title: details.name
  });
  markers.push(marker);

  marker.addListener('click', () => {
    let contentString = `
      <div style="color:#000;">
        <h2>${details.name}</h2>
        <p><strong>Address:</strong> ${details.vicinity || 'N/A'}</p>
    `;

    if (details.website) {
      contentString += `<p><a href="${details.website}" target="_blank" rel="noopener">Website</a></p>`;
    }

    if (details.photos && details.photos.length > 0) {
      const photoUrl = details.photos[0].getUrl({ maxWidth: 300 });
      contentString += `
        <div style="margin-top: 10px;">
          <img src="${photoUrl}" alt="Apartment Photo" style="max-width:100%; height:auto; border-radius:5px;">
        </div>
      `;
    }

    contentString += `</div>`;
    infoWindow.setContent(contentString);
    infoWindow.open(map, marker);
  });

  return marker;
}

function showError(message) {
  const errorContainer = document.getElementById('errorMessageContainer');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';

  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 3000);
}

function addApartmentToList(details) {
  const li = document.createElement('li');
  li.className = 'apartment-item';

  let photoHtml = '';
  let photoUrl = '';
  if (details.photos && details.photos.length > 0) {
    photoUrl = details.photos[0].getUrl({ maxWidth: 200 });
    photoHtml = `<img src="${photoUrl}" alt="${details.name}" style="max-width:100%; border-radius:5px;"/>`;
  }

  let websiteHtml = '';
  if (details.website) {
    websiteHtml = `<a href="${details.website}" target="_blank">Visit Website</a><br>`;
  }

  li.innerHTML = `
    <strong>${details.name}</strong><br>
    ${details.vicinity || 'Address not available'}<br>
    ${photoHtml}
    ${websiteHtml}
  `;

  if (window.currentUser) {
    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
    saveBtn.style.marginTop = '5px';
    saveBtn.addEventListener('click', () => {
      saveApartmentToSupabase({
        place_id: details.place_id,
        name: details.name,
        vicinity: details.vicinity,
        website: details.website || '',
        photo: photoUrl,
        rating: 0
      });
    });
    li.appendChild(saveBtn);
  } else {
    const loginPrompt = document.createElement('p');
    loginPrompt.style.color = 'red';
    loginPrompt.textContent = 'Log in to save apartments.';
    li.appendChild(loginPrompt);
  }

  apartmentsList.appendChild(li);
}

function clearApartmentsList() {
  if (apartmentsList) {
    apartmentsList.innerHTML = '';
  }
}

function clearMarkers() {
  for (const marker of markers) {
    marker.setMap(null);
  }
  markers = [];
}
