// map.js

let map;
let placesService;
let markers = [];
let infoWindow;
let apartmentsList;

window.initMap = function() {
  let initialLat = parseFloat(sessionStorage.getItem('initialCenterLat')) || 30.2672;
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
    if (!place.geometry || !place.geometry.location) return;
    map.setCenter(place.geometry.location);
    map.setZoom(13);
    runTextSearch();
  });

  map.addListener('idle', () => {
    runTextSearch();
  });

  runTextSearch();
};

function runTextSearch() {
  clearApartmentsList();
  clearMarkers();

  const bounds = map.getBounds();
  if (!bounds) return;

  const request = {
    query: 'apartment OR condo OR student housing',
    bounds: bounds
  };

  // We'll collect all results across all pages
  let allResults = [];

  const callback = (results, status, pagination) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
      allResults = allResults.concat(results);
      if (pagination && pagination.hasNextPage) {
        // Fetch next page
        pagination.nextPage();
      } else {
        // No more pages, now display them
        displayFilteredApartments(allResults);
      }
    } else {
      console.log("No apartments found or status:", status);
      clearApartmentsList();
    }
  };

  placesService.textSearch(request, callback);
}

function displayFilteredApartments(places) {
  const mapBounds = map.getBounds();
  const visibleResults = places.filter(place => {
    return place.geometry && mapBounds && mapBounds.contains(place.geometry.location);
  });

  // Now we have all pages loaded and filtered by bounds, let's get details and display
  visibleResults.forEach((place) => {
    const detailsRequest = {
      placeId: place.place_id,
      fields: [
        'name', 'photos', 'vicinity', 'website', 'geometry', 'place_id'
      ]
    };

    placesService.getDetails(detailsRequest, (details, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && details) {
        addApartmentMarker(details);
        addApartmentToList(details);
      } else {
        // Fallback if getDetails fails
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
    photoHtml = `<img src="${photoUrl}" alt="${details.name}" />`;
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

  // Only show the "Save" button if logged in
  if (window.currentUser) {
    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
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
    loginPrompt.textContent = 'Please log in to save apartments.';
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

// The functions for fetching/saving/removing from Supabase and highlightStars remain the same as previously.
